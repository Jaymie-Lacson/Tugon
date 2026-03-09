import {
  IncidentType as PrismaIncidentType,
  ReportSeverity as PrismaReportSeverity,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { geofencingService } from "../map/geofencing.service.js";
import { reportsStore } from "./store.js";
import type { Role } from "../auth/types.js";
import type {
  CrossBorderAlertRecord,
  CitizenReportRecord,
  CreateCitizenReportInput,
  HeatmapClusterRecord,
  HeatmapQueryInput,
  IncidentType,
  ReportSeverity,
  TicketStatus,
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
const ALLOWED_TICKET_STATUSES: TicketStatus[] = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
  "Closed",
  "Unresolvable",
];
const DEFAULT_HEATMAP_DAYS = 14;
const DEFAULT_HEATMAP_THRESHOLD = 3;
const DEFAULT_HEATMAP_CELL_SIZE = 0.0025;

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  "Submitted": ["Under Review"],
  "Under Review": ["In Progress", "Unresolvable"],
  "In Progress": ["Resolved"],
  "Resolved": ["Closed"],
  "Closed": [],
  "Unresolvable": [],
};

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

const toPrismaStatusMap: Record<TicketStatus, PrismaTicketStatus> = {
  "Submitted": PrismaTicketStatus.SUBMITTED,
  "Under Review": PrismaTicketStatus.UNDER_REVIEW,
  "In Progress": PrismaTicketStatus.IN_PROGRESS,
  "Resolved": PrismaTicketStatus.RESOLVED,
  "Closed": PrismaTicketStatus.CLOSED,
  "Unresolvable": PrismaTicketStatus.UNRESOLVABLE,
};

