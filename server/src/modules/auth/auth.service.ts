import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env, shouldRequirePersistedSession } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { authStore } from "./store.js";
import { OtpSmsDeliveryError, sendOtpSms } from "./otp-sms.service.js";
import type {
  AuthPayload,
  AuthSession,
  OtpRecord,
  OtpPurpose,
  PublicUser,
  Role,
} from "./types.js";

const ALLOWED_BARANGAYS = new Set(["251", "252", "256"]);
let otpChallengePersistenceDisabled = false;

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
  const sessionId = randomUUID();
  const payload: AuthPayload = {
    sub: user.id,
    role: user.role,
    phoneNumber: user.phoneNumber,
    sid: sessionId,
  };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAtMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 8 * 60 * 60 * 1000;

  return {
    token,
    sessionId,
    expiresAtMs,
  };
}

function tokenExpiryMs(token: string) {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return Date.now() + 8 * 60 * 60 * 1000;
  }
  return decoded.exp * 1000;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashOtpCode(phoneNumber: string, purpose: OtpPurpose, otpCode: string) {
  return createHash("sha256")
    .update(`${phoneNumber}|${purpose}|${otpCode}|${env.jwtSecret}`)
    .digest("hex");
}

function hasDatabaseUrlConfigured() {
  return Boolean((process.env.DATABASE_URL || "").trim());
}

function isMissingOtpChallengeTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  return error.code === "P2010" && String(error.meta?.message ?? "").includes("OtpChallenge");
}

async function persistAuthSessionRecord(input: {
  sessionId: string;
  userId: string;
  token: string;
  expiresAtMs: number;
}) {
  if (!hasDatabaseUrlConfigured()) {
    return;
  }

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "AuthSession" (
          "id",
          "sessionId",
          "userId",
          "tokenHash",
          "issuedAt",
          "expiresAt",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${randomUUID()},
          ${input.sessionId},
          ${input.userId},
          ${hashToken(input.token)},
          ${new Date()},
          ${new Date(input.expiresAtMs)},
          ${new Date()},
          ${new Date()}
        )
        ON CONFLICT ("sessionId") DO UPDATE SET
          "tokenHash" = EXCLUDED."tokenHash",
          "expiresAt" = EXCLUDED."expiresAt",
          "revokedAt" = NULL,
          "revokeReason" = NULL,
          "updatedAt" = EXCLUDED."updatedAt"
      `,
    );
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to persist auth session record:", error);
    }
  }
}

async function markSessionRevoked(token: string) {
  if (!hasDatabaseUrlConfigured()) {
    return;
  }

  const decoded = jwt.decode(token) as AuthPayload | null;
  const tokenSha = hashToken(token);

  try {
    if (decoded?.sid) {
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "AuthSession"
          SET "revokedAt" = ${new Date()},
              "revokeReason" = ${"LOGOUT"},
              "updatedAt" = ${new Date()}
          WHERE "sessionId" = ${decoded.sid}
        `,
      );
      return;
    }

    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "AuthSession"
        SET "revokedAt" = ${new Date()},
            "revokeReason" = ${"LOGOUT"},
            "updatedAt" = ${new Date()}
        WHERE "tokenHash" = ${tokenSha}
      `,
    );
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to mark auth session revoked:", error);
    }
  }
}

type DbSessionState = "valid" | "revoked" | "missing" | "unavailable" | "not-applicable";

async function getDbSessionState(payload: AuthPayload): Promise<DbSessionState> {

  if (!hasDatabaseUrlConfigured()) {
    return "not-applicable";
  }

  if (!payload.sid) {
    return "not-applicable";
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ revokedAt: Date | null; expiresAt: Date }>>(
      Prisma.sql`
        SELECT "revokedAt", "expiresAt"
        FROM "AuthSession"
        WHERE "sessionId" = ${payload.sid}
        LIMIT 1
      `,
    );

    const row = rows[0];
    if (!row) {
      return "missing";
    }

    if (row.revokedAt) {
      return "revoked";
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      return "revoked";
    }

    return "valid";
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed DB-backed revocation check:", error);
    }
    return "unavailable";
  }
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

async function dispatchOtpOrFallback(input: { phoneNumber: string; otpCode: string }) {
  try {
    await sendOtpSms(input);
    return {
      fallbackUsed: false,
      providerErrorMessage: null,
    } as const;
  } catch (error) {
    if (error instanceof OtpSmsDeliveryError && env.otpSmsFailoverToMock) {
      console.warn(
        `[OTP-SMS] Provider send failed for ${input.phoneNumber}. Falling back to mock OTP response: ${error.message}`,
      );

      return {
        fallbackUsed: true,
        providerErrorMessage: error.message,
      } as const;
    }

    throw error;
  }
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

type PersistedOtpChallenge = {
  phoneNumber: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAtMs: number;
  isVerified: boolean;
  failedVerifyAttempts: number;
  lockoutUntilMs: number | null;
  lastSentAtMs: number;
  registration?: {
    fullName: string;
    phoneNumber: string;
    barangayCode: string;
  };
};

async function upsertOtpChallenge(otpRecord: OtpRecord) {
  if (!hasDatabaseUrlConfigured() || otpChallengePersistenceDisabled) {
    return;
  }

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "OtpChallenge" (
          "id",
          "phoneNumber",
          "purpose",
          "codeHash",
          "expiresAt",
          "isVerified",
          "failedVerifyAttempts",
          "lockoutUntil",
          "lastSentAt",
          "registrationFullName",
          "registrationBarangayCode",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${randomUUID()},
          ${otpRecord.phoneNumber},
          ${otpRecord.purpose}::"OtpPurpose",
          ${hashOtpCode(otpRecord.phoneNumber, otpRecord.purpose, otpRecord.code)},
          ${new Date(otpRecord.expiresAtMs)},
          ${otpRecord.isVerified},
          ${otpRecord.failedVerifyAttempts},
          ${otpRecord.lockoutUntilMs ? new Date(otpRecord.lockoutUntilMs) : null},
          ${new Date(otpRecord.lastSentAtMs)},
          ${otpRecord.registration?.fullName ?? null},
          ${otpRecord.registration?.barangayCode ?? null},
          ${new Date()},
          ${new Date()}
        )
        ON CONFLICT ("phoneNumber", "purpose") DO UPDATE SET
          "codeHash" = EXCLUDED."codeHash",
          "expiresAt" = EXCLUDED."expiresAt",
          "isVerified" = EXCLUDED."isVerified",
          "failedVerifyAttempts" = EXCLUDED."failedVerifyAttempts",
          "lockoutUntil" = EXCLUDED."lockoutUntil",
          "lastSentAt" = EXCLUDED."lastSentAt",
          "registrationFullName" = EXCLUDED."registrationFullName",
          "registrationBarangayCode" = EXCLUDED."registrationBarangayCode",
          "updatedAt" = EXCLUDED."updatedAt"
      `,
    );
  } catch (error) {
    if (isMissingOtpChallengeTableError(error)) {
      otpChallengePersistenceDisabled = true;
      return;
    }

    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to persist OTP challenge record:", error);
    }
  }
}

