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
let originalCitizenReportFindUnique: PrismaModule["prisma"]["citizenReport"]["findUnique"];

function createOfficialToken() {
  return jwt.sign(
    {
      sub: "official-user-1",
      role: "OFFICIAL",
      phoneNumber: "09179990000",
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

  const [{ createApp }, prismaConfig] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/prisma.js"),
  ]);

  prismaModule = prismaConfig;
  originalUserFindUnique = prismaModule.prisma.user.findUnique;
  originalCitizenReportFindUnique = prismaModule.prisma.citizenReport.findUnique;

  prismaModule.prisma.user.findUnique = (async (args: unknown) => {
    const where = (args as { where?: { id?: string } } | undefined)?.where;
    if (where?.id === "official-user-1") {
      return {
        id: "official-user-1",
        role: "OFFICIAL",
        fullName: "Barangay Official",
        officialProfile: {
          barangay: {
            code: "251",
          },
        },
      };
    }

    return null;
  }) as typeof prismaModule.prisma.user.findUnique;

  prismaModule.prisma.citizenReport.findUnique = (async (args: unknown) => {
    const where = (args as { where?: { id?: string } } | undefined)?.where;
    if (where?.id === "MY-2026-0001") {
      return {
        id: "MY-2026-0001",
        citizenUserId: "citizen-user-1",
        status: "SUBMITTED",
        routedBarangayCode: "251",
      };
    }

    return null;
  }) as typeof prismaModule.prisma.citizenReport.findUnique;

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
  prismaModule.prisma.citizenReport.findUnique = originalCitizenReportFindUnique;

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

describe("Report status workflow guard integration", () => {
  it("rejects non-linear status jump from Submitted to Resolved", async () => {
    const token = createOfficialToken();

    const response = await fetch(`${baseUrl}/api/official/reports/MY-2026-0001/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "Resolved" }),
    });

    const payload = (await response.json()) as { message?: string };

    assert.equal(response.status, 400);
    assert.equal(
      payload.message,
      "Invalid status transition from Submitted to Resolved.",
    );
  });
});