function canTransition(fromStatus: TicketStatus, toStatus: TicketStatus): boolean {
  return STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

function statusLabel(status: TicketStatus): string {
  switch (status) {
    case "Submitted":
      return "Submitted";
    case "Under Review":
      return "Under Review";
    case "In Progress":
      return "In Progress";
    case "Resolved":
      return "Resolved";
    case "Closed":
      return "Closed";
    case "Unresolvable":
      return "Unresolvable";
    default:
      return status;
  }
}

function statusDescription(status: TicketStatus): string {
  switch (status) {
    case "Under Review":
      return "Official has started reviewing this report.";
    case "In Progress":
      return "Official action is in progress for this report.";
    case "Resolved":
      return "Official marked this report as resolved.";
    case "Closed":
      return "Official closed this report after resolution.";
    case "Unresolvable":
      return "Official marked this report as unresolvable.";
    case "Submitted":
      return "Report is currently submitted.";
    default:
      return "Report status updated.";
  }
}

function assertJurisdiction(
  user: { role: Role; barangayCode: string | null },
  reportBarangayCode: string,
) {
  if (user.role === "OFFICIAL") {
    if (!user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    if (user.barangayCode !== reportBarangayCode) {
      throw new ReportsError("You cannot act on incidents outside your barangay jurisdiction.", 403);
    }
  }
}

function assertAlertJurisdiction(
  user: { role: Role; barangayCode: string | null },
  targetBarangayCode: string,
) {
  if (user.role === "OFFICIAL") {
    if (!user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    if (user.barangayCode !== targetBarangayCode) {
      throw new ReportsError("You cannot manage alerts outside your barangay jurisdiction.", 403);
    }
  }
}

function mapPersistedReport(row: {
  id: string;
  citizenUserId: string;
  routedBarangayCode: string;
  latitude: number;
  longitude: number;
  type: PrismaIncidentType;
  status: PrismaTicketStatus;
  location: string;
  barangay: string;
  district: string;
  description: string;
  severity: ReportSeverity;
  affectedCount: string | null;
  submittedAt: Date;
  updatedAt: Date;
  hasPhotos: boolean;
  photoCount: number;
  hasAudio: boolean;
  assignedOfficer: string | null;
  assignedUnit: string | null;
  resolutionNote: string | null;
  statusHistory: Array<{
    status: PrismaTicketStatus;
    label: string;
    description: string;
    actor: string;
    actorRole: string;
    note: string | null;
    createdAt: Date;
  }>;
}): CitizenReportRecord {
  return {
    id: row.id,
    citizenUserId: row.citizenUserId,
    routedBarangayCode: row.routedBarangayCode,
    latitude: row.latitude,
    longitude: row.longitude,
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
  };
}

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
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const description = input.description?.trim();

  if (!location) {
    throw new ReportsError("Location is required.", 400);
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ReportsError("Valid location coordinates are required.", 400);
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
    latitude,
    longitude,
    description,
    photoCount,
    affectedCount: input.affectedCount ?? null,
  };
}

function validateHeatmapInput(input: HeatmapQueryInput): {
  incidentType?: IncidentType;
  fromDate: Date;
  toDate: Date;
  threshold: number;
  cellSize: number;
} {
  const now = new Date();
  const rawDays = Number(input.days ?? DEFAULT_HEATMAP_DAYS);
  if (!Number.isInteger(rawDays) || rawDays <= 0 || rawDays > 180) {
    throw new ReportsError("Heatmap days must be an integer between 1 and 180.", 400);
  }

  const threshold = Number(input.threshold ?? DEFAULT_HEATMAP_THRESHOLD);
  if (!Number.isInteger(threshold) || threshold < 2 || threshold > 100) {
    throw new ReportsError("Heatmap threshold must be an integer between 2 and 100.", 400);
  }

  const cellSize = Number(input.cellSize ?? DEFAULT_HEATMAP_CELL_SIZE);
  if (!Number.isFinite(cellSize) || cellSize <= 0 || cellSize > 0.02) {
    throw new ReportsError("Heatmap cell size must be greater than 0 and at most 0.02.", 400);
  }

  let incidentType: IncidentType | undefined;
  if (typeof input.incidentType === "string") {
    const candidate = input.incidentType.trim() as IncidentType;
    if (!ALLOWED_TYPES.includes(candidate)) {
      throw new ReportsError("Invalid heatmap incident type filter.", 400);
    }
    incidentType = candidate;
  }

  const parsedTo = input.toDate ? new Date(input.toDate) : now;
  if (Number.isNaN(parsedTo.getTime())) {
    throw new ReportsError("Invalid heatmap toDate.", 400);
  }

  const parsedFrom = input.fromDate
    ? new Date(input.fromDate)
    : new Date(parsedTo.getTime() - rawDays * 24 * 60 * 60 * 1000);
  if (Number.isNaN(parsedFrom.getTime())) {
    throw new ReportsError("Invalid heatmap fromDate.", 400);
  }

  if (parsedFrom > parsedTo) {
    throw new ReportsError("Heatmap fromDate cannot be later than toDate.", 400);
  }

  return {
    incidentType,
    fromDate: parsedFrom,
    toDate: parsedTo,
    threshold,
    cellSize,
  };
}

// Super Admin must not see the citizenUserId that would allow cross-referencing
// a specific citizen to their report (RA 10173 — Data Privacy Act of 2012).
function anonymizeReportForSuperAdmin(report: CitizenReportRecord): CitizenReportRecord {
  return { ...report, citizenUserId: "[protected]" };
}

export const reportsService = {
  async create(
    citizenUser: { id: string; fullName: string; barangayCode: string },
    input: CreateCitizenReportInput,
  ) {
    const validated = validateCreateInput(input);
    const routedBarangay = await geofencingService.resolveBarangayFromCoordinates(
      validated.latitude,
      validated.longitude,
    );

    // Enforce citizen registration jurisdiction for report submissions.
    if (routedBarangay.code !== citizenUser.barangayCode) {
      throw new ReportsError(
        `Pinned location belongs to Barangay ${routedBarangay.code}. You can only submit incidents within Barangay ${citizenUser.barangayCode}.`,
        403,
      );
    }

    const now = new Date().toISOString();
    const reportId = reportsStore.nextReportId();
    const nearbyBarangays = await geofencingService.findNearbyBarangaysForAlert(
      validated.latitude,
      validated.longitude,
      routedBarangay.code,
    );

    const report: CitizenReportRecord = {
      id: reportId,
      citizenUserId: citizenUser.id,
      routedBarangayCode: routedBarangay.code,
      latitude: validated.latitude,
      longitude: validated.longitude,
      type: validated.type,
      status: "Submitted",
      location: validated.location,
      barangay: routedBarangay.name,
      district: `Barangay ${routedBarangay.code}`,
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

    await prisma.$transaction([
      prisma.citizenReport.upsert({
        where: { id: report.id },
        update: {
          citizenUserId: report.citizenUserId,
          routedBarangayCode: report.routedBarangayCode,
          latitude: report.latitude,
          longitude: report.longitude,
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
          routedBarangayCode: report.routedBarangayCode,
          latitude: report.latitude,
          longitude: report.longitude,
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
      prisma.crossBorderAlert.deleteMany({
        where: {
          reportId: report.id,
        },
      }),
      prisma.crossBorderAlert.createMany({
        data: nearbyBarangays.map((barangay) => ({
          reportId: report.id,
          sourceBarangayCode: routedBarangay.code,
          targetBarangayCode: barangay.code,
          alertReason: "Incident reported near shared jurisdiction boundary.",
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

    return persisted.map((row: Parameters<typeof mapPersistedReport>[0]) => mapPersistedReport(row));
  },

  async getMineById(citizenUserId: string, reportId: string): Promise<CitizenReportRecord> {
    const reports = await reportsService.listMine(citizenUserId);
    const report = reports.find((item) => item.id === reportId);
    if (!report) {
      throw new ReportsError("Report not found.", 404);
    }
    return report;
  },

  async listForOfficial(user: { role: Role; barangayCode: string | null }): Promise<CitizenReportRecord[]> {
    if (user.role === "OFFICIAL" && !user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    const where = user.role === "OFFICIAL" ? { routedBarangayCode: user.barangayCode! } : {};
    const persisted = await prisma.citizenReport.findMany({
      where,
      include: {
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const records = persisted.map((row: Parameters<typeof mapPersistedReport>[0]) => mapPersistedReport(row));
    return user.role === "SUPER_ADMIN" ? records.map(anonymizeReportForSuperAdmin) : records;
  },

  async getForOfficialById(
    user: { role: Role; barangayCode: string | null },
    reportId: string,
  ): Promise<CitizenReportRecord> {
    const persisted = await prisma.citizenReport.findUnique({
      where: { id: reportId },
      include: {
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!persisted) {
      throw new ReportsError("Report not found.", 404);
    }

    assertJurisdiction(user, persisted.routedBarangayCode);
    const record = mapPersistedReport(persisted);
    return user.role === "SUPER_ADMIN" ? anonymizeReportForSuperAdmin(record) : record;
  },

  async updateStatus(
    user: { id: string; role: Role; fullName: string; barangayCode: string | null },
    reportId: string,
    input: { status: TicketStatus; note?: string },
  ): Promise<CitizenReportRecord> {
    if (!ALLOWED_TICKET_STATUSES.includes(input.status)) {
      throw new ReportsError("Invalid ticket status.", 400);
    }

    const report = await prisma.citizenReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        routedBarangayCode: true,
      },
    });

    if (!report) {
      throw new ReportsError("Report not found.", 404);
    }

    assertJurisdiction(user, report.routedBarangayCode);

    const currentStatus = ticketStatusMap[report.status];
    if (!canTransition(currentStatus, input.status)) {
      throw new ReportsError(
        `Invalid status transition from ${currentStatus} to ${input.status}.`,
        400,
      );
    }

    const note = input.note?.trim();
    await prisma.$transaction([
      prisma.citizenReport.update({
        where: { id: reportId },
        data: {
          status: toPrismaStatusMap[input.status],
          updatedAt: new Date(),
          assignedOfficer: user.fullName,
        },
      }),
      prisma.ticketStatusHistory.create({
        data: {
          reportId,
          status: toPrismaStatusMap[input.status],
          label: statusLabel(input.status),
          description: statusDescription(input.status),
          actor: user.fullName,
          actorRole: user.role === "SUPER_ADMIN" ? "Super Admin" : "Official",
          note: note || null,
        },
      }),
    ]);

    return reportsService.getForOfficialById(user, reportId);
  },

  async listAlertsForOfficial(
    user: { role: Role; barangayCode: string | null },
  ): Promise<CrossBorderAlertRecord[]> {
    if (user.role === "OFFICIAL" && !user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    const where = user.role === "OFFICIAL" ? { targetBarangayCode: user.barangayCode! } : {};
    const alerts = await prisma.crossBorderAlert.findMany({
      where,
      include: {
        report: {
          select: {
            id: true,
            type: true,
            status: true,
            location: true,
            barangay: true,
            district: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      reportId: alert.reportId,
      sourceBarangayCode: alert.sourceBarangayCode,
      targetBarangayCode: alert.targetBarangayCode,
      alertReason: alert.alertReason,
      createdAt: alert.createdAt.toISOString(),
      readAt: alert.readAt ? alert.readAt.toISOString() : null,
      report: {
        id: alert.report.id,
        type: incidentTypeMap[alert.report.type],
        status: ticketStatusMap[alert.report.status],
        location: alert.report.location,
        barangay: alert.report.barangay,
        district: alert.report.district,
        submittedAt: alert.report.submittedAt.toISOString(),
      },
    }));
  },

  async markAlertRead(
    user: { role: Role; barangayCode: string | null },
    alertId: string,
  ): Promise<CrossBorderAlertRecord> {
    const existingAlert = await prisma.crossBorderAlert.findUnique({
      where: { id: alertId },
      include: {
        report: {
          select: {
            id: true,
            type: true,
            status: true,
            location: true,
            barangay: true,
            district: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!existingAlert) {
      throw new ReportsError("Alert not found.", 404);
    }

    assertAlertJurisdiction(user, existingAlert.targetBarangayCode);

    const updatedAlert = await prisma.crossBorderAlert.update({
      where: { id: alertId },
      data: {
        readAt: existingAlert.readAt ?? new Date(),
      },
      include: {
        report: {
          select: {
            id: true,
            type: true,
            status: true,
            location: true,
            barangay: true,
            district: true,
            submittedAt: true,
          },
        },
      },
    });

    return {
      id: updatedAlert.id,
      reportId: updatedAlert.reportId,
      sourceBarangayCode: updatedAlert.sourceBarangayCode,
      targetBarangayCode: updatedAlert.targetBarangayCode,
      alertReason: updatedAlert.alertReason,
      createdAt: updatedAlert.createdAt.toISOString(),
      readAt: updatedAlert.readAt ? updatedAlert.readAt.toISOString() : null,
      report: {
        id: updatedAlert.report.id,
        type: incidentTypeMap[updatedAlert.report.type],
        status: ticketStatusMap[updatedAlert.report.status],
        location: updatedAlert.report.location,
        barangay: updatedAlert.report.barangay,
        district: updatedAlert.report.district,
        submittedAt: updatedAlert.report.submittedAt.toISOString(),
      },
    };
  },

  async listHeatmapForOfficial(
    user: { role: Role; barangayCode: string | null },
    input: HeatmapQueryInput,
  ): Promise<{
    clusters: HeatmapClusterRecord[];
    applied: {
      incidentType: IncidentType | null;
      fromDate: string;
      toDate: string;
      threshold: number;
      cellSize: number;
    };
  }> {
    if (user.role === "OFFICIAL" && !user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    const validated = validateHeatmapInput(input);
    const where = {
      ...(user.role === "OFFICIAL" ? { routedBarangayCode: user.barangayCode! } : {}),
      ...(validated.incidentType ? { type: prismaTypeMap[validated.incidentType] } : {}),
      submittedAt: {
        gte: validated.fromDate,
        lte: validated.toDate,
      },
    };

    const reports = await prisma.citizenReport.findMany({
      where,
      select: {
        id: true,
        type: true,
        latitude: true,
        longitude: true,
        routedBarangayCode: true,
        submittedAt: true,
      },
    });

    const clustersMap = new Map<
      string,
      {
        incidentType: PrismaIncidentType;
        incidentCount: number;
        sumLatitude: number;
        sumLongitude: number;
        barangayCodes: Set<string>;
      }
    >();

    for (const report of reports) {
      const cellLat = Math.floor(report.latitude / validated.cellSize);
      const cellLng = Math.floor(report.longitude / validated.cellSize);
      const key = `${report.type}:${cellLat}:${cellLng}`;
      const existing = clustersMap.get(key);

      if (existing) {
        existing.incidentCount += 1;
        existing.sumLatitude += report.latitude;
        existing.sumLongitude += report.longitude;
        existing.barangayCodes.add(report.routedBarangayCode);
      } else {
        clustersMap.set(key, {
          incidentType: report.type,
          incidentCount: 1,
          sumLatitude: report.latitude,
          sumLongitude: report.longitude,
          barangayCodes: new Set([report.routedBarangayCode]),
        });
      }
    }

    const clusters: HeatmapClusterRecord[] = Array.from(clustersMap.entries())
      .filter(([, cluster]) => cluster.incidentCount >= validated.threshold)
      .map(([clusterId, cluster]) => ({
        clusterId,
        incidentType: incidentTypeMap[cluster.incidentType],
        incidentCount: cluster.incidentCount,
        centerLatitude: Number((cluster.sumLatitude / cluster.incidentCount).toFixed(6)),
        centerLongitude: Number((cluster.sumLongitude / cluster.incidentCount).toFixed(6)),
        intensity: Number((cluster.incidentCount / validated.threshold).toFixed(2)),
        threshold: validated.threshold,
        timeWindowStart: validated.fromDate.toISOString(),
        timeWindowEnd: validated.toDate.toISOString(),
        barangayCodes: Array.from(cluster.barangayCodes).sort(),
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount);

    return {
      clusters,
      applied: {
        incidentType: validated.incidentType ?? null,
        fromDate: validated.fromDate.toISOString(),
        toDate: validated.toDate.toISOString(),
        threshold: validated.threshold,
        cellSize: validated.cellSize,
      },
    };
  },

  parseError(error: unknown) {
    if (error instanceof ReportsError) {
      return { status: error.status, message: error.message };
    }
    return { status: 500, message: "Unexpected reports service error." };
  },
};