async function getOtpChallenge(phoneNumber: string, purpose: OtpPurpose): Promise<PersistedOtpChallenge | null> {
  if (!hasDatabaseUrlConfigured() || otpChallengePersistenceDisabled) {
    return null;
  }

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        phoneNumber: string;
        purpose: OtpPurpose;
        codeHash: string;
        expiresAt: Date;
        isVerified: boolean;
        failedVerifyAttempts: number;
        lockoutUntil: Date | null;
        lastSentAt: Date;
        registrationFullName: string | null;
        registrationBarangayCode: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          "phoneNumber",
          "purpose",
          "codeHash",
          "expiresAt",
          "isVerified",
          "failedVerifyAttempts",
          "lockoutUntil",
          "lastSentAt",
          "registrationFullName",
          "registrationBarangayCode"
        FROM "OtpChallenge"
        WHERE "phoneNumber" = ${phoneNumber}
          AND "purpose" = ${purpose}::"OtpPurpose"
        LIMIT 1
      `,
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      phoneNumber: row.phoneNumber,
      purpose: row.purpose,
      codeHash: row.codeHash,
      expiresAtMs: row.expiresAt.getTime(),
      isVerified: row.isVerified,
      failedVerifyAttempts: row.failedVerifyAttempts,
      lockoutUntilMs: row.lockoutUntil ? row.lockoutUntil.getTime() : null,
      lastSentAtMs: row.lastSentAt.getTime(),
      registration:
        row.registrationFullName && row.registrationBarangayCode
          ? {
              fullName: row.registrationFullName,
              phoneNumber: row.phoneNumber,
              barangayCode: row.registrationBarangayCode,
            }
          : undefined,
    };
  } catch (error) {
    if (isMissingOtpChallengeTableError(error)) {
      otpChallengePersistenceDisabled = true;
      return null;
    }

    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to load OTP challenge record:", error);
    }
    return null;
  }
}

async function deleteOtpChallenge(phoneNumber: string, purpose: OtpPurpose) {
  if (!hasDatabaseUrlConfigured() || otpChallengePersistenceDisabled) {
    return;
  }

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM "OtpChallenge"
        WHERE "phoneNumber" = ${phoneNumber}
          AND "purpose" = ${purpose}::"OtpPurpose"
      `,
    );
  } catch (error) {
    if (isMissingOtpChallengeTableError(error)) {
      otpChallengePersistenceDisabled = true;
      return;
    }

    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to delete OTP challenge record:", error);
    }
  }
}

