import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

const ALLOWED_REJECTION_REASONS = new Set([
  "Blurry / unreadable image",
  "Invalid document type",
  "Mismatched resident information",
  "Duplicate / already verified",
  "Suspected fraudulent upload",
]);

export type VerificationDecision = "APPROVE" | "REJECT" | "REQUEST_REUPLOAD" | "BAN_ACCOUNT";
type VerificationStatusValue = "PENDING" | "APPROVED" | "REJECTED";

const VerificationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

class VerificationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeReason(reason: unknown): string {
  if (typeof reason !== "string" || !reason.trim()) {
    throw new VerificationError("A rejection reason is required.", 400);
  }

  const parsed = reason.trim();
  if (!ALLOWED_REJECTION_REASONS.has(parsed)) {
    throw new VerificationError("Invalid rejection reason.", 400);
  }

  return parsed;
}

function normalizeNotes(notes: unknown): string | null {
  if (typeof notes !== "string") {
    return null;
  }
  const parsed = notes.trim();
  return parsed || null;
}

function normalizeDecision(decision: unknown): VerificationDecision {
  if (
    decision === "APPROVE"
    || decision === "REJECT"
    || decision === "REQUEST_REUPLOAD"
    || decision === "BAN_ACCOUNT"
  ) {
    return decision;
  }
  throw new VerificationError("Invalid decision.", 400);
}

