import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
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
  citizenProfile?: { barangay?: { code: string } | null } | null;
}): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    barangayCode: user.citizenProfile?.barangay?.code,
    isPhoneVerified: user.isPhoneVerified,
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
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const otpRecord: OtpRecord = {
      phoneNumber,
      code,
      expiresAtMs: Date.now() + env.otpExpiryMinutes * 60 * 1000,
      isVerified: false,
      registration: {
        fullName,
        phoneNumber,
        barangayCode: input.barangayCode,
      },
    };

    authStore.saveOtp(otpRecord);

    // OTP provider integration point for future SMS sending.
    console.log(`[OTP] ${phoneNumber} => ${code}`);

    return {
      phoneNumber,
      expiresInSeconds: env.otpExpiryMinutes * 60,
      message: "OTP sent successfully.",
    };
  },

  resendOtp(input: { phoneNumber: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const existingOtp = authStore.getOtp(phoneNumber);

    if (!existingOtp || !existingOtp.registration) {
      throw new AuthError("No pending registration found for this number.", 404);
    }

    const newCode = generateOtpCode();
    authStore.saveOtp({
      ...existingOtp,
      code: newCode,
      isVerified: false,
      expiresAtMs: Date.now() + env.otpExpiryMinutes * 60 * 1000,
    });

    console.log(`[OTP-RESEND] ${phoneNumber} => ${newCode}`);

    return {
      phoneNumber,
      expiresInSeconds: env.otpExpiryMinutes * 60,
      message: "OTP resent successfully.",
    };
  },

  verifyOtp(input: { phoneNumber: string; otpCode: string }) {
    const phoneNumber = normalizeAndValidatePhone(input.phoneNumber);
    const otpRecord = authStore.getOtp(phoneNumber);

    if (!otpRecord) {
      throw new AuthError("No OTP found for this number.", 404);
    }

    if (Date.now() > otpRecord.expiresAtMs) {
      throw new AuthError("OTP has expired.", 410);
    }

    if (otpRecord.code !== input.otpCode) {
      throw new AuthError("Incorrect OTP.", 401);
    }

    authStore.saveOtp({ ...otpRecord, isVerified: true });

    return {
      phoneNumber,
      verified: true,
      message: "OTP verified successfully.",
    };
  },

  async createPassword(input: { phoneNumber: string; password: string }) {
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

    return {
      message: "Password created successfully.",
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
      },
    });

    if (!user || !user.passwordHash) {
      throw new AuthError("Invalid credentials.", 401);
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthError("Invalid credentials.", 401);
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
      },
    });
    if (!user) {
      throw new AuthError("User not found.", 404);
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
    return { status: 500, message: "Unexpected authentication error." };
  },
};
