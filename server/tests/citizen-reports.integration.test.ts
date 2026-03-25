import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type PrismaModule = typeof import("../src/config/prisma.js");
type GeoModule = typeof import("../src/modules/map/geofencing.service.js");
type BoundaryModule = typeof import("../src/modules/map/defaultBarangayBoundaries.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let prismaModule: PrismaModule;
let geoModule: GeoModule;
let boundaryModule: BoundaryModule;

let originalUserFindUnique: PrismaModule["prisma"]["user"]["findUnique"];
let originalBarangayFindMany: PrismaModule["prisma"]["barangay"]["findMany"];
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

async function postMultipart(path: string, token: string, formData: FormData) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;
  return { response, payload };
}

async function getJson(path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;
  return { response, payload };
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";
  process.env.AUTH_ALLOW_BEARER_TOKENS = "1";
  process.env.EVIDENCE_MAX_PHOTO_BYTES = "32";
  process.env.EVIDENCE_MAX_AUDIO_BYTES = "64";

  const [{ createApp }, prismaConfig, geoConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
    import("../src/modules/map/geofencing.service.js"),
  ]);
  boundaryModule = await import("../src/modules/map/defaultBarangayBoundaries.js");

  prismaModule = prismaConfig;
  geoModule = geoConfig;

  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalBarangayFindMany = prismaModule.prisma.barangay.findMany;
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
  prismaModule.prisma.barangay.findMany = originalBarangayFindMany;
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
      category: "Noise",
      subcategory: "Loud music or karaoke",
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
      category: "Fire",
      subcategory: "Structural fire",
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

  it("allows cross-barangay pin and classifies it as cross-barangay", async () => {
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

    const { response, payload } = await getJson(
      "/api/citizen/reports/geofence-check?latitude=14.6145&longitude=120.9778",
      token,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(payload, {
      isAllowed: true,
      isCrossBarangay: true,
      routedBarangayCode: "252",
      citizenBarangayCode: "251",
      message:
        "Pinned location belongs to Barangay 252. Your report will be accepted and classified as a cross-barangay incident.",
    });

    geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;
  });

  it("classifies known overlap coordinate to Barangay 256 using canonical boundaries", async () => {
    prismaModule.prisma.user.findUnique = (async () => ({
      id: "test-citizen-id",
      fullName: "Test Citizen",
      citizenProfile: {
        barangay: {
          code: "251",
        },
      },
    })) as typeof prismaModule.prisma.user.findUnique;

    const boundaryRows = boundaryModule.defaultBarangayBoundaries.map((boundary) => ({
      id: `brgy-${boundary.code}`,
      code: boundary.code,
      name: boundary.name,
      boundaryGeojson: boundary.boundaryGeojson,
    }));

    prismaModule.prisma.barangay.findMany = (async () => boundaryRows) as typeof prismaModule.prisma.barangay.findMany;
    geoModule.geofencingService.resolveBarangayFromCoordinates = originalResolveBarangay;

    const token = createCitizenToken();

    const { response, payload } = await getJson(
      "/api/citizen/reports/geofence-check?latitude=14.61594&longitude=120.978492",
      token,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(payload, {
      isAllowed: true,
      isCrossBarangay: true,
      routedBarangayCode: "256",
      citizenBarangayCode: "251",
      message:
        "Pinned location belongs to Barangay 256. Your report will be accepted and classified as a cross-barangay incident.",
    });

    prismaModule.prisma.barangay.findMany = originalBarangayFindMany;
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
      category: "Noise",
      subcategory: "Loud music or karaoke",
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
      category: "Noise",
      subcategory: "Loud music or karaoke",
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

  it("returns 400 when multipart evidence exceeds upload middleware file limit", async () => {
    const token = createCitizenToken();
    const formData = new FormData();

    formData.append("category", "Noise");
    formData.append("subcategory", "Loud music or karaoke");
    formData.append("requiresMediation", "false");
    formData.append("latitude", "14.6145");
    formData.append("longitude", "120.9778");
    formData.append("location", "Barangay 251 Hall");
    formData.append("description", "Large multipart payload should be rejected early.");
    formData.append("severity", "medium");
    formData.append("affectedCount", "6-20");
    formData.append("photoCount", "1");
    formData.append("hasAudio", "false");

    const oversizedPhoto = new Blob([Buffer.alloc(128, 0x01)], { type: "image/png" });
    formData.append("photos", oversizedPhoto, "oversized.png");

    const { response, payload } = await postMultipart("/api/citizen/reports", token, formData);

    assert.equal(response.status, 400);
    assert.deepEqual(payload, { message: "Evidence file exceeds maximum allowed size." });
  });
});
