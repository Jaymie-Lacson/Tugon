import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

type PrismaModule = typeof import("../src/config/prisma.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];
let originalExecuteRaw: PrismaModule["prisma"]["$executeRaw"];

const testPassword = "Password#123";
let passwordHash = "";

function parseAuthCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) {
    return "";
  }
  return setCookieHeader.split(";")[0];
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "production";
  process.env.AUTH_COOKIE_NAME = "tugon.sid";
  process.env.AUTH_COOKIE_SECURE_MODE = "never";
  process.env.AUTH_COOKIE_SAME_SITE = "lax";

  // Intentionally set permissive values; production env config must still force hardening.
  process.env.AUTH_RETURN_TOKEN_IN_BODY = "1";
  process.env.AUTH_ALLOW_BEARER_TOKENS = "1";

  passwordHash = await bcrypt.hash(testPassword, 10);

  const [{ createApp }, prismaConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
  ]);

  prismaModule = prismaConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalExecuteRaw = prismaModule.prisma.$executeRaw;

  prismaModule.prisma.user.findUnique = (async (args: any) => {
    if (args?.where?.phoneNumber === "09179990000") {
      return {
        id: "prod-user-1",
        fullName: "Production Test User",
        phoneNumber: "09179990000",
        role: "CITIZEN",
        passwordHash,
        isPhoneVerified: true,
        isVerified: false,
        verificationStatus: null,
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
        citizenProfile: {
          barangay: {
            code: "251",
          },
        },
      };
    }

    if (args?.where?.id === "prod-user-1") {
      return {
        id: "prod-user-1",
        fullName: "Production Test User",
        phoneNumber: "09179990000",
        role: "CITIZEN",
        passwordHash,
        isPhoneVerified: true,
        isVerified: false,
        verificationStatus: null,
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
        citizenProfile: {
          barangay: {
            code: "251",
          },
        },
      };
    }

    return null;
  }) as typeof prismaModule.prisma.user.findUnique;

  prismaModule.prisma.$executeRaw = (async (...args: any[]) => {
    void args;
    return 1;
  }) as typeof prismaModule.prisma.$executeRaw;

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
  prismaModule.prisma.$executeRaw = originalExecuteRaw;

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

describe("Production auth hardening integration", () => {
  it("does not return token in auth response body in production", async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: "09179990000",
        password: testPassword,
      }),
    });

    const body = (await loginResponse.json()) as { token?: string; user?: { id?: string } };
    assert.equal(loginResponse.status, 200);
    assert.equal(typeof body.token, "undefined");
    assert.equal(body.user?.id, "prod-user-1");

    const setCookies = loginResponse.headers.getSetCookie();
    const authCookie = parseAuthCookie(setCookies.find((value) => value.startsWith("tugon.sid=")) ?? null);
    assert.match(authCookie, /^tugon\.sid=/);
  });

  it("rejects bearer auth in production even when env enables it", async () => {
    const bearerToken = jwt.sign(
      {
        sub: "prod-user-1",
        role: "CITIZEN",
        phoneNumber: "09179990000",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    const meWithBearer = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    const body = (await meWithBearer.json()) as { message?: string };
    assert.equal(meWithBearer.status, 401);
    assert.equal(body.message, "Bearer authorization is disabled for this deployment.");
  });
});
