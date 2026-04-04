import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";

type ReportsServiceModule = typeof import("../src/modules/reports/reports.service.js");

let reportsService: ReportsServiceModule["reportsService"];

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "tugon-test-jwt-secret-12345";
  process.env.NODE_ENV = "test";

  const module = await import("../src/modules/reports/reports.service.js");
  reportsService = module.reportsService;
});

describe("Reports service error sanitization", () => {
  it("returns service unavailable for schema-mismatch P2010 errors without leaking internals", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Raw query failed.",
      {
        code: "P2010",
        clientVersion: "test-client",
        meta: {
          message: "relation IncidentEvidence does not exist",
        },
      },
    );

    const parsed = reportsService.parseError(error);

    assert.equal(parsed.status, 503);
    assert.equal(parsed.message, "Unable to process report request right now.");
    assert.equal(parsed.message.includes("IncidentEvidence"), false);
  });

  it("returns generic messages for Prisma initialization errors", () => {
    const error = new Prisma.PrismaClientInitializationError(
      "Can't reach database server at db.internal:5432",
      "test-client",
      "P1001",
    );

    const parsed = reportsService.parseError(error);

    assert.equal(parsed.status, 503);
    assert.equal(parsed.message, "Unable to process report request right now.");
    assert.equal(parsed.message.includes("db.internal"), false);
  });
});
