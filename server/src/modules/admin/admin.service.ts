import {
  Prisma,
  Role as PrismaRole,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import type { Role } from "../auth/types.js";

const MANAGED_BARANGAYS = ["251", "252", "256"] as const;
const MANAGED_BARANGAY_SET = new Set<string>(MANAGED_BARANGAYS);
const OPEN_REPORT_STATUSES: PrismaTicketStatus[] = [
  PrismaTicketStatus.SUBMITTED,
  PrismaTicketStatus.UNDER_REVIEW,
  PrismaTicketStatus.IN_PROGRESS,
];
const ADMIN_USER_SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  role: true,
  isPhoneVerified: true,
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
  officialProfile: {
    select: {
      barangay: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

class AdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function mapRole(role: PrismaRole): Role {
  return role as Role;
}

function assertRole(role: unknown): Role {
  if (role !== "CITIZEN" && role !== "OFFICIAL" && role !== "SUPER_ADMIN") {
    throw new AdminError("Invalid role. Use CITIZEN, OFFICIAL, or SUPER_ADMIN.", 400);
  }
  return role;
}

function assertManagedBarangayCode(barangayCode: unknown): string {
  if (typeof barangayCode !== "string" || !MANAGED_BARANGAY_SET.has(barangayCode)) {
    throw new AdminError("Barangay code must be one of 251, 252, or 256.", 400);
  }
  return barangayCode;
}

function assertFullName(fullName: unknown): string {
  if (typeof fullName !== "string") {
    throw new AdminError("Full name is required.", 400);
  }

  const parsed = fullName.trim();
  if (!parsed || parsed.split(" ").filter(Boolean).length < 2) {
    throw new AdminError("Full name must include first and last name.", 400);
  }

  return parsed;
}

function normalizeAndValidatePhoneNumber(phoneNumber: unknown): string {
  if (typeof phoneNumber !== "string") {
    throw new AdminError("Phone number is required.", 400);
  }

  const normalized = phoneNumber.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 11) {
    throw new AdminError("Invalid phone number.", 400);
  }

  return normalized;
}

function assertPassword(password: unknown): string {
  if (typeof password !== "string") {
    throw new AdminError("Password is required.", 400);
  }

  if (password.length < 8) {
    throw new AdminError("Password must be at least 8 characters.", 400);
  }

  return password;
}

function validateBoundaryGeojson(input: unknown): string {
  const parsed =
    typeof input === "string"
      ? (() => {
          try {
            return JSON.parse(input) as { type?: string; coordinates?: unknown };
          } catch {
            throw new AdminError("boundaryGeojson must be valid JSON.", 400);
          }
        })()
      : (input as { type?: string; coordinates?: unknown });

  if (!parsed || typeof parsed !== "object") {
    throw new AdminError("boundaryGeojson is required.", 400);
  }

  if (parsed.type !== "Polygon" && parsed.type !== "MultiPolygon") {
    throw new AdminError("Boundary geometry type must be Polygon or MultiPolygon.", 400);
  }

  if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
    throw new AdminError("Boundary coordinates are required.", 400);
  }

  return JSON.stringify(parsed);
}

function mapUserRecord(user: {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: PrismaRole;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  citizenProfile: { barangay: { code: string; name: string } } | null;
  officialProfile: { barangay: { code: string; name: string } } | null;
}) {
  const citizenBarangay = user.citizenProfile?.barangay;
  const officialBarangay = user.officialProfile?.barangay;
  const barangay = officialBarangay ?? citizenBarangay ?? null;

  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: mapRole(user.role),
    isPhoneVerified: user.isPhoneVerified,
    barangayCode: barangay?.code ?? null,
    barangayName: barangay?.name ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const adminService = {
  async listUsers(input: { search?: string; role?: unknown }) {
    const search = typeof input.search === "string" ? input.search.trim() : "";
    const role = input.role ? assertRole(input.role) : undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as PrismaRole } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phoneNumber: { contains: search } },
              ],
            }
          : {}),
      },
      select: ADMIN_USER_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return {
      users: users.map((user) => mapUserRecord(user)),
    };
  },

  async createUser(input: {
    fullName?: unknown;
    phoneNumber?: unknown;
    password?: unknown;
    role?: unknown;
    barangayCode?: unknown;
    isPhoneVerified?: unknown;
  }) {
    const fullName = assertFullName(input.fullName);
    const phoneNumber = normalizeAndValidatePhoneNumber(input.phoneNumber);
    const password = assertPassword(input.password);
    const role = assertRole(input.role);
    const barangayCode = role === "SUPER_ADMIN" ? null : assertManagedBarangayCode(input.barangayCode);

    const isPhoneVerifiedInput = input.isPhoneVerified;
    if (
      typeof isPhoneVerifiedInput !== "undefined" &&
      typeof isPhoneVerifiedInput !== "boolean"
    ) {
      throw new AdminError("isPhoneVerified must be a boolean value.", 400);
    }
    const isPhoneVerified = isPhoneVerifiedInput ?? true;

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (existingUser) {
      throw new AdminError("Phone number is already registered.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let barangayId: string | null = null;
      if (barangayCode) {
        const barangay = await tx.barangay.upsert({
          where: { code: barangayCode },
          update: {
            name: `Barangay ${barangayCode}`,
          },
          create: {
            code: barangayCode,
            name: `Barangay ${barangayCode}`,
          },
          select: { id: true },
        });
        barangayId = barangay.id;
      }

      return tx.user.create({
        data: {
          fullName,
          phoneNumber,
          role: role as PrismaRole,
          passwordHash,
          isPhoneVerified,
          ...(role === "CITIZEN" && barangayId
            ? {
                citizenProfile: {
                  create: {
                    barangayId,
                  },
                },
              }
            : {}),
          ...(role === "OFFICIAL" && barangayId
            ? {
                officialProfile: {
                  create: {
                    barangayId,
                  },
                },
              }
            : {}),
        },
        select: ADMIN_USER_SELECT,
      });
    });

    return {
      message: "User created.",
      user: mapUserRecord(user),
    };
  },

  async updateUserRole(
    actorUserId: string,
    targetUserId: string,
    input: { role?: unknown; barangayCode?: unknown; isPhoneVerified?: unknown },
  ) {
    const targetRole = assertRole(input.role);
    const barangayCode = targetRole === "SUPER_ADMIN" ? null : assertManagedBarangayCode(input.barangayCode);
    const isPhoneVerifiedInput = input.isPhoneVerified;
    if (
      typeof isPhoneVerifiedInput !== "undefined" &&
      typeof isPhoneVerifiedInput !== "boolean"
    ) {
      throw new AdminError("isPhoneVerified must be a boolean value.", 400);
    }
    const isPhoneVerified = isPhoneVerifiedInput ?? true;

    if (actorUserId === targetUserId && targetRole !== "SUPER_ADMIN") {
      throw new AdminError("You cannot remove your own SUPER_ADMIN access.", 400);
    }

    const updatedUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new AdminError("User not found.", 404);
      }

      let barangayId: string | null = null;
      if (barangayCode) {
        const barangay = await tx.barangay.upsert({
          where: { code: barangayCode },
          update: {
            name: `Barangay ${barangayCode}`,
          },
          create: {
            code: barangayCode,
            name: `Barangay ${barangayCode}`,
          },
          select: { id: true },
        });
        barangayId = barangay.id;
      }

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: targetRole as PrismaRole,
          isPhoneVerified,
        },
      });

      if (targetRole === "CITIZEN") {
        await tx.officialProfile.deleteMany({ where: { userId: targetUserId } });
        await tx.citizenProfile.upsert({
          where: { userId: targetUserId },
          update: { barangayId: barangayId! },
          create: { userId: targetUserId, barangayId: barangayId! },
        });
      } else if (targetRole === "OFFICIAL") {
        await tx.citizenProfile.deleteMany({ where: { userId: targetUserId } });
        await tx.officialProfile.upsert({
          where: { userId: targetUserId },
          update: { barangayId: barangayId! },
          create: { userId: targetUserId, barangayId: barangayId! },
        });
      } else {
        await tx.citizenProfile.deleteMany({ where: { userId: targetUserId } });
        await tx.officialProfile.deleteMany({ where: { userId: targetUserId } });
      }

      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: ADMIN_USER_SELECT,
      });

      if (!user) {
        throw new AdminError("Failed to load updated user.", 500);
      }

      return user;
    });

    return {
      message: "User role updated.",
      user: mapUserRecord(updatedUser),
    };
  },

  async listBarangays() {
    await Promise.all(
      MANAGED_BARANGAYS.map((code) =>
        prisma.barangay.upsert({
          where: { code },
          update: {
            name: `Barangay ${code}`,
          },
          create: {
            code,
            name: `Barangay ${code}`,
          },
        }),
      ),
    );

    const [barangays, totalByBarangay, activeByBarangay] = await Promise.all([
      prisma.barangay.findMany({
        where: { code: { in: [...MANAGED_BARANGAYS] } },
        select: {
          id: true,
          code: true,
          name: true,
          boundaryGeojson: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              citizens: true,
              officials: true,
            },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.citizenReport.groupBy({
        by: ["routedBarangayCode"],
        where: { routedBarangayCode: { in: [...MANAGED_BARANGAYS] } },
        _count: { _all: true },
      }),
      prisma.citizenReport.groupBy({
        by: ["routedBarangayCode"],
        where: {
          routedBarangayCode: { in: [...MANAGED_BARANGAYS] },
          status: { in: OPEN_REPORT_STATUSES },
        },
        _count: { _all: true },
      }),
    ]);

    const totalMap = new Map(totalByBarangay.map((entry) => [entry.routedBarangayCode, entry._count._all]));
    const activeMap = new Map(activeByBarangay.map((entry) => [entry.routedBarangayCode, entry._count._all]));

    return {
      barangays: barangays.map((barangay) => ({
        id: barangay.id,
        code: barangay.code,
        name: barangay.name,
        boundaryGeojson: barangay.boundaryGeojson,
        citizenCount: barangay._count.citizens,
        officialCount: barangay._count.officials,
        totalReports: totalMap.get(barangay.code) ?? 0,
        activeReports: activeMap.get(barangay.code) ?? 0,
        createdAt: barangay.createdAt.toISOString(),
        updatedAt: barangay.updatedAt.toISOString(),
      })),
    };
  },

  async updateBarangayBoundary(barangayCodeInput: unknown, boundaryGeojsonInput: unknown) {
    const barangayCode = assertManagedBarangayCode(barangayCodeInput);
    const boundaryGeojson = validateBoundaryGeojson(boundaryGeojsonInput);

    const barangay = await prisma.barangay.upsert({
      where: { code: barangayCode },
      update: {
        name: `Barangay ${barangayCode}`,
        boundaryGeojson,
      },
      create: {
        code: barangayCode,
        name: `Barangay ${barangayCode}`,
        boundaryGeojson,
      },
      select: {
        id: true,
        code: true,
        name: true,
        boundaryGeojson: true,
        updatedAt: true,
      },
    });

    return {
      message: "Barangay boundary updated.",
      barangay: {
        id: barangay.id,
        code: barangay.code,
        name: barangay.name,
        boundaryGeojson: barangay.boundaryGeojson,
        updatedAt: barangay.updatedAt.toISOString(),
      },
    };
  },

  async getAnalyticsSummary() {
    const [
      totalUsers,
      verifiedUsers,
      usersByRole,
      totalReports,
      openReports,
      reportsByStatus,
      reportsByBarangay,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isPhoneVerified: true } }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.citizenReport.count(),
      prisma.citizenReport.count({
        where: {
          status: { in: OPEN_REPORT_STATUSES },
        },
      }),
      prisma.citizenReport.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.citizenReport.groupBy({
        by: ["routedBarangayCode"],
        where: {
          routedBarangayCode: { in: [...MANAGED_BARANGAYS] },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      summary: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        totalReports,
        openReports,
      },
      usersByRole: usersByRole.map((entry) => ({
        role: mapRole(entry.role),
        count: entry._count._all,
      })),
      reportsByStatus: reportsByStatus.map((entry) => ({
        status: entry.status,
        count: entry._count._all,
      })),
      reportsByBarangay: reportsByBarangay.map((entry) => ({
        barangayCode: entry.routedBarangayCode,
        count: entry._count._all,
      })),
    };
  },

  parseError(error: unknown) {
    if (error instanceof AdminError) {
      return { status: error.status, message: error.message };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return { status: 503, message: "Database connection failed." };
    }

    return { status: 500, message: "Unexpected admin service error." };
  },
};
