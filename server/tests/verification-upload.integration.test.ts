import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type PrismaModule = typeof import("../src/config/prisma.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];
let originalUserUpdate: PrismaModule["prisma"]["user"]["update"];

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

async function postJson(path: string, token: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  process.env.AUTH_ALLOW_BEARER_TOKENS = "1";
  process.env.VERIFICATION_ID_MAX_BYTES = "32";
  process.env.REQUIRE_VERIFICATION_ID_STORAGE_UPLOAD = "0";
  process.env.IMAGEKIT_PUBLIC_KEY = "";
  process.env.IMAGEKIT_PRIVATE_KEY = "";
  process.env.IMAGEKIT_URL_ENDPOINT = "";

  const [{ createApp }, prismaConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
  ]);

  prismaModule = prismaConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalUserUpdate = prismaModule.prisma.user.update;

  prismaModule.prisma.user.findUnique = (async () => ({
    id: "test-citizen-id",
    role: "CITIZEN",
    isBanned: false,
    isVerified: false,
    verificationStatus: null,
    idImageUrl: null,
  })) as unknown as typeof prismaModule.prisma.user.findUnique;

  prismaModule.prisma.user.update = (async () => ({
    id: "test-citizen-id",
    isVerified: false,
    idImageUrl: "data:image/png;base64,iVBORw0KGgo=",
    verificationStatus: "PENDING",
    verificationRejectionReason: null,
    verifiedByUserId: null,
    verifiedAt: null,
  })) as unknown as typeof prismaModule.prisma.user.update;

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

describe("Verification upload hardening integration", () => {
  it("returns 400 when ID mime type is not allowed", async () => {
    const token = createCitizenToken();

    const { response, payload } = await postJson("/api/citizen/verification-id", token, {
      fileName: "resident-id.txt",
      mimeType: "text/plain",
      dataUrl: "data:text/plain;base64,SGVsbG8=",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "Unsupported ID image format: text/plain" });
  });

  it("returns 400 when ID image exceeds max configured size", async () => {
    const token = createCitizenToken();
    const oversizedPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.alloc(40, 0x01),
    ]).toString("base64");

    const { response, payload } = await postJson("/api/citizen/verification-id", token, {
      fileName: "resident-id.png",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${oversizedPng}`,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "ID image exceeds maximum allowed size." });
  });

  it("keeps fallback behavior in non-fail-closed mode when storage config is unavailable", async () => {
    const token = createCitizenToken();
    const validSmallPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.alloc(8, 0x01),
    ]).toString("base64");

    prismaModule.prisma.user.update = (async (args: unknown) => ({
      id: "test-citizen-id",
      isVerified: false,
      idImageUrl: (args as { data?: { idImageUrl?: string | null } } | undefined)?.data?.idImageUrl ?? null,
      verificationStatus: "PENDING",
      verificationRejectionReason: null,
      verifiedByUserId: null,
      verifiedAt: null,
    })) as unknown as typeof prismaModule.prisma.user.update;

    const { response, payload } = await postJson("/api/citizen/verification-id", token, {
      fileName: "resident-id.png",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${validSmallPng}`,
    });

    assert.equal(response.status, 200);
    const verification = payload.verification as Record<string, unknown>;
    assert.equal(typeof verification.idImageUrl, "string");
    assert.match(String(verification.idImageUrl), /^data:image\/png;base64,/);
  });
});
