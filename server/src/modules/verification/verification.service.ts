import { createClient } from "@supabase/supabase-js";
import { Prisma, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";

const ALLOWED_REJECTION_REASONS = new Set([
  "Blurry / unreadable image",
  "Invalid document type",
  "Mismatched resident information",
  "Duplicate / already verified",
  "Suspected fraudulent upload",
]);

const ALLOWED_ID_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type VerificationDecision = "APPROVE" | "REJECT" | "REQUEST_REUPLOAD" | "BAN_ACCOUNT";

type VerificationStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED";

class VerificationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
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
  return parsed.length > 0 ? parsed : null;
}

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new VerificationError("Invalid ID image payload.", 400);
  }

  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new VerificationError("ID image is empty.", 400);
  }

  return { mimeType, bytes };
}

function startsWithBytes(bytes: Buffer, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => bytes[index] === value);
}

function hasHeifFamilySignature(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp";
}

function ensureAllowedIdSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "image/jpeg" && !startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    throw new VerificationError("ID image content does not match declared mime type.", 400);
  }

  if (mimeType === "image/png" && !startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    throw new VerificationError("ID image content does not match declared mime type.", 400);
  }

  if (mimeType === "image/webp") {
    const isRiff = startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]);
    const isWebp = bytes.length >= 12 && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!isRiff || !isWebp) {
      throw new VerificationError("ID image content does not match declared mime type.", 400);
    }
  }

  if ((mimeType === "image/heic" || mimeType === "image/heif") && !hasHeifFamilySignature(bytes)) {
    throw new VerificationError("ID image content does not match declared mime type.", 400);
  }
}

function sanitizeFileName(fileName: string | undefined, fallback: string): string {
  const candidate = (fileName ?? fallback).trim();
  const safe = candidate.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return safe.length > 0 ? safe : fallback;
}

function normalizeIdMimeType(mimeType: string): string {
  if (mimeType === "image/jpg") {
    return "image/jpeg";
  }
  return mimeType;
}

async function uploadCitizenIdImage(input: {
  citizenUserId: string;
  fileName?: string;
  mimeType?: string;
  dataUrl: string;
}): Promise<string> {
  const { mimeType: parsedMimeType, bytes } = parseDataUrl(input.dataUrl);
  const mimeType = normalizeIdMimeType(input.mimeType?.trim() || parsedMimeType);
  if (!ALLOWED_ID_MIME_TYPES.has(mimeType)) {
    throw new VerificationError(`Unsupported ID image format: ${mimeType}`, 400);
  }

  if (bytes.length > env.verificationIdMaxBytes) {
    throw new VerificationError("ID image exceeds maximum allowed size.", 400);
  }

  ensureAllowedIdSignature(mimeType, bytes);

  const shouldFailClosed = env.requireVerificationIdStorageUpload || env.nodeEnv === "production";

  // Storage fallback: keep verification usable even if object storage is not ready.
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    if (shouldFailClosed) {
      throw new VerificationError("ID storage is unavailable. Please try again later.", 503);
    }
    return input.dataUrl;
  }

  const extension = mimeType.split("/")[1] ?? "jpg";
  const fileName = sanitizeFileName(input.fileName, `id-${Date.now()}.${extension}`);
  const storagePath = `${input.citizenUserId}/${Date.now()}-${randomUUID()}-${fileName}`;

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const upload = await supabase.storage
    .from(env.supabaseIdStorageBucket)
    .upload(storagePath, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (upload.error) {
    if (shouldFailClosed) {
      throw new VerificationError("ID upload failed in secure mode. Please try again later.", 503);
    }

    console.warn(`[verification] Storage upload failed; using inline ID fallback. Reason: ${upload.error.message}`);
    return input.dataUrl;
  }

  // Return only the storage path; an authenticated endpoint should later
  // resolve this path to a short-lived signed URL or stream the object
  // with proper role and jurisdiction checks.
  return storagePath;
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
    id: actor.id as string,
    fullName: actor.fullName as string,
    barangayCode: barangayCode as string,
  };
}