async function getOfficialContext(actorUserId: string) {
  const actor = await (prisma.user as any).findUnique({
    where: { id: actorUserId },
    select: {
      id: true,
      role: true,
      fullName: true,
      officialProfile: {
        select: {
          barangay: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!actor) {
    throw new VerificationError("Authenticated user not found.", 401);
  }

  if (actor.role !== Role.OFFICIAL) {
    throw new VerificationError("Only barangay officials can review resident verification.", 403);
  }

  const barangayCode = actor.officialProfile?.barangay?.code;
  if (!barangayCode) {
    throw new VerificationError("Official barangay profile is required.", 403);
  }

  return {
    id: actor.id,
    fullName: actor.fullName,
    barangayCode,
  };
}

function notifyCitizenVerificationUpdate(input: {
  phoneNumber: string;
  fullName: string;
  status: VerificationStatusValue;
  reason: string | null;
}) {
  const suffix = input.reason ? ` Reason: ${input.reason}` : "";
  console.log(`[SMS-MOCK] Verification update to ${input.phoneNumber} (${input.fullName}): ${input.status}.${suffix}`);
}

export const verificationService = {
  async listPending(actorUserId: string) {
    const actor = await getOfficialContext(actorUserId);

    const users = await (prisma.user as any).findMany({
      where: {
        role: Role.CITIZEN,
        isBanned: false,
        citizenProfile: {
          barangay: {
            code: actor.barangayCode,
          },
        },
        OR: [
          {
            verificationStatus: VerificationStatus.PENDING,
          },
          {
            verificationStatus: null,
            isVerified: false,
            idImageUrl: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        idImageUrl: true,
        verificationStatus: true,
        verificationRejectionReason: true,
        createdAt: true,
        updatedAt: true,
        citizenProfile: {
          select: {
            barangay: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      verifications: users.map((user: any) => ({
        citizenUserId: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        idImageUrl: user.idImageUrl,
        verificationStatus: user.verificationStatus ?? VerificationStatus.PENDING,
        rejectionReason: user.verificationRejectionReason,
        barangayCode: user.citizenProfile?.barangay?.code ?? null,
        barangayName: user.citizenProfile?.barangay?.name ?? null,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      })),
    };
  },

  async decide(
    actorUserId: string,
    citizenUserId: string,
    input: {
      decision?: unknown;
      reason?: unknown;
      notes?: unknown;
    },
  ) {
    if (!citizenUserId) {
      throw new VerificationError("Citizen user ID is required.", 400);
    }

    const actor = await getOfficialContext(actorUserId);
    const decision = normalizeDecision(input.decision);
    const notes = normalizeNotes(input.notes);
    const requiresReason =
      decision === "REJECT"
      || decision === "REQUEST_REUPLOAD"
      || decision === "BAN_ACCOUNT";
    const reason = requiresReason ? normalizeReason(input.reason) : null;

    const target = await (prisma.user as any).findUnique({
      where: { id: citizenUserId },
      select: {
        id: true,
        role: true,
        fullName: true,
        phoneNumber: true,
        isBanned: true,
        idImageUrl: true,
        verificationStatus: true,
        citizenProfile: {
          select: {
            barangay: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!target || target.role !== Role.CITIZEN) {
      throw new VerificationError("Citizen account not found.", 404);
    }

    const targetBarangayCode = target.citizenProfile?.barangay?.code;
    if (!targetBarangayCode || targetBarangayCode !== actor.barangayCode) {
      throw new VerificationError("You cannot review residents outside your barangay jurisdiction.", 403);
    }

    if (target.isBanned) {
      throw new VerificationError("This account is already banned.", 409);
    }

    if ((decision === "APPROVE" || decision === "REJECT" || decision === "REQUEST_REUPLOAD") && !target.idImageUrl) {
      throw new VerificationError("No uploaded resident ID found for this account.", 409);
    }

    const now = new Date();
    const verificationStatus = decision === "APPROVE" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
    const clearImage = decision === "REJECT" || decision === "REQUEST_REUPLOAD" || decision === "BAN_ACCOUNT";
    const isBanned = decision === "BAN_ACCOUNT";
    const auditAction = decision === "APPROVE"
      ? "OFFICIAL_VERIFICATION_APPROVED"
      : decision === "REQUEST_REUPLOAD"
      ? "OFFICIAL_VERIFICATION_REUPLOAD_REQUESTED"
      : decision === "BAN_ACCOUNT"
      ? "OFFICIAL_VERIFICATION_BANNED"
      : "OFFICIAL_VERIFICATION_REJECTED";

    const updated = await prisma.$transaction(async (tx) => {
      const user = await (tx.user as any).update({
        where: { id: target.id },
        data: {
          isVerified: decision === "APPROVE",
          verificationStatus,
          verificationRejectionReason: reason,
          verifiedByUserId: actor.id,
          verifiedAt: now,
          ...(clearImage ? { idImageUrl: null } : {}),
          ...(isBanned
            ? {
                isBanned: true,
                bannedAt: now,
                bannedReason: reason,
                bannedByUserId: actor.id,
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          isVerified: true,
          verificationStatus: true,
          verificationRejectionReason: true,
          verifiedAt: true,
          isBanned: true,
          bannedReason: true,
          idImageUrl: true,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: actor.id,
          action: auditAction,
          targetType: "USER_VERIFICATION",
          targetId: user.id,
          targetLabel: user.fullName,
          details: JSON.stringify({
            decision,
            reason,
            notes,
            barangayCode: actor.barangayCode,
          }),
        },
      });

      return user;
    });

    notifyCitizenVerificationUpdate({
      phoneNumber: updated.phoneNumber,
      fullName: updated.fullName,
      status: updated.verificationStatus ?? verificationStatus,
      reason: updated.verificationRejectionReason,
    });

    return {
      message: "Verification decision saved.",
      verification: {
        citizenUserId: updated.id,
        fullName: updated.fullName,
        isVerified: updated.isVerified,
        verificationStatus: updated.verificationStatus,
        rejectionReason: updated.verificationRejectionReason,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
        isBanned: updated.isBanned,
        bannedReason: updated.bannedReason,
        idImageUrl: updated.idImageUrl,
      },
    };
  },

  parseError(error: unknown) {
    if (error instanceof VerificationError) {
      return {
        status: error.status,
        message: error.message,
      };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: 503,
        message: "Database connection failed. Verify DATABASE_URL and database availability.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return {
          status: 503,
          message: "Database schema is not ready. Run Prisma migrations before using verification review.",
        };
      }
    }

    console.error("[VERIFICATION] Unexpected error:", error);
    return { status: 500, message: "Unexpected verification error." };
  },
};
