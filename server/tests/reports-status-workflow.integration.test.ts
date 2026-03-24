import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { prisma } from "../src/config/prisma.js";
import { reportsService } from "../src/modules/reports/reports.service.js";

type GetForOfficialById = typeof reportsService.getForOfficialById;

const baseUser = {
  id: "official-1",
  role: "OFFICIAL" as const,
  fullName: "Test Official",
  barangayCode: "251" as const,
};

const originalFindUnique = prisma.citizenReport.findUnique;
const originalFindMany = prisma.user.findMany;
const originalReportUpdate = prisma.citizenReport.update;
const originalHistoryCreate = prisma.ticketStatusHistory.create;
const originalNotificationCreateMany = (prisma as any).adminNotification?.createMany;
const originalTransaction = prisma.$transaction;
const originalGetForOfficialById = reportsService.getForOfficialById;

afterEach(() => {
  prisma.citizenReport.findUnique = originalFindUnique;
  prisma.user.findMany = originalFindMany;
  prisma.citizenReport.update = originalReportUpdate;
  prisma.ticketStatusHistory.create = originalHistoryCreate;
  if ((prisma as any).adminNotification?.createMany && originalNotificationCreateMany) {
    (prisma as any).adminNotification.createMany = originalNotificationCreateMany;
  }
  prisma.$transaction = originalTransaction;
  reportsService.getForOfficialById = originalGetForOfficialById as GetForOfficialById;
});

describe("Report status transition workflow", () => {
  it("rejects invalid non-linear transition from Submitted to Resolved", async () => {
    prisma.citizenReport.findUnique = (async () => ({
      id: "MY-2026-0001",
      status: "SUBMITTED",
      routedBarangayCode: "251",
    })) as typeof prisma.citizenReport.findUnique;

    await assert.rejects(
      reportsService.updateStatus(baseUser, "MY-2026-0001", { status: "Resolved" }),
      (error: unknown) => {
        const parsed = reportsService.parseError(error);
        assert.equal(parsed.status, 400);
        assert.equal(parsed.message, "Invalid status transition from Submitted to Resolved.");
        return true;
      },
    );
  });

  it("allows valid transition from Submitted to Under Review", async () => {
    prisma.citizenReport.findUnique = (async () => ({
      id: "MY-2026-0002",
      status: "SUBMITTED",
      routedBarangayCode: "251",
    })) as typeof prisma.citizenReport.findUnique;

    prisma.user.findMany = (async () => []) as typeof prisma.user.findMany;
    prisma.citizenReport.update = (async () => ({ id: "MY-2026-0002" })) as typeof prisma.citizenReport.update;
    prisma.ticketStatusHistory.create = (async () => ({ id: "history-1" })) as typeof prisma.ticketStatusHistory.create;
    prisma.$transaction = (async () => []) as typeof prisma.$transaction;

    reportsService.getForOfficialById = (async () => ({
      id: "MY-2026-0002",
      citizenUserId: "citizen-1",
      routedBarangayCode: "251",
      latitude: 14.6145,
      longitude: 120.9778,
      category: "Noise",
      subcategory: "Loud music or karaoke",
      requiresMediation: false,
      mediationWarning: null,
      status: "Under Review",
      location: "Barangay 251 Hall",
      barangay: "Barangay 251",
      district: "Tondo, Manila",
      description: "Status workflow validation.",
      severity: "medium",
      affectedCount: "6-20",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasPhotos: true,
      photoCount: 1,
      hasAudio: false,
      assignedOfficer: "Test Official",
      assignedUnit: null,
      resolutionNote: null,
      evidence: [],
      reporterVerificationStatus: "verified",
      timeline: [],
    })) as GetForOfficialById;

    const updated = await reportsService.updateStatus(baseUser, "MY-2026-0002", {
      status: "Under Review",
      note: "Initial review started.",
    });

    assert.equal(updated.id, "MY-2026-0002");
    assert.equal(updated.status, "Under Review");
  });

  it("rejects transitions from terminal Closed state", async () => {
    prisma.citizenReport.findUnique = (async () => ({
      id: "MY-2026-0003",
      status: "CLOSED",
      routedBarangayCode: "251",
    })) as typeof prisma.citizenReport.findUnique;

    await assert.rejects(
      reportsService.updateStatus(baseUser, "MY-2026-0003", { status: "In Progress" }),
      (error: unknown) => {
        const parsed = reportsService.parseError(error);
        assert.equal(parsed.status, 400);
        assert.equal(parsed.message, "Invalid status transition from Closed to In Progress.");
        return true;
      },
    );
  });
});
