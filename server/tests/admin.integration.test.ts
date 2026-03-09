import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

type AdminServiceModule = typeof import("../src/modules/admin/admin.service.js");

const TEST_JWT_SECRET = "tugon-test-jwt-secret-12345";

let baseUrl = "";
let server: Server;
let adminService: AdminServiceModule["adminService"];

let originalListAuditLogs: AdminServiceModule["adminService"]["listAuditLogs"];
let originalExportAuditLogs: AdminServiceModule["adminService"]["exportAuditLogs"];
let originalParseError: AdminServiceModule["adminService"]["parseError"];

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

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
  process.env.NODE_ENV = "test";

  const [{ createApp }, adminModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/admin/admin.service.js"),
  ]);

  adminService = adminModule.adminService;
  originalListAuditLogs = adminService.listAuditLogs;
  originalExportAuditLogs = adminService.exportAuditLogs;
  originalParseError = adminService.parseError;

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
  adminService.listAuditLogs = originalListAuditLogs;
  adminService.exportAuditLogs = originalExportAuditLogs;
  adminService.parseError = originalParseError;

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

describe("Admin audit integration", () => {
  it("rejects unauthenticated access to /api/admin/audit-logs", async () => {
    const { response, body } = await getJson("/api/admin/audit-logs");

    assert.equal(response.status, 401);
    assert.deepEqual(body, { message: "Missing bearer token." });
  });

  it("rejects non-super-admin role for /api/admin/audit-logs", async () => {
    const officialToken = createToken("OFFICIAL");

    const { response, body } = await getJson("/api/admin/audit-logs", officialToken);

    assert.equal(response.status, 403);
    assert.deepEqual(body, { message: "Forbidden for this role." });
  });

  it("allows SUPER_ADMIN and forwards parsed filters to listAuditLogs", async () => {
    const superAdminToken = createToken("SUPER_ADMIN");
    let capturedInput: unknown;

    adminService.listAuditLogs = async (input) => {
      capturedInput = input;
      return {
        total: 1,
        limit: 25,
        offset: 50,
        logs: [
          {
            id: "audit-1",
            actorUserId: "actor-1",
            action: "ADMIN_USER_ROLE_UPDATED",
            targetType: "USER",
            targetId: "user-1",
            targetLabel: "User 1",
            details: { role: "OFFICIAL" },
            createdAt: "2026-03-09T10:00:00.000Z",
          },
        ],
      };
    };

    const query =
      "/api/admin/audit-logs?action=ADMIN_USER_ROLE_UPDATED&targetType=USER&limit=25&offset=50&fromDate=2026-03-01T00:00:00.000Z&toDate=2026-03-09T23:59:59.000Z";

    const { response, body } = await getJson(query, superAdminToken);

    assert.equal(response.status, 200);
    assert.deepEqual(capturedInput, {
      action: "ADMIN_USER_ROLE_UPDATED",
      targetType: "USER",
      limit: 25,
      offset: 50,
      fromDate: "2026-03-01T00:00:00.000Z",
      toDate: "2026-03-09T23:59:59.000Z",
    });
    assert.deepEqual(body, {
      total: 1,
      limit: 25,
      offset: 50,
      logs: [
        {
          id: "audit-1",
          actorUserId: "actor-1",
          action: "ADMIN_USER_ROLE_UPDATED",
          targetType: "USER",
          targetId: "user-1",
          targetLabel: "User 1",
          details: { role: "OFFICIAL" },
          createdAt: "2026-03-09T10:00:00.000Z",
        },
      ],
    });

    adminService.listAuditLogs = originalListAuditLogs;
  });

  it("allows SUPER_ADMIN and forwards filters to export endpoint", async () => {
    const superAdminToken = createToken("SUPER_ADMIN");
    let capturedInput: unknown;

    adminService.exportAuditLogs = async (input) => {
      capturedInput = input;
      return {
        total: 2,
        logs: [],
      };
    };

    const query =
      "/api/admin/audit-logs/export?action=ADMIN_BARANGAY_BOUNDARY_UPDATED&targetType=BARANGAY&fromDate=2026-03-01T00:00:00.000Z&toDate=2026-03-09T23:59:59.000Z";

    const { response, body } = await getJson(query, superAdminToken);

    assert.equal(response.status, 200);
    assert.deepEqual(capturedInput, {
      action: "ADMIN_BARANGAY_BOUNDARY_UPDATED",
      targetType: "BARANGAY",
      fromDate: "2026-03-01T00:00:00.000Z",
      toDate: "2026-03-09T23:59:59.000Z",
    });
    assert.deepEqual(body, {
      total: 2,
      logs: [],
    });

    adminService.exportAuditLogs = originalExportAuditLogs;
  });

  it("maps service errors with parseError for /api/admin/audit-logs", async () => {
    const superAdminToken = createToken("SUPER_ADMIN");

    adminService.listAuditLogs = async () => {
      throw new Error("service-failure");
    };
    adminService.parseError = () => ({
      status: 418,
      message: "Audit lookup failed.",
    });

    const { response, body } = await getJson("/api/admin/audit-logs", superAdminToken);

    assert.equal(response.status, 418);
    assert.deepEqual(body, { message: "Audit lookup failed." });

    adminService.listAuditLogs = originalListAuditLogs;
    adminService.parseError = originalParseError;
  });
});
