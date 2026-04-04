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
let originalUserUpdate: PrismaModule["prisma"]["user"]["update"];

let passwordResetUpdates = 0;

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

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.OTP_DELIVERY_MODE = "mock";
  process.env.DATABASE_URL = "";

  const [{ createApp }, prismaConfig, storeConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
    import("../src/modules/auth/store.js"),
  ]);

  prismaModule = prismaConfig;
  authStoreModule = storeConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalUserUpdate = prismaModule.prisma.user.update;

  prismaModule.prisma.user.findUnique = (async (args: unknown) => {
    const where = (args as { where?: { phoneNumber?: string } } | undefined)?.where;
    if (where?.phoneNumber === "09178880001") {
      return {
        id: "forgot-user-1",
      };
    }
    return null;
  }) as typeof prismaModule.prisma.user.findUnique;

  prismaModule.prisma.user.update = (async (_args: unknown) => {
    passwordResetUpdates += 1;
    return {
      id: "forgot-user-1",
    };
  }) as typeof prismaModule.prisma.user.update;

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
  prismaModule.prisma.user.update = originalUserUpdate;
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

describe("Forgot password integration", () => {
  it("handles reset OTP request/verify/reset flow", async () => {
    const phoneNumber = "09178880001";

    const requestOtp = await postJson("/api/auth/forgot-password/request-otp", {
      phoneNumber,
    });

    assert.equal(requestOtp.response.status, 200);
    assert.equal(typeof requestOtp.payload.message, "string");

    const otpRecord = authStoreModule.authStore.getOtp(phoneNumber, "PASSWORD_RESET");
    assert.ok(otpRecord);
    assert.equal(otpRecord?.isVerified, false);

    const verify = await postJson("/api/auth/forgot-password/verify-otp", {
      phoneNumber,
      otpCode: otpRecord?.code,
    });

    assert.equal(verify.response.status, 200);
    assert.equal(verify.payload.verified, true);

    const reset = await postJson("/api/auth/forgot-password/reset", {
      phoneNumber,
      password: "NewStrongPass#123",
    });

    assert.equal(reset.response.status, 200);
    assert.equal(reset.payload.message, "Password reset successful. You can now sign in.");
    assert.equal(passwordResetUpdates, 1);
  });

  it("returns generic success for unknown phone numbers", async () => {
    const requestOtp = await postJson("/api/auth/forgot-password/request-otp", {
      phoneNumber: "09178880002",
    });

    assert.equal(requestOtp.response.status, 200);
    assert.equal(typeof requestOtp.payload.message, "string");

    const otpRecord = authStoreModule.authStore.getOtp("09178880002", "PASSWORD_RESET");
    assert.equal(otpRecord, undefined);
  });
});
