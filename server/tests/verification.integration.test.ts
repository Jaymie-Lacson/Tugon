import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type VerificationServiceModule = typeof import("../src/modules/verification/verification.service.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let verificationService: VerificationServiceModule["verificationService"];

let originalListPending: VerificationServiceModule["verificationService"]["listPending"];
let originalDecide: VerificationServiceModule["verificationService"]["decide"];
let originalParseError: VerificationServiceModule["verificationService"]["parseError"];

function createToken(role: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN") {
  return jwt.sign(
    {
      sub: `test-${role.toLowerCase()}-id`,
      role,
      phoneNumber: "09123456789",
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );
}

async function getJson(path: string, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const body = (await response.json()) as unknown;
  return { response, body };
}

async function patchJson(path: string, token: string, payload: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as unknown;
  return { response, body };
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";

  const [{ createApp }, verificationModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/verification/verification.service.js"),
  ]);

  verificationService = verificationModule.verificationService;
  originalListPending = verificationService.listPending;
  originalDecide = verificationService.decide;
  originalParseError = verificationService.parseError;

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
  verificationService.listPending = originalListPending;
  verificationService.decide = originalDecide;
  verificationService.parseError = originalParseError;

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

describe("Official verification integration", () => {
  it("rejects unauthenticated access", async () => {
    const { response, body } = await getJson("/api/official/verifications");

    assert.equal(response.status, 401);
    assert.deepEqual(body, { message: "Missing bearer token." });
  });

  it("rejects SUPER_ADMIN access for official-only verification routes", async () => {
    const superAdminToken = createToken("SUPER_ADMIN");

    const { response, body } = await getJson("/api/official/verifications", superAdminToken);

    assert.equal(response.status, 403);
    assert.deepEqual(body, { message: "Forbidden for this role." });
  });

  it("forwards official pending list request", async () => {
    const officialToken = createToken("OFFICIAL");
    let capturedActorId: string | null = null;

    verificationService.listPending = async (actorUserId) => {
      capturedActorId = actorUserId;
      return {
        verifications: [
          {
            citizenUserId: "citizen-1",
            fullName: "Citizen One",
            phoneNumber: "09171234567",
            idImageUrl: "https://example.com/id.jpg",
            verificationStatus: "PENDING",
            rejectionReason: null,
            barangayCode: "251",
            barangayName: "Barangay 251",
            submittedAt: "2026-03-11T01:00:00.000Z",
            createdAt: "2026-03-11T00:30:00.000Z",
          },
        ],
      };
    };

    const { response, body } = await getJson("/api/official/verifications", officialToken);

    assert.equal(response.status, 200);
    assert.equal(capturedActorId, "test-official-id");
    assert.deepEqual(body, {
      verifications: [
        {
          citizenUserId: "citizen-1",
          fullName: "Citizen One",
          phoneNumber: "09171234567",
          idImageUrl: "https://example.com/id.jpg",
          verificationStatus: "PENDING",
          rejectionReason: null,
          barangayCode: "251",
          barangayName: "Barangay 251",
          submittedAt: "2026-03-11T01:00:00.000Z",
          createdAt: "2026-03-11T00:30:00.000Z",
        },
      ],
    });

    verificationService.listPending = originalListPending;
  });

  it("forwards decision payload to service", async () => {
    const officialToken = createToken("OFFICIAL");
    let captured: unknown;

    verificationService.decide = async (actorUserId, citizenUserId, input) => {
      captured = { actorUserId, citizenUserId, input };
      return {
        message: "Verification decision saved.",
        verification: {
          citizenUserId,
          fullName: "Citizen Two",
          isVerified: false,
          verificationStatus: "REJECTED",
          rejectionReason: "Blurry / unreadable image",
          verifiedAt: "2026-03-11T05:00:00.000Z",
          isBanned: false,
          bannedReason: null,
          idImageUrl: null,
        },
      };
    };

    const { response, body } = await patchJson("/api/official/verifications/citizen-2", officialToken, {
      decision: "REJECT",
      reason: "Blurry / unreadable image",
      notes: "Photo was too dark",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(captured, {
      actorUserId: "test-official-id",
      citizenUserId: "citizen-2",
      input: {
        decision: "REJECT",
        reason: "Blurry / unreadable image",
        notes: "Photo was too dark",
      },
    });
    assert.deepEqual(body, {
      message: "Verification decision saved.",
      verification: {
        citizenUserId: "citizen-2",
        fullName: "Citizen Two",
        isVerified: false,
        verificationStatus: "REJECTED",
        rejectionReason: "Blurry / unreadable image",
        verifiedAt: "2026-03-11T05:00:00.000Z",
        isBanned: false,
        bannedReason: null,
        idImageUrl: null,
      },
    });

    verificationService.decide = originalDecide;
  });

  it("maps service errors through parseError", async () => {
    const officialToken = createToken("OFFICIAL");

    verificationService.decide = async () => {
      throw new Error("decision-failure");
    };
    verificationService.parseError = () => ({
      status: 422,
      message: "Verification validation failed.",
    });

    const { response, body } = await patchJson("/api/official/verifications/citizen-3", officialToken, {
      decision: "REJECT",
      reason: "Blurry / unreadable image",
    });

    assert.equal(response.status, 422);
    assert.deepEqual(body, { message: "Verification validation failed." });

    verificationService.decide = originalDecide;
    verificationService.parseError = originalParseError;
  });
});
