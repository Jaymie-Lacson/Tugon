import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { authStore } from "./store.js";
import type {
  AuthPayload,
  AuthSession,
  OtpRecord,
  PublicUser,
  Role,
} from "./types.js";

const ALLOWED_BARANGAYS = new Set(["251", "252", "256"]);

class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function asPublicUser(user: {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  isPhoneVerified: boolean;
  isVerified?: boolean;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED" | null;
  verificationRejectionReason?: string | null;
  idImageUrl?: string | null;
  isBanned?: boolean;
  citizenProfile?: { barangay?: { code: string } | null } | null;
}): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    barangayCode: user.citizenProfile?.barangay?.code,
    isPhoneVerified: user.isPhoneVerified,
    isVerified: Boolean(user.isVerified),
    verificationStatus: user.verificationStatus ?? null,
    verificationRejectionReason: user.verificationRejectionReason ?? null,
    idImageUrl: user.idImageUrl ?? null,
    isBanned: Boolean(user.isBanned),
  };
}

function signToken(user: { id: string; role: Role; phoneNumber: string }) {
  const payload: AuthPayload = {
    sub: user.id,
    role: user.role,
    phoneNumber: user.phoneNumber,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

function generateOtpCode() {
  return String(randomInt(100000, 1_000_000));
}

function assertCitizenRole(role: Role) {
  if (role !== "CITIZEN") {
    throw new AuthError("Only citizen registration is supported in this flow.", 400);
  }
}

function normalizeAndValidatePhone(phoneNumber: string) {
  const normalized = authStore.normalizePhone(phoneNumber);
  if (normalized.length < 10 || normalized.length > 11) {
    throw new AuthError("Invalid phone number.", 400);
  }
  return normalized;
}

function barangayNameFromCode(code: string) {
  return `Barangay ${code}`;
}

function buildOtpDispatchResponse(phoneNumber: string, message: string) {
  return {
    phoneNumber,
    expiresInSeconds: env.otpExpiryMinutes * 60,
    message,
  };
}

function buildLockoutMessage(lockoutUntilMs: number) {
  const remainingSeconds = Math.max(1, Math.ceil((lockoutUntilMs - Date.now()) / 1000));
  return `Too many incorrect OTP attempts. Please try again in ${remainingSeconds} seconds.`;
}

function buildResendCooldownMessage(lastSentAtMs: number) {
  const cooldownMs = env.otpResendCooldownSeconds * 1000;
  const remainingSeconds = Math.max(1, Math.ceil((lastSentAtMs + cooldownMs - Date.now()) / 1000));
  return `Please wait ${remainingSeconds} seconds before requesting a new OTP.`;
}

export const authService = {
  async register(input: {
    fullName: string;
    phoneNumber: string;
    barangayCode: string;
    role?: Role;
  }) {
    const fullName = input.fullName?.trim();
    if (!fullName || fullName.split(" ").length < 2) {
      throw new AuthError("Full name must include first and last name.");
    }

    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    if (!ALLOWED_BARANGAYS.has(input.barangayCode)) {
      throw new AuthError("Barangay must be one of 251, 252, or 256.", 400);
    }

    const role = input.role ?? "CITIZEN";
    assertCitizenRole(role);

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (existingUser) {
      throw new AuthError("Phone number is already registered.", 409);
    }

    const code = generateOtpCode();
    const nowMs = Date.now();
    const otpRecord: OtpRecord = {
      phoneNumber,
      code,
      expiresAtMs: nowMs + env.otpExpiryMinutes * 60 * 1000,
      isVerified: false,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
      lastSentAtMs: nowMs,
      registration: {
        fullName,
        phoneNumber,
        barangayCode: input.barangayCode,
      },
    };

    authStore.saveOtp(otpRecord);

    return buildOtpDispatchResponse(
      phoneNumber,
      env.otpDeliveryMode === "mock"
        ? "OTP generated in mock mode. Continue to OTP verification."
        : "OTP sent successfully.",
    );
  },

  resendOtp(input: { phoneNumber: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const existingOtp = authStore.getOtp(phoneNumber);

    if (!existingOtp || !existingOtp.registration) {
      throw new AuthError("No pending registration found for this number.", 404);
    }

    const nowMs = Date.now();
    const resendCooldownMs = env.otpResendCooldownSeconds * 1000;

    if (resendCooldownMs > 0 && nowMs < existingOtp.lastSentAtMs + resendCooldownMs) {
      throw new AuthError(buildResendCooldownMessage(existingOtp.lastSentAtMs), 429);
    }

    const newCode = generateOtpCode();
    authStore.saveOtp({
      ...existingOtp,
      code: newCode,
      isVerified: false,
      expiresAtMs: nowMs + env.otpExpiryMinutes * 60 * 1000,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
      lastSentAtMs: nowMs,
    });

    return buildOtpDispatchResponse(
      phoneNumber,
      env.otpDeliveryMode === "mock"
        ? "OTP regenerated in mock mode. Continue to OTP verification."
        : "OTP resent successfully.",
    );
  },

  verifyOtp(input: { phoneNumber: string; otpCode: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const otpRecord = authStore.getOtp(phoneNumber);

    if (!otpRecord) {
      throw new AuthError("No OTP found for this number.", 404);
    }

    const nowMs = Date.now();

    if (otpRecord.lockoutUntilMs && nowMs < otpRecord.lockoutUntilMs) {
      throw new AuthError(buildLockoutMessage(otpRecord.lockoutUntilMs), 429);
    }

    if (nowMs > otpRecord.expiresAtMs) {
      throw new AuthError("OTP has expired.", 410);
    }

    if (otpRecord.code !== input.otpCode) {
      const nextAttempts = otpRecord.failedVerifyAttempts + 1;

      if (nextAttempts >= env.otpMaxVerifyAttempts) {
        const lockoutUntilMs = nowMs + env.otpVerifyLockoutMinutes * 60 * 1000;

        authStore.saveOtp({
          ...otpRecord,
          failedVerifyAttempts: 0,
          lockoutUntilMs,
        });

        throw new AuthError(buildLockoutMessage(lockoutUntilMs), 429);
      }

      authStore.saveOtp({
        ...otpRecord,
        failedVerifyAttempts: nextAttempts,
      });

      throw new AuthError("Incorrect OTP.", 401);
    }

    authStore.saveOtp({ ...otpRecord, isVerified: true, failedVerifyAttempts: 0, lockoutUntilMs: null });

    return {
      phoneNumber,
      verified: true,
      message: "OTP verified successfully.",
    };
  },

  async createPassword(input: { phoneNumber: string; password: string }): Promise<AuthSession> {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const otpRecord = authStore.getOtp(phoneNumber);

    if (!otpRecord || !otpRecord.registration) {
      throw new AuthError("No pending registration found.", 404);
    }

    if (!otpRecord.isVerified) {
      throw new AuthError("OTP must be verified first.", 403);
    }

    const password = input.password ?? "";
    if (password.length < 8) {
      throw new AuthError("Password must be at least 8 characters.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (existingUser) {
      throw new AuthError("Phone number is already registered.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const saved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const barangay = await tx.barangay.upsert({
        where: { code: otpRecord.registration!.barangayCode },
        update: {
          name: barangayNameFromCode(otpRecord.registration!.barangayCode),
        },
        create: {
          code: otpRecord.registration!.barangayCode,
          name: barangayNameFromCode(otpRecord.registration!.barangayCode),
        },
      });

      const user = await tx.user.create({
        data: {
          fullName: otpRecord.registration!.fullName,
          phoneNumber,
          role: "CITIZEN",
          isPhoneVerified: true,
          passwordHash,
          citizenProfile: {
            create: {
              barangayId: barangay.id,
            },
          },
        },
        include: {
          citizenProfile: {
            include: {
              barangay: {
                select: { code: true },
              },
            },
          },
        },
      });

      return user;
    });

    const token = signToken(saved);

    return {
      token,
      user: asPublicUser(saved),
    };
  },

  async login(input: { phoneNumber: string; password: string }): Promise<AuthSession> {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        citizenProfile: {
          include: {
            barangay: {
              select: { code: true },
            },
          },
        },
        officialProfile: {
          include: {
            barangay: {
              select: { code: true },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new AuthError("Invalid credentials.", 401);
    }

    if ((user as { isBanned?: boolean }).isBanned) {
      throw new AuthError("This account is restricted. Please contact your barangay office.", 403);
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthError("Invalid credentials.", 401);
    }

    if (user.role === "CITIZEN" && !user.citizenProfile?.barangay?.code) {
      throw new AuthError("Citizen account is missing an assigned barangay profile.", 403);
    }

    if (user.role === "OFFICIAL" && !user.officialProfile?.barangay?.code) {
      throw new AuthError("Official account is missing an assigned barangay profile. Please contact a super admin.", 403);
    }

    const token = signToken(user);
    return {
      token,
      user: asPublicUser(user),
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: {
          include: {
            barangay: {
              select: { code: true },
            },
          },
        },
        officialProfile: {
          include: {
            barangay: {
              select: { code: true },
            },
          },
        },
      },
    });
    if (!user) {
      throw new AuthError("User not found.", 404);
    }

    if ((user as { isBanned?: boolean }).isBanned) {
      throw new AuthError("This account is restricted. Please contact your barangay office.", 403);
    }

    if (user.role === "CITIZEN" && !user.citizenProfile?.barangay?.code) {
      throw new AuthError("Citizen account is missing an assigned barangay profile.", 403);
    }

    if (user.role === "OFFICIAL" && !user.officialProfile?.barangay?.code) {
      throw new AuthError("Official account is missing an assigned barangay profile. Please contact a super admin.", 403);
    }

    return asPublicUser(user);
  },

  logout(token: string) {
    authStore.revokedTokens.add(token);
    return { message: "Logged out successfully." };
  },

  isTokenRevoked(token: string) {
    return authStore.revokedTokens.has(token);
  },

  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  },

  parseAuthError(error: unknown) {
    if (error instanceof AuthError) {
      return { status: error.status, message: error.message };
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
          message: "Database schema is not ready. Run Prisma migrations before authentication.",
        };
      }
    }

    console.error("[AUTH] Unexpected error:", error);
    return { status: 500, message: "Unexpected authentication error." };
  },
};