function statusFromUser(user: {
  isVerified: boolean;
  verificationStatus: VerificationStatusValue | null;
  idImageUrl: string | null;
}): VerificationStatusValue | null {
  if (user.isVerified) {
    return "APPROVED";
  }

  if (user.verificationStatus) {
    return user.verificationStatus;
  }

  return user.idImageUrl ? "PENDING" : null;
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

async function resolveCitizenIdPreviewUrl(idImageUrl: string | null): Promise<string | null> {
  if (!idImageUrl) {
    return null;
  }

  if (idImageUrl.startsWith("data:image/")) {
    return idImageUrl;
  }

  if (/^https?:\/\//i.test(idImageUrl)) {
    return idImageUrl;
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const signed = await supabase.storage
    .from(env.supabaseIdStorageBucket)
    .createSignedUrl(idImageUrl, 60 * 10);

  if (signed.error) {
    console.warn(`[verification] Failed to sign ID preview URL: ${signed.error.message}`);
    return null;
  }

  return signed.data?.signedUrl ?? null;
}

export const verificationService = {
  async getCitizenStatus(citizenUserId: string) {
    const user = await (prisma.user as any).findUnique({
      where: { id: citizenUserId },
      select: {
        id: true,
        role: true,
        isVerified: true,
        idImageUrl: true,
        verificationStatus: true,
        verificationRejectionReason: true,
        verifiedAt: true,
        isBanned: true,
        bannedReason: true,
      },
    });

    if (!user || user.role !== Role.CITIZEN) {
      throw new VerificationError("Citizen account not found.", 404);
    }

    const storedIdImageUrl = (user.idImageUrl as string | null) ?? null;
    const previewUrl = await resolveCitizenIdPreviewUrl(storedIdImageUrl);

    return {
      verification: {
        isVerified: Boolean(user.isVerified),
        idImageUrl: storedIdImageUrl,
        idImagePreviewUrl: previewUrl,
        verificationStatus: statusFromUser({
          isVerified: Boolean(user.isVerified),
          verificationStatus: (user.verificationStatus as VerificationStatusValue | null) ?? null,
          idImageUrl: storedIdImageUrl,
        }),
        rejectionReason: (user.verificationRejectionReason as string | null) ?? null,
        verifiedAt: user.verifiedAt instanceof Date ? user.verifiedAt.toISOString() : null,
        isBanned: Boolean(user.isBanned),
        bannedReason: (user.bannedReason as string | null) ?? null,
      },
    };
  },

  async submitCitizenId(
    citizenUserId: string,
    input: {
      fileName?: unknown;
      mimeType?: unknown;
      dataUrl?: unknown;
    },
  ) {
    const user = await (prisma.user as any).findUnique({
      where: { id: citizenUserId },
      select: {
        id: true,
        role: true,
        isBanned: true,
        isVerified: true,
        verificationStatus: true,
        idImageUrl: true,
      },
    });

    if (!user || user.role !== Role.CITIZEN) {
      throw new VerificationError("Citizen account not found.", 404);
    }

    if (user.isBanned) {
      throw new VerificationError("This account is restricted and cannot submit verification IDs.", 403);
    }

    const currentStatus = statusFromUser({
      isVerified: Boolean(user.isVerified),
      verificationStatus: (user.verificationStatus as VerificationStatusValue | null) ?? null,
      idImageUrl: (user.idImageUrl as string | null) ?? null,
    });

    const canResubmit = currentStatus === "REJECTED" || currentStatus === "REUPLOAD_REQUESTED";
    const hasPreviousSubmission = currentStatus === "PENDING" || currentStatus === "APPROVED";

    if (hasPreviousSubmission && !canResubmit) {
      throw new VerificationError(
        "ID verification was already submitted. You can upload again only if your submission is rejected.",
        409,
      );
    }

    if (typeof input.dataUrl !== "string" || input.dataUrl.length === 0) {
      throw new VerificationError("ID image payload is required.", 400);
    }

    const publicUrl = await uploadCitizenIdImage({
      citizenUserId,
      fileName: typeof input.fileName === "string" ? input.fileName : undefined,
      mimeType: typeof input.mimeType === "string" ? input.mimeType : undefined,
      dataUrl: input.dataUrl,
    });

    await (prisma.user as any).update({
      where: { id: citizenUserId },
      data: {
        isVerified: false,
        idImageUrl: publicUrl,
        verificationStatus: "PENDING",
        verificationRejectionReason: null,
        verifiedByUserId: null,
        verifiedAt: null,
      },
    });

    return {
      message: "ID uploaded. Your verification is now pending official review.",
      verification: {
        isVerified: false,
        idImageUrl: publicUrl,
        verificationStatus: "PENDING" as const,
      },
    };
  },

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
            verificationStatus: "PENDING",
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
        verificationStatus: user.verificationStatus ?? "PENDING",
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
    let verificationStatus: VerificationStatusValue;
    if (decision === "APPROVE") {
      verificationStatus = "APPROVED";
    } else if (decision === "REQUEST_REUPLOAD") {
      verificationStatus = "REUPLOAD_REQUESTED";
    } else {
      verificationStatus = "REJECTED";
    }
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
      if (error.code === "P2021" || error.code === "P2022") {
        return {
          status: 503,
          message: "Database schema is not ready. Run Prisma migrations before using verification features.",
        };
      }
    }

    console.error("[VERIFICATION] Unexpected error:", error);
    return { status: 500, message: "Unexpected verification error." };
  },
};
