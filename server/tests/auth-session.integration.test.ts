import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import bcrypt from "bcryptjs";

type PrismaModule = typeof import("../src/config/prisma.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];
let originalExecuteRaw: PrismaModule["prisma"]["$executeRaw"];

let executeRawCallCount = 0;
const testPassword = "Password#123";
let passwordHash = "";

function parseAuthCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) {
    return "";
  }
  return setCookieHeader.split(";")[0];
}

function parseCookieValueFromSetCookie(setCookieHeaders: string[], name: string): string {
  for (const header of setCookieHeaders) {
    const pair = header.split(";")[0] ?? "";
    if (!pair.startsWith(`${name}=`)) {
      continue;
    }

    const value = pair.slice(name.length + 1).trim();
    if (value) {
      return value;
    }
  }

  return "";
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.AUTH_COOKIE_NAME = "tugon.sid";
  process.env.AUTH_COOKIE_SECURE_MODE = "never";
  process.env.AUTH_COOKIE_SAME_SITE = "lax";
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
        id: "session-user-1",
        fullName: "Session Test User",
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

    if (args?.where?.id === "session-user-1") {
      return {
        id: "session-user-1",
        fullName: "Session Test User",
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
    executeRawCallCount += 1;
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

describe("Auth session token hardening integration", () => {
  it("rejects cookie-authenticated logout when CSRF token is missing", async () => {
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

    const setCookies = loginResponse.headers.getSetCookie();
    const authCookie = parseAuthCookie(setCookies.find((value) => value.startsWith("tugon.sid=")) ?? null);
    const csrfCookieValue = parseCookieValueFromSetCookie(setCookies, "tugon.csrf");

    const logoutWithoutCsrfHeader = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `${authCookie}; tugon.csrf=${csrfCookieValue}`,
      },
    });

    const body = (await logoutWithoutCsrfHeader.json()) as { message?: string };
    assert.equal(logoutWithoutCsrfHeader.status, 403);
    assert.equal(body.message, "CSRF validation failed.");
  });

  it("supports cookie-based auth and invalidates session on logout", async () => {
    executeRawCallCount = 0;

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

    const loginBody = (await loginResponse.json()) as { token?: string };
    assert.equal(loginResponse.status, 200);
    assert.equal(typeof loginBody.token, "string");

    const setCookies = loginResponse.headers.getSetCookie();
    const authCookie = parseAuthCookie(setCookies.find((value) => value.startsWith("tugon.sid=")) ?? null);
    const csrfCookieValue = parseCookieValueFromSetCookie(setCookies, "tugon.csrf");
    assert.match(authCookie, /^tugon\.sid=/);
    assert.ok(csrfCookieValue.length > 0);

    const meWithCookie = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Cookie: authCookie,
      },
    });
    assert.equal(meWithCookie.status, 200);

    const logoutWithCookie = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `${authCookie}; tugon.csrf=${csrfCookieValue}`,
        "X-CSRF-Token": csrfCookieValue,
      },
    });
    assert.equal(logoutWithCookie.status, 200);

    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Cookie: authCookie,
      },
    });
    assert.equal(meAfterLogout.status, 401);

    // Session persistence/revocation paths attempt DB writes on login/logout.
    assert.ok(executeRawCallCount >= 2);
  });

  it("keeps bearer compatibility and invalidates token after logout", async () => {
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

    const loginBody = (await loginResponse.json()) as { token?: string };
    const token = loginBody.token ?? "";
    assert.ok(token.length > 0);

    const meBeforeLogout = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(meBeforeLogout.status, 200);

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(logoutResponse.status, 200);

    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(meAfterLogout.status, 401);
  });
});
