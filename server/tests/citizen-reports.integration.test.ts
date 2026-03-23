import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type PrismaModule = typeof import("../src/config/prisma.js");
type GeoModule = typeof import("../src/modules/map/geofencing.service.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let geoModule: GeoModule;

let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];
let originalResolveBarangay: GeoModule["geofencingService"]["resolveBarangayFromCoordinates"];
let originalFindNearbyBarangays: GeoModule["geofencingService"]["findNearbyBarangaysForAlert"];

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

  const payload = (await response.json().catch(() => ({}))) as unknown;
  return { response, payload };
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.EVIDENCE_MAX_PHOTO_BYTES = "32";
  process.env.EVIDENCE_MAX_AUDIO_BYTES = "64";

  const [{ createApp }, prismaConfig, geoConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
    import("../src/modules/map/geofencing.service.js"),
  ]);

  prismaModule = prismaConfig;
  geoModule = geoConfig;

  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalResolveBarangay = geoModule.geofencingService.resolveBarangayFromCoordinates;
  originalFindNearbyBarangays = geoModule.geofencingService.findNearbyBarangaysForAlert;

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
  geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;
  geoModule.geofencingService.findNearbyBarangaysForAlert = originalFindNearbyBarangays;

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

describe("Citizen report POST validation integration", () => {
  it("returns 400 when photo evidence is missing", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    const token = createCitizenToken();

    const { response, payload } = await postJson("/api/citizen/reports", token, {
      category: "Public Disturbance",
      subcategory: "Loud noises or late-night karaoke",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Barangay 251 Hall",
      description: "Loud karaoke continued past midnight and disturbed the neighborhood.",
      severity: "medium",
      affectedCount: "6-20",
      photoCount: 0,
      hasAudio: false,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "At least one photo evidence is required." });
  });

  it("returns 400 when audio is sent for non-noise category", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    const token = createCitizenToken();

    const { response, payload } = await postJson("/api/citizen/reports", token, {
      category: "Hazards and Safety",
      subcategory: "Fire hazards",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Barangay 251 Hall",
      description: "Sparks from exposed wire near stalls are creating a fire risk.",
      severity: "high",
      affectedCount: "21-50",
      photoCount: 1,
      hasAudio: true,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "Voice recording is only allowed for noise-related incidents." });
  });

  it("returns 403 when pinned location belongs to another barangay", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    geoModule.geofencingService.resolveBarangayFromCoordinates = (async () => ({
      id: "brgy-252",
      code: "252",
      name: "Barangay 252",
    })) as typeof geoModule.geofencingService.resolveBarangayFromCoordinates;

    const token = createCitizenToken();

    const { response, payload } = await postJson("/api/citizen/reports", token, {
      category: "Public Disturbance",
      subcategory: "Loud noises or late-night karaoke",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Near boundary area",
      description: "Noise complaint near boundary where jurisdiction could be different.",
      severity: "medium",
      affectedCount: "6-20",
      photoCount: 1,
      hasAudio: false,
    });

    assert.equal(response.status, 403);
    assert.deepEqual(payload, {
      message:
        "Pinned location belongs to Barangay 252. You can only submit incidents within Barangay 251.",
    });

    geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;
  });

  it("returns 400 when photo mime type is not allowed", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    geoModule.geofencingService.resolveBarangayFromCoordinates = (async () => ({
      id: "brgy-251",
      code: "251",
      name: "Barangay 251",
    })) as typeof geoModule.geofencingService.resolveBarangayFromCoordinates;
    geoModule.geofencingService.findNearbyBarangaysForAlert = (async () => []) as typeof geoModule.geofencingService.findNearbyBarangaysForAlert;

    const token = createCitizenToken();

    const { response, payload } = await postJson("/api/citizen/reports", token, {
      category: "Public Disturbance",
      subcategory: "Loud noises or late-night karaoke",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Barangay 251 Hall",
      description: "Attempt with invalid evidence mime type.",
      severity: "medium",
      affectedCount: "6-20",
      photoCount: 1,
      hasAudio: false,
      photos: [
        {
          fileName: "proof.txt",
          mimeType: "text/plain",
          dataUrl: "data:text/plain;base64,SGVsbG8=",
        },
      ],
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "Unsupported photo mime type: text/plain" });

    geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;
    geoModule.geofencingService.findNearbyBarangaysForAlert = originalFindNearbyBarangays;
  });

  it("returns 400 when photo evidence exceeds configured max size", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    geoModule.geofencingService.resolveBarangayFromCoordinates = (async () => ({
      id: "brgy-251",
      code: "251",
      name: "Barangay 251",
    })) as typeof geoModule.geofencingService.resolveBarangayFromCoordinates;
    geoModule.geofencingService.findNearbyBarangaysForAlert = (async () => []) as typeof geoModule.geofencingService.findNearbyBarangaysForAlert;

    const token = createCitizenToken();
    const oversizedPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.alloc(40, 0x01),
    ]).toString("base64");

    const { response, payload } = await postJson("/api/citizen/reports", token, {
      category: "Public Disturbance",
      subcategory: "Loud noises or late-night karaoke",
      requiresMediation: false,
      mediationWarning: null,
      latitude: 14.6145,
      longitude: 120.9778,
      location: "Barangay 251 Hall",
      description: "Attempt with oversized photo evidence.",
      severity: "medium",
      affectedCount: "6-20",
      photoCount: 1,
      hasAudio: false,
      photos: [
        {
          fileName: "oversized.png",
          mimeType: "image/png",
          dataUrl: `data:image/png;base64,${oversizedPng}`,
        },
      ],
    });

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "Photo evidence exceeds maximum allowed size." });

    geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;
    geoModule.geofencingService.findNearbyBarangaysForAlert = originalFindNearbyBarangays;
  });
});
