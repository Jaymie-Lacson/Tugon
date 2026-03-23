import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";

type PrismaModule = typeof import("../src/config/prisma.js");
type AuthStoreModule = typeof import("../src/modules/auth/store.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let authStoreModule: AuthStoreModule;
let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];

async function postJson(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { response, payload };
}

function getOtpCodeForPhone(phoneNumber: string) {
  const otpRecord = authStoreModule.authStore.getOtp(phoneNumber);
  if (!otpRecord) {
    throw new Error("OTP record not found in auth store.");
  }
  return otpRecord.code;
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.OTP_DELIVERY_MODE = "mock";
  process.env.OTP_MAX_VERIFY_ATTEMPTS = "3";
  process.env.OTP_VERIFY_LOCKOUT_MINUTES = "1";
  process.env.OTP_RESEND_COOLDOWN_SECONDS = "60";

  const [{ createApp }, prismaConfig, storeConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
    import("../src/modules/auth/store.js"),
  ]);

  prismaModule = prismaConfig;
  authStoreModule = storeConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;

  prismaModule.prisma.user.findUnique = (async () => null) as typeof prismaModule.prisma.user.findUnique;

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server port.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  prismaModule.prisma.user.findUnique = originalUserFindUnique;
  authStoreModule.authStore.otpByPhone.clear();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

describe("Auth OTP security hardening integration", () => {
  it("locks verification after repeated wrong OTP attempts", async () => {
    const phoneNumber = "09170000001";

    const register = await postJson("/api/auth/register", {
      fullName: "Test Citizen",
      phoneNumber,
      barangayCode: "251",
    });

    assert.equal(register.response.status, 201);
    assert.equal("devOtpCode" in register.payload, false);

    const actualCode = getOtpCodeForPhone(phoneNumber);
    const wrongCode = actualCode === "000000" ? "000001" : "000000";

    const firstWrong = await postJson("/api/auth/verify-otp", {
      phoneNumber,
      otpCode: wrongCode,
    });
    const secondWrong = await postJson("/api/auth/verify-otp", {
      phoneNumber,
      otpCode: wrongCode,
    });
    const thirdWrong = await postJson("/api/auth/verify-otp", {
      phoneNumber,
      otpCode: wrongCode,
    });

    assert.equal(firstWrong.response.status, 401);
    assert.equal(secondWrong.response.status, 401);
    assert.equal(thirdWrong.response.status, 429);
    assert.equal(typeof thirdWrong.payload.message, "string");
    assert.match(String(thirdWrong.payload.message), /Too many incorrect OTP attempts\./);
  });

  it("blocks resend when requested before cooldown window", async () => {
    const phoneNumber = "09170000002";

    const register = await postJson("/api/auth/register", {
      fullName: "Test Citizen",
      phoneNumber,
      barangayCode: "252",
    });

    assert.equal(register.response.status, 201);
    assert.equal("devOtpCode" in register.payload, false);

    const resend = await postJson("/api/auth/resend-otp", {
      phoneNumber,
    });

    assert.equal(resend.response.status, 429);
    assert.equal(typeof resend.payload.message, "string");
    assert.match(String(resend.payload.message), /Please wait \d+ seconds before requesting a new OTP\./);
  });

  it("keeps successful OTP verification flow unchanged", async () => {
    const phoneNumber = "09170000003";

    const register = await postJson("/api/auth/register", {
      fullName: "Test Citizen",
      phoneNumber,
      barangayCode: "256",
    });

    assert.equal(register.response.status, 201);
    assert.equal("devOtpCode" in register.payload, false);

    const code = getOtpCodeForPhone(phoneNumber);

    const verify = await postJson("/api/auth/verify-otp", {
      phoneNumber,
      otpCode: code,
    });

    assert.equal(verify.response.status, 200);
    assert.equal(verify.payload.phoneNumber, phoneNumber);
    assert.equal(verify.payload.verified, true);
    assert.equal(verify.payload.message, "OTP verified successfully.");
  });
});