async function updateOtpChallengeState(input: {
  phoneNumber: string;
  purpose: OtpPurpose;
  isVerified?: boolean;
  failedVerifyAttempts?: number;
  lockoutUntilMs?: number | null;
}) {
  if (!hasDatabaseUrlConfigured() || otpChallengePersistenceDisabled) {
    return;
  }

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "OtpChallenge"
        SET
          "isVerified" = COALESCE(${input.isVerified}, "isVerified"),
          "failedVerifyAttempts" = COALESCE(${input.failedVerifyAttempts}, "failedVerifyAttempts"),
          "lockoutUntil" = ${typeof input.lockoutUntilMs === "undefined"
            ? Prisma.sql`"lockoutUntil"`
            : input.lockoutUntilMs
              ? Prisma.sql`${new Date(input.lockoutUntilMs)}`
              : Prisma.sql`NULL`},
          "updatedAt" = ${new Date()}
        WHERE "phoneNumber" = ${input.phoneNumber}
          AND "purpose" = ${input.purpose}::"OtpPurpose"
      `,
    );
  } catch (error) {
    if (isMissingOtpChallengeTableError(error)) {
      otpChallengePersistenceDisabled = true;
      return;
    }

    if (!(error instanceof Prisma.PrismaClientInitializationError)) {
      console.warn("[AUTH] Failed to update OTP challenge state:", error);
    }
  }
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
      purpose: "REGISTRATION",
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
    await upsertOtpChallenge(otpRecord);

    const dispatchResult = await dispatchOtpOrFallback({
      phoneNumber,
      otpCode: code,
    });

    if (dispatchResult.fallbackUsed) {
      throw new AuthError(
        `SMS delivery failed. Please try requesting OTP again. ${dispatchResult.providerErrorMessage}`,
        502,
      );
    }

    return buildOtpDispatchResponse(
      phoneNumber,
      env.otpDeliveryMode === "mock"
        ? "OTP generated in mock mode. Continue to OTP verification."
        : "OTP sent successfully.",
    );
  },

  async resendOtp(input: { phoneNumber: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const persistedOtp = await getOtpChallenge(phoneNumber, "REGISTRATION");
    const existingOtp = persistedOtp
      ? {
          phoneNumber: persistedOtp.phoneNumber,
          purpose: persistedOtp.purpose,
          code: "",
          expiresAtMs: persistedOtp.expiresAtMs,
          isVerified: persistedOtp.isVerified,
          failedVerifyAttempts: persistedOtp.failedVerifyAttempts,
          lockoutUntilMs: persistedOtp.lockoutUntilMs,
          lastSentAtMs: persistedOtp.lastSentAtMs,
          registration: persistedOtp.registration,
        }
      : authStore.getOtp(phoneNumber, "REGISTRATION");

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
      purpose: "REGISTRATION",
      code: newCode,
      isVerified: false,
      expiresAtMs: nowMs + env.otpExpiryMinutes * 60 * 1000,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
      lastSentAtMs: nowMs,
    });
    await upsertOtpChallenge({
      ...existingOtp,
      purpose: "REGISTRATION",
      phoneNumber,
      code: newCode,
      isVerified: false,
      expiresAtMs: nowMs + env.otpExpiryMinutes * 60 * 1000,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
      lastSentAtMs: nowMs,
    });

    const dispatchResult = await dispatchOtpOrFallback({
      phoneNumber,
      otpCode: newCode,
    });

    if (dispatchResult.fallbackUsed) {
      throw new AuthError(
        `SMS delivery failed. Please try requesting OTP again. ${dispatchResult.providerErrorMessage}`,
        502,
      );
    }

    return buildOtpDispatchResponse(
      phoneNumber,
      env.otpDeliveryMode === "mock"
        ? "OTP regenerated in mock mode. Continue to OTP verification."
        : "OTP resent successfully.",
    );
  },

  async verifyOtp(input: { phoneNumber: string; otpCode: string; purpose?: OtpPurpose }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const purpose = input.purpose ?? "REGISTRATION";
    const persistedOtp = await getOtpChallenge(phoneNumber, purpose);
    const otpRecord = persistedOtp
      ? {
          phoneNumber: persistedOtp.phoneNumber,
          purpose: persistedOtp.purpose,
          code: "",
          expiresAtMs: persistedOtp.expiresAtMs,
          isVerified: persistedOtp.isVerified,
          failedVerifyAttempts: persistedOtp.failedVerifyAttempts,
          lockoutUntilMs: persistedOtp.lockoutUntilMs,
          lastSentAtMs: persistedOtp.lastSentAtMs,
          registration: persistedOtp.registration,
        }
      : authStore.getOtp(phoneNumber, purpose);

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

    const otpMatches = persistedOtp
      ? persistedOtp.codeHash === hashOtpCode(phoneNumber, purpose, input.otpCode)
      : otpRecord.code === input.otpCode;

    if (!otpMatches) {
      const nextAttempts = otpRecord.failedVerifyAttempts + 1;

      if (nextAttempts >= env.otpMaxVerifyAttempts) {
        const lockoutUntilMs = nowMs + env.otpVerifyLockoutMinutes * 60 * 1000;

        const lockedOtp = {
          ...otpRecord,
          purpose,
          failedVerifyAttempts: 0,
          lockoutUntilMs,
        };
        authStore.saveOtp(lockedOtp);
        await updateOtpChallengeState({
          phoneNumber,
          purpose,
          failedVerifyAttempts: 0,
          lockoutUntilMs,
        });

        throw new AuthError(buildLockoutMessage(lockoutUntilMs), 429);
      }

      const failedOtp = {
        ...otpRecord,
        purpose,
        failedVerifyAttempts: nextAttempts,
      };
      authStore.saveOtp(failedOtp);
      await updateOtpChallengeState({
        phoneNumber,
        purpose,
        failedVerifyAttempts: nextAttempts,
      });

      throw new AuthError("Incorrect OTP.", 401);
    }

    const verifiedOtp = {
      ...otpRecord,
      purpose,
      isVerified: true,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
    };
    authStore.saveOtp(verifiedOtp);
    await updateOtpChallengeState({
      phoneNumber,
      purpose,
      isVerified: true,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
    });

    return {
      phoneNumber,
      verified: true,
      message: "OTP verified successfully.",
    };
  },

  async createPassword(input: { phoneNumber: string; password: string }): Promise<AuthSession> {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const persistedOtp = await getOtpChallenge(phoneNumber, "REGISTRATION");
    const otpRecord = persistedOtp
      ? {
          phoneNumber: persistedOtp.phoneNumber,
          purpose: persistedOtp.purpose,
          code: "",
          expiresAtMs: persistedOtp.expiresAtMs,
          isVerified: persistedOtp.isVerified,
          failedVerifyAttempts: persistedOtp.failedVerifyAttempts,
          lockoutUntilMs: persistedOtp.lockoutUntilMs,
          lastSentAtMs: persistedOtp.lastSentAtMs,
          registration: persistedOtp.registration,
        }
      : authStore.getOtp(phoneNumber, "REGISTRATION");

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

    const { token, sessionId, expiresAtMs } = signToken(saved);
    await persistAuthSessionRecord({
      sessionId,
      userId: saved.id,
      token,
      expiresAtMs,
    });

    authStore.deleteOtp(phoneNumber, "REGISTRATION");
    await deleteOtpChallenge(phoneNumber, "REGISTRATION");

    return {
      token,
      user: asPublicUser(saved),
    };
  },

  async requestPasswordResetOtp(input: { phoneNumber: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });

    // Avoid account-enumeration leaks.
    if (!user) {
      return buildOtpDispatchResponse(
        phoneNumber,
        "If the phone number is registered, a password reset OTP has been sent.",
      );
    }

    const existingOtp = (await getOtpChallenge(phoneNumber, "PASSWORD_RESET")) ?? authStore.getOtp(phoneNumber, "PASSWORD_RESET");
    const nowMs = Date.now();
    const resendCooldownMs = env.otpResendCooldownSeconds * 1000;

    if (existingOtp && resendCooldownMs > 0 && nowMs < existingOtp.lastSentAtMs + resendCooldownMs) {
      throw new AuthError(buildResendCooldownMessage(existingOtp.lastSentAtMs), 429);
    }

    const code = generateOtpCode();
    const otpRecord: OtpRecord = {
      phoneNumber,
      purpose: "PASSWORD_RESET",
      code,
      expiresAtMs: nowMs + env.otpExpiryMinutes * 60 * 1000,
      isVerified: false,
      failedVerifyAttempts: 0,
      lockoutUntilMs: null,
      lastSentAtMs: nowMs,
    };

    authStore.saveOtp(otpRecord);
    await upsertOtpChallenge(otpRecord);

    const dispatchResult = await dispatchOtpOrFallback({ phoneNumber, otpCode: code });
    if (dispatchResult.fallbackUsed) {
      throw new AuthError(
        `SMS delivery failed. Please try requesting OTP again. ${dispatchResult.providerErrorMessage}`,
        502,
      );
    }

    return buildOtpDispatchResponse(phoneNumber, "If the phone number is registered, a password reset OTP has been sent.");
  },

  async verifyPasswordResetOtp(input: { phoneNumber: string; otpCode: string }) {
    return this.verifyOtp({
      phoneNumber: input.phoneNumber,
      otpCode: input.otpCode,
      purpose: "PASSWORD_RESET",
    });
  },

  async resetPassword(input: { phoneNumber: string; password: string }): Promise<{ message: string }> {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const persistedOtp = await getOtpChallenge(phoneNumber, "PASSWORD_RESET");
    const otpRecord = persistedOtp
      ? {
          phoneNumber: persistedOtp.phoneNumber,
          purpose: persistedOtp.purpose,
          code: "",
          expiresAtMs: persistedOtp.expiresAtMs,
          isVerified: persistedOtp.isVerified,
          failedVerifyAttempts: persistedOtp.failedVerifyAttempts,
          lockoutUntilMs: persistedOtp.lockoutUntilMs,
          lastSentAtMs: persistedOtp.lastSentAtMs,
          registration: persistedOtp.registration,
        }
      : authStore.getOtp(phoneNumber, "PASSWORD_RESET");

    if (!otpRecord) {
      throw new AuthError("No password reset request found for this number.", 404);
    }

    if (!otpRecord.isVerified) {
      throw new AuthError("OTP must be verified first.", 403);
    }

    if (Date.now() > otpRecord.expiresAtMs) {
      throw new AuthError("OTP has expired.", 410);
    }

    const password = input.password ?? "";
    if (password.length < 8) {
      throw new AuthError("Password must be at least 8 characters.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (!user) {
      throw new AuthError("No account found for this phone number.", 404);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    authStore.deleteOtp(phoneNumber, "PASSWORD_RESET");
    await deleteOtpChallenge(phoneNumber, "PASSWORD_RESET");

    return { message: "Password reset successful. You can now sign in." };
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

    const { token, sessionId, expiresAtMs } = signToken(user);
    await persistAuthSessionRecord({
      sessionId,
      userId: user.id,
      token,
      expiresAtMs,
    });

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

  async logout(token: string) {
    authStore.addRevokedToken(token, tokenExpiryMs(token));
    await markSessionRevoked(token);
    return { message: "Logged out successfully." };
  },

  async isTokenRevoked(token: string, payload: AuthPayload) {
    if (authStore.isTokenRevoked(token)) {
      return true;
    }

    const dbSessionState = await getDbSessionState(payload);
    if (dbSessionState === "revoked") {
      return true;
    }

    if (dbSessionState === "missing" && shouldRequirePersistedSession()) {
      return true;
    }

    return false;
  },

  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  },

  parseAuthError(error: unknown) {
    if (error instanceof AuthError) {
      return { status: error.status, message: error.message };
    }

    if (error instanceof OtpSmsDeliveryError) {
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
    return { status: 500, message: "Unable to process authentication request right now." };
  },
};
