import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type PrismaModule = typeof import("../src/config/prisma.js");
type AppModule = typeof import("../src/app.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";
const ALLOWED_ORIGIN = "http://localhost:5173";
const BLOCKED_ORIGIN = "https://malicious.example";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let createApp: AppModule["createApp"];
let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];

function createCitizenToken() {
  return jwt.sign(
    {
      sub: "test-citizen-id",
      role: "CITIZEN",
      phoneNumber: "09123456789",
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.AUTH_ALLOW_BEARER_TOKENS = "1";

  process.env.CORS_ALLOWED_ORIGINS = ALLOWED_ORIGIN;
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = "2";
  process.env.REPORT_SUBMIT_RATE_LIMIT_WINDOW_MS = "60000";
  process.env.REPORT_SUBMIT_RATE_LIMIT_MAX_REQUESTS = "2";

  const [appModule, prismaConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
  ]);

  createApp = appModule.createApp;

  prismaModule = prismaConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;

  prismaModule.prisma.user.findUnique = (async () => ({
    id: "test-citizen-id",
    fullName: "Test Citizen",
    citizenProfile: {
      barangay: {
        code: "251",
      },
    },
  })) as typeof prismaModule.prisma.user.findUnique;

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

describe("Security middleware integration", () => {
  it("rejects wildcard CORS configuration", () => {
    const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS = "*";

    assert.throws(
      () => createApp(),
      /wildcard '\*' is not allowed/i,
    );

    process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  });

  it("allows configured CORS origin", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: {
        Origin: ALLOWED_ORIGIN,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);
  });

  it("rejects disallowed CORS origin", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: {
        Origin: BLOCKED_ORIGIN,
      },
    });

    const body = (await response.json()) as { message?: string };

    assert.equal(response.status, 403);
    assert.equal(body.message, "Origin not allowed by CORS policy.");
  });

  it("applies helmet security headers", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: {
        Origin: ALLOWED_ORIGIN,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  });

  it("rate limits repeated /api/auth/* requests", async () => {
    const payload = {
      phoneNumber: "09123456789",
    };

    const first = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    const second = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    const third = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(third.status, 429);

    const thirdBody = (await third.json()) as { message?: string };
    assert.equal(thirdBody.message, "Too many authentication requests. Please try again later.");
  });

  it("rate limits repeated report submission attempts", async () => {
    const token = createCitizenToken();
    const payload = {
      category: "Noise",
      subcategory: "Loud music or karaoke",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Barangay 251 Hall",
      description: "Repeated test submission for rate-limiter behavior.",
      severity: "medium",
      affectedCount: "6-20",
      photoCount: 1,
      hasAudio: false,
    };

    const first = await fetch(`${baseUrl}/api/citizen/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    const second = await fetch(`${baseUrl}/api/citizen/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    const third = await fetch(`${baseUrl}/api/citizen/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: ALLOWED_ORIGIN,
      },
      body: JSON.stringify(payload),
    });

    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(third.status, 429);

    const thirdBody = (await third.json()) as { message?: string };
    assert.equal(thirdBody.message, "Too many report submissions. Please try again later.");
  });
});
