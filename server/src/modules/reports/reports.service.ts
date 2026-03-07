import {
  IncidentType as PrismaIncidentType,
  ReportSeverity as PrismaReportSeverity,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { reportsStore } from "./store.js";
import type {
  CitizenReportRecord,
  CreateCitizenReportInput,
  IncidentType,
  ReportSeverity,
} from "./types.js";

const ALLOWED_TYPES: IncidentType[] = [
  "Fire",
  "Pollution",
  "Noise",
  "Crime",
  "Road Hazard",
  "Other",
];

const ALLOWED_SEVERITIES: ReportSeverity[] = ["low", "medium", "high", "critical"];

class ReportsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function validateCreateInput(input: CreateCitizenReportInput): CreateCitizenReportInput {
  if (!ALLOWED_TYPES.includes(input.type)) {
    throw new ReportsError("Invalid incident type.", 400);
  }

  if (!ALLOWED_SEVERITIES.includes(input.severity)) {
    throw new ReportsError("Invalid report severity.", 400);
  }

  const location = input.location?.trim();
  const barangay = input.barangay?.trim();
  const district = input.district?.trim();
  const description = input.description?.trim();

  if (!location || !barangay || !district) {
    throw new ReportsError("Location, barangay, and district are required.", 400);
  }

  if (!description || description.length < 10) {
    throw new ReportsError("Description must be at least 10 characters.", 400);
  }

  const photoCount = Number(input.photoCount ?? 0);
  if (Number.isNaN(photoCount) || photoCount < 0) {
    throw new ReportsError("Invalid photo count.", 400);
  }

  return {
    ...input,
    location,
    barangay,
    district,
    description,
    photoCount,
    affectedCount: input.affectedCount ?? null,
  };
}

export const reportsService = {
  async create(citizenUser: { id: string; fullName: string }, input: CreateCitizenReportInput) {
    const validated = validateCreateInput(input);
    const now = new Date().toISOString();
    const reportId = reportsStore.nextReportId();

    const report: CitizenReportRecord = {
      id: reportId,
      citizenUserId: citizenUser.id,
      type: validated.type,
      status: "Submitted",
      location: validated.location,
      barangay: validated.barangay,
      district: validated.district,
      description: validated.description,
      severity: validated.severity,
      affectedCount: validated.affectedCount,
      submittedAt: now,
      updatedAt: now,
      hasPhotos: validated.photoCount > 0,
      photoCount: validated.photoCount,
      hasAudio: validated.hasAudio,
      assignedOfficer: null,
      assignedUnit: null,
      resolutionNote: null,
      timeline: [
        {
          status: "Created",
          label: "Report Created",
          description: "Citizen submitted a new report through TUGON.",
          timestamp: now,
          actor: citizenUser.fullName,
          actorRole: "Citizen",
        },
        {
          status: "Submitted",
          label: "Received by System",
          description: `Report logged with tracking number ${reportId}.`,
          timestamp: now,
          actor: "TUGON System",
          actorRole: "Automated",
        },
      ],
    };

    reportsStore.save(report);

    const prismaTypeMap: Record<IncidentType, PrismaIncidentType> = {
      "Fire": PrismaIncidentType.FIRE,
      "Pollution": PrismaIncidentType.POLLUTION,
      "Noise": PrismaIncidentType.NOISE,
      "Crime": PrismaIncidentType.CRIME,
      "Road Hazard": PrismaIncidentType.ROAD_HAZARD,
      "Other": PrismaIncidentType.OTHER,
    };

    const prismaSeverityMap: Record<ReportSeverity, PrismaReportSeverity> = {
      low: PrismaReportSeverity.low,
      medium: PrismaReportSeverity.medium,
      high: PrismaReportSeverity.high,
      critical: PrismaReportSeverity.critical,
    };

    await prisma.$transaction([
      prisma.citizenReport.upsert({
        where: { id: report.id },
        update: {
          citizenUserId: report.citizenUserId,
          type: prismaTypeMap[report.type],
          status: PrismaTicketStatus.SUBMITTED,
          location: report.location,
          barangay: report.barangay,
          district: report.district,
          description: report.description,
          severity: prismaSeverityMap[report.severity],
          affectedCount: report.affectedCount,
          hasPhotos: report.hasPhotos,
          photoCount: report.photoCount,
          hasAudio: report.hasAudio,
        },
        create: {
          id: report.id,
          citizenUserId: report.citizenUserId,
          type: prismaTypeMap[report.type],
          status: PrismaTicketStatus.SUBMITTED,
          location: report.location,
          barangay: report.barangay,
          district: report.district,
          description: report.description,
          severity: prismaSeverityMap[report.severity],
          affectedCount: report.affectedCount,
          submittedAt: new Date(report.submittedAt),
          updatedAt: new Date(report.updatedAt),
          hasPhotos: report.hasPhotos,
          photoCount: report.photoCount,
          hasAudio: report.hasAudio,
        },
      }),
      prisma.ticketStatusHistory.deleteMany({
        where: { reportId: report.id },
      }),
      prisma.ticketStatusHistory.createMany({
        data: report.timeline.map((entry) => ({
          reportId: report.id,
          status: entry.status === "Created" ? PrismaTicketStatus.SUBMITTED : PrismaTicketStatus.SUBMITTED,
          label: entry.label,
          description: entry.description,
          actor: entry.actor,
          actorRole: entry.actorRole,
          note: entry.note,
          createdAt: new Date(entry.timestamp),
        })),
      }),
    ]);

    return {
      message: "Report submitted successfully.",
      report,
    };
  },

  async listMine(citizenUserId: string): Promise<CitizenReportRecord[]> {
    const persisted = await prisma.citizenReport.findMany({
      where: { citizenUserId },
      include: {
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    if (persisted.length === 0) {
      return reportsStore.listByCitizenUserId(citizenUserId);
    }

    const ticketStatusMap: Record<PrismaTicketStatus, CitizenReportRecord["status"]> = {
      SUBMITTED: "Submitted",
      UNDER_REVIEW: "Under Review",
      IN_PROGRESS: "In Progress",
      RESOLVED: "Resolved",
      CLOSED: "Closed",
      UNRESOLVABLE: "Unresolvable",
    };

    const incidentTypeMap: Record<PrismaIncidentType, CitizenReportRecord["type"]> = {
      FIRE: "Fire",
      POLLUTION: "Pollution",
      NOISE: "Noise",
      CRIME: "Crime",
      ROAD_HAZARD: "Road Hazard",
      OTHER: "Other",
    };

    return persisted.map((row): CitizenReportRecord => ({
      id: row.id,
      citizenUserId: row.citizenUserId,
      type: incidentTypeMap[row.type],
      status: ticketStatusMap[row.status],
      location: row.location,
      barangay: row.barangay,
      district: row.district,
      description: row.description,
      severity: row.severity,
      affectedCount: row.affectedCount,
      submittedAt: row.submittedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      hasPhotos: row.hasPhotos,
      photoCount: row.photoCount,
      hasAudio: row.hasAudio,
      assignedOfficer: row.assignedOfficer,
      assignedUnit: row.assignedUnit,
      resolutionNote: row.resolutionNote,
      timeline: row.statusHistory.map((entry) => ({
        status: entry.label === "Report Created" ? "Created" : ticketStatusMap[entry.status],
        label: entry.label,
        description: entry.description,
        timestamp: entry.createdAt.toISOString(),
        actor: entry.actor,
        actorRole: entry.actorRole,
        note: entry.note ?? undefined,
      })),
    }));
  },

  async getMineById(citizenUserId: string, reportId: string): Promise<CitizenReportRecord> {
    const reports = await reportsService.listMine(citizenUserId);
    const report = reports.find((item) => item.id === reportId);
    if (!report) {
      throw new ReportsError("Report not found.", 404);
    }
    return report;
  },

  parseError(error: unknown) {
    if (error instanceof ReportsError) {
      return { status: error.status, message: error.message };
    }
    return { status: 500, message: "Unexpected reports service error." };
  },
};
