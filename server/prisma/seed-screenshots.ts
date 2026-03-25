import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, ReportSeverity, Role, TicketStatus, VerificationStatus } from "@prisma/client";

// Allow running from either repo root or server/ while still resolving DATABASE_URL.
loadEnv();
loadEnv({ path: "./server/.env", override: false });
loadEnv({ path: "./.env", override: false });
loadEnv({ path: "../.env", override: false });

const prisma = new PrismaClient();

const PASSWORD_PLAIN = "Password123!";

const BARANGAYS = [
  { id: "seed-brgy-251", code: "251", name: "Barangay 251", centerLat: 14.61448, centerLng: 120.97756 },
  { id: "seed-brgy-252", code: "252", name: "Barangay 252", centerLat: 14.61442, centerLng: 120.97696 },
  { id: "seed-brgy-256", code: "256", name: "Barangay 256", centerLat: 14.61558, centerLng: 120.97883 },
] as const;

type ScreenshotUserSeed = {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  barangayCode?: string;
  position?: string;
};

const USERS: ScreenshotUserSeed[] = [
  {
    id: "seed-user-superadmin-001",
    fullName: "Demo Super Admin",
    phoneNumber: "09170000001",
    role: Role.SUPER_ADMIN,
  },
  {
    id: "seed-user-official-251",
    fullName: "Demo Official 251",
    phoneNumber: "09170000011",
    role: Role.OFFICIAL,
    barangayCode: "251",
    position: "Barangay Kagawad",
  },
  {
    id: "seed-user-official-252",
    fullName: "Demo Official 252",
    phoneNumber: "09170000012",
    role: Role.OFFICIAL,
    barangayCode: "252",
    position: "Peace and Order Officer",
  },
  {
    id: "seed-user-official-256",
    fullName: "Demo Official 256",
    phoneNumber: "09170000013",
    role: Role.OFFICIAL,
    barangayCode: "256",
    position: "SK Chairperson",
  },
  {
    id: "seed-user-citizen-251",
    fullName: "Demo Citizen 251",
    phoneNumber: "09170000021",
    role: Role.CITIZEN,
    barangayCode: "251",
  },
  {
    id: "seed-user-citizen-252",
    fullName: "Demo Citizen 252",
    phoneNumber: "09170000022",
    role: Role.CITIZEN,
    barangayCode: "252",
  },
  {
    id: "seed-user-citizen-256",
    fullName: "Demo Citizen 256",
    phoneNumber: "09170000023",
    role: Role.CITIZEN,
    barangayCode: "256",
  },
  {
    id: "seed-user-citizen-252-extra-001",
    fullName: "Mario Tondo",
    phoneNumber: "09170000024",
    role: Role.CITIZEN,
    barangayCode: "252",
  },
  {
    id: "seed-user-citizen-252-extra-002",
    fullName: "Lea Tondo",
    phoneNumber: "09170000025",
    role: Role.CITIZEN,
    barangayCode: "252",
  },
];

type ScreenshotReportSeed = {
  id: string;
  citizenPhone: string;
  routedBarangayCode: string;
  latitude: number;
  longitude: number;
  location: string;
  category: string;
  subcategory: string;
  severity: ReportSeverity;
  status: TicketStatus;
  description: string;
  hasPhotos: boolean;
  photoCount: number;
  hasAudio: boolean;
  submittedAt: Date;
};

const BASE = new Date();
const HOURS = 60 * 60 * 1000;

const REPORTS: ScreenshotReportSeed[] = [
  {
    id: "SS-2026-0001",
    citizenPhone: "09170000022",
    routedBarangayCode: "252",
    latitude: 14.61442,
    longitude: 120.97696,
    location: "Balut Street, Barangay 252, Tondo",
    category: "Public Disturbance",
    subcategory: "Loud noises or late-night karaoke",
    severity: ReportSeverity.medium,
    status: TicketStatus.SUBMITTED,
    description: "Nighttime noise complaint with photo evidence ready for triage.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 2 * HOURS),
  },
  {
    id: "SS-2026-0002",
    citizenPhone: "09170000022",
    routedBarangayCode: "252",
    latitude: 14.61450,
    longitude: 120.97705,
    location: "Pritil Road, Barangay 252, Tondo",
    category: "Road and Street Issues",
    subcategory: "Blocked sidewalks",
    severity: ReportSeverity.low,
    status: TicketStatus.RESOLVED,
    description: "Obstruction removed after barangay coordination.",
    hasPhotos: true,
    photoCount: 2,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 34 * HOURS),
  },
  {
    id: "SS-2026-0003",
    citizenPhone: "09170000024",
    routedBarangayCode: "252",
    latitude: 14.61443,
    longitude: 120.97695,
    location: "Near Barangay 252 Hall, Tondo",
    category: "Public Disturbance",
    subcategory: "Drinking in public streets",
    severity: ReportSeverity.medium,
    status: TicketStatus.UNDER_REVIEW,
    description: "Recurring drinking complaints requiring barangay intervention.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 6 * HOURS),
  },
  {
    id: "SS-2026-0004",
    citizenPhone: "09170000025",
    routedBarangayCode: "252",
    latitude: 14.61444,
    longitude: 120.97697,
    location: "Shared alley near Barangay 252 boundary",
    category: "Public Disturbance",
    subcategory: "Loud noises or late-night karaoke",
    severity: ReportSeverity.high,
    status: TicketStatus.IN_PROGRESS,
    description: "Boundary-side noise incident with responders already assigned.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: true,
    submittedAt: new Date(BASE.getTime() - 9 * HOURS),
  },
  {
    id: "SS-2026-0005",
    citizenPhone: "09170000022",
    routedBarangayCode: "252",
    latitude: 14.61446,
    longitude: 120.97694,
    location: "Boundary lane between Barangay 252 and neighboring area",
    category: "Public Disturbance",
    subcategory: "Loud noises or late-night karaoke",
    severity: ReportSeverity.medium,
    status: TicketStatus.SUBMITTED,
    description: "Incident reported near shared boundary line for alert propagation test.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 3 * HOURS),
  },
  {
    id: "SS-2026-0006",
    citizenPhone: "09170000021",
    routedBarangayCode: "251",
    latitude: 14.61475,
    longitude: 120.97765,
    location: "Street 5, Barangay 251, Tondo",
    category: "Others",
    subcategory: "Unlisted general issues",
    severity: ReportSeverity.high,
    status: TicketStatus.SUBMITTED,
    description: "General non-urgent safety concern reported for official dashboard queue visibility.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 5 * HOURS),
  },
  {
    id: "SS-2026-0007",
    citizenPhone: "09170000023",
    routedBarangayCode: "256",
    latitude: 14.61562,
    longitude: 120.97890,
    location: "Market side, Barangay 256, Tondo",
    category: "Garbage and Sanitation",
    subcategory: "Illegal dumping",
    severity: ReportSeverity.medium,
    status: TicketStatus.CLOSED,
    description: "Illegal dumping area already cleaned and officially closed.",
    hasPhotos: true,
    photoCount: 1,
    hasAudio: false,
    submittedAt: new Date(BASE.getTime() - 72 * HOURS),
  },
];

function getStatusTimelineEntries(
  reportId: string,
  citizenName: string,
  officialName: string,
  status: TicketStatus,
  submittedAt: Date,
) {
  const entries: Array<{
    reportId: string;
    status: TicketStatus;
    label: string;
    description: string;
    actor: string;
    actorRole: string;
    note: string | null;
    createdAt: Date;
  }> = [
    {
      reportId,
      status: TicketStatus.SUBMITTED,
      label: "Report Created",
      description: "Citizen submitted a new report through TUGON.",
      actor: citizenName,
      actorRole: "Citizen",
      note: null,
      createdAt: submittedAt,
    },
  ];

  const underReviewAt = new Date(submittedAt.getTime() + 45 * 60 * 1000);
  const inProgressAt = new Date(submittedAt.getTime() + 2 * 60 * 60 * 1000);
  const resolvedAt = new Date(submittedAt.getTime() + 6 * 60 * 60 * 1000);
  const closedAt = new Date(submittedAt.getTime() + 8 * 60 * 60 * 1000);

  if (
    status === TicketStatus.UNDER_REVIEW ||
    status === TicketStatus.IN_PROGRESS ||
    status === TicketStatus.RESOLVED ||
    status === TicketStatus.CLOSED ||
    status === TicketStatus.UNRESOLVABLE
  ) {
    entries.push({
      reportId,
      status: TicketStatus.UNDER_REVIEW,
      label: "Under Review",
      description: "Official has started reviewing this report.",
      actor: officialName,
      actorRole: "Official",
      note: null,
      createdAt: underReviewAt,
    });
  }

  if (status === TicketStatus.IN_PROGRESS || status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
    entries.push({
      reportId,
      status: TicketStatus.IN_PROGRESS,
      label: "In Progress",
      description: "Response unit assigned and field action started.",
      actor: officialName,
      actorRole: "Official",
      note: "Assigned to barangay response team.",
      createdAt: inProgressAt,
    });
  }

  if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
    entries.push({
      reportId,
      status: TicketStatus.RESOLVED,
      label: "Resolved",
      description: "Incident addressed and marked resolved.",
      actor: officialName,
      actorRole: "Official",
      note: "Corrective action completed onsite.",
      createdAt: resolvedAt,
    });
  }

  if (status === TicketStatus.CLOSED) {
    entries.push({
      reportId,
      status: TicketStatus.CLOSED,
      label: "Closed",
      description: "Case archived after resolution confirmation.",
      actor: officialName,
      actorRole: "Official",
      note: null,
      createdAt: closedAt,
    });
  }

  return entries;
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  for (const barangay of BARANGAYS) {
    await prisma.barangay.upsert({
      where: { code: barangay.code },
      update: {
        name: barangay.name,
      },
      create: {
        id: barangay.id,
        code: barangay.code,
        name: barangay.name,
      },
    });
  }

  const barangayByCode = new Map(
    (await prisma.barangay.findMany({ where: { code: { in: BARANGAYS.map((item) => item.code) } } })).map((item) => [
      item.code,
      item,
    ]),
  );

  for (const seedUser of USERS) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: seedUser.phoneNumber },
      update: {
        fullName: seedUser.fullName,
        role: seedUser.role,
        passwordHash,
        isPhoneVerified: true,
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
      },
      create: {
        id: seedUser.id,
        fullName: seedUser.fullName,
        phoneNumber: seedUser.phoneNumber,
        role: seedUser.role,
        passwordHash,
        isPhoneVerified: true,
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
      },
    });

    if (seedUser.role === Role.CITIZEN && seedUser.barangayCode) {
      const barangay = barangayByCode.get(seedUser.barangayCode);
      if (!barangay) {
        throw new Error(`Missing barangay ${seedUser.barangayCode} for citizen profile.`);
      }

      await prisma.citizenProfile.upsert({
        where: { userId: user.id },
        update: {
          barangayId: barangay.id,
          address: `Resident area, Barangay ${seedUser.barangayCode}, Tondo, Manila`,
        },
        create: {
          userId: user.id,
          barangayId: barangay.id,
          address: `Resident area, Barangay ${seedUser.barangayCode}, Tondo, Manila`,
        },
      });
    }

    if (seedUser.role === Role.OFFICIAL && seedUser.barangayCode) {
      const barangay = barangayByCode.get(seedUser.barangayCode);
      if (!barangay) {
        throw new Error(`Missing barangay ${seedUser.barangayCode} for official profile.`);
      }

      await prisma.officialProfile.upsert({
        where: { userId: user.id },
        update: {
          barangayId: barangay.id,
          position: seedUser.position ?? "Barangay Official",
        },
        create: {
          userId: user.id,
          barangayId: barangay.id,
          position: seedUser.position ?? "Barangay Official",
        },
      });
    }
  }

  const usersByPhone = new Map(
    (await prisma.user.findMany({ where: { phoneNumber: { in: USERS.map((item) => item.phoneNumber) } } })).map((user) => [
      user.phoneNumber,
      user,
    ]),
  );

  const official252 = usersByPhone.get("09170000012");
  if (!official252) {
    throw new Error("Official 252 was not created.");
  }

  for (const report of REPORTS) {
    const citizen = usersByPhone.get(report.citizenPhone);
    if (!citizen) {
      throw new Error(`Citizen with phone ${report.citizenPhone} not found.`);
    }

    const submittedAt = report.submittedAt;
    const updatedAt = new Date(
      submittedAt.getTime() +
        (report.status === TicketStatus.SUBMITTED
          ? 30 * 60 * 1000
          : report.status === TicketStatus.UNDER_REVIEW
            ? 60 * 60 * 1000
            : report.status === TicketStatus.IN_PROGRESS
              ? 3 * 60 * 60 * 1000
              : 7 * 60 * 60 * 1000),
    );

    await prisma.citizenReport.upsert({
      where: { id: report.id },
      update: {
        citizenUserId: citizen.id,
        routedBarangayCode: report.routedBarangayCode,
        latitude: report.latitude,
        longitude: report.longitude,
        category: report.category,
        subcategory: report.subcategory,
        requiresMediation: false,
        mediationWarning: null,
        status: report.status,
        location: report.location,
        barangay: `Barangay ${report.routedBarangayCode}`,
        district: `Barangay ${report.routedBarangayCode}`,
        description: report.description,
        severity: report.severity,
        affectedCount: "6-20",
        submittedAt,
        updatedAt,
        hasPhotos: report.hasPhotos,
        photoCount: report.photoCount,
        hasAudio: report.hasAudio,
        assignedOfficer:
          report.status === TicketStatus.SUBMITTED ? null : "Demo Official 252",
        assignedUnit:
          report.status === TicketStatus.SUBMITTED ? null : "Barangay Response Unit",
        resolutionNote:
          report.status === TicketStatus.RESOLVED || report.status === TicketStatus.CLOSED
            ? "Action completed by responding officials."
            : null,
      },
      create: {
        id: report.id,
        citizenUserId: citizen.id,
        routedBarangayCode: report.routedBarangayCode,
        latitude: report.latitude,
        longitude: report.longitude,
        category: report.category,
        subcategory: report.subcategory,
        requiresMediation: false,
        mediationWarning: null,
        status: report.status,
        location: report.location,
        barangay: `Barangay ${report.routedBarangayCode}`,
        district: `Barangay ${report.routedBarangayCode}`,
        description: report.description,
        severity: report.severity,
        affectedCount: "6-20",
        submittedAt,
        updatedAt,
        hasPhotos: report.hasPhotos,
        photoCount: report.photoCount,
        hasAudio: report.hasAudio,
        assignedOfficer:
          report.status === TicketStatus.SUBMITTED ? null : "Demo Official 252",
        assignedUnit:
          report.status === TicketStatus.SUBMITTED ? null : "Barangay Response Unit",
        resolutionNote:
          report.status === TicketStatus.RESOLVED || report.status === TicketStatus.CLOSED
            ? "Action completed by responding officials."
            : null,
      },
    });

    await prisma.ticketStatusHistory.deleteMany({ where: { reportId: report.id } });
    await prisma.ticketStatusHistory.createMany({
      data: getStatusTimelineEntries(report.id, citizen.fullName, official252.fullName, report.status, submittedAt),
    });

    await prisma.incidentEvidence.deleteMany({ where: { reportId: report.id } });

    const evidenceRows: Array<{
      id: string;
      reportId: string;
      kind: string;
      storageProvider: string;
      storagePath: string;
      publicUrl: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: Date;
    }> = [];

    for (let index = 0; index < report.photoCount; index += 1) {
      evidenceRows.push({
        id: `ss-evi-${report.id}-photo-${index + 1}`,
        reportId: report.id,
        kind: "photo",
        storageProvider: "seed",
        storagePath: `seed/screenshots/${report.id}/photo-${index + 1}.jpg`,
        publicUrl: `https://picsum.photos/seed/${encodeURIComponent(report.id)}-${index + 1}/1200/800`,
        fileName: `evidence-${report.id}-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: 180000,
        createdAt: new Date(submittedAt.getTime() + (index + 1) * 60 * 1000),
      });
    }

    if (report.hasAudio) {
      evidenceRows.push({
        id: `ss-evi-${report.id}-audio-1`,
        reportId: report.id,
        kind: "audio",
        storageProvider: "seed",
        storagePath: `seed/screenshots/${report.id}/audio-1.webm`,
        publicUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav",
        fileName: `evidence-${report.id}-voice.webm`,
        mimeType: "audio/webm",
        sizeBytes: 560000,
        createdAt: new Date(submittedAt.getTime() + 5 * 60 * 1000),
      });
    }

    if (evidenceRows.length > 0) {
      await prisma.incidentEvidence.createMany({ data: evidenceRows });
    }
  }

  const boundaryReportId = "SS-2026-0005";
  await prisma.crossBorderAlert.upsert({
    where: {
      reportId_targetBarangayCode: {
        reportId: boundaryReportId,
        targetBarangayCode: "251",
      },
    },
    update: {
      sourceBarangayCode: "252",
      alertReason: "Incident reported near shared jurisdiction boundary.",
      readAt: null,
      createdAt: new Date(BASE.getTime() - 2 * HOURS),
    },
    create: {
      reportId: boundaryReportId,
      sourceBarangayCode: "252",
      targetBarangayCode: "251",
      alertReason: "Incident reported near shared jurisdiction boundary.",
      readAt: null,
      createdAt: new Date(BASE.getTime() - 2 * HOURS),
    },
  });

  await prisma.crossBorderAlert.upsert({
    where: {
      reportId_targetBarangayCode: {
        reportId: boundaryReportId,
        targetBarangayCode: "256",
      },
    },
    update: {
      sourceBarangayCode: "252",
      alertReason: "Incident reported near shared jurisdiction boundary.",
      readAt: null,
      createdAt: new Date(BASE.getTime() - 2 * HOURS),
    },
    create: {
      reportId: boundaryReportId,
      sourceBarangayCode: "252",
      targetBarangayCode: "256",
      alertReason: "Incident reported near shared jurisdiction boundary.",
      readAt: null,
      createdAt: new Date(BASE.getTime() - 2 * HOURS),
    },
  });

  const superAdmin = usersByPhone.get("09170000001");
  if (!superAdmin) {
    throw new Error("Super admin account is missing.");
  }

  const auditEvents = [
    {
      id: "ss-audit-001",
      action: "ADMIN_USER_ROLE_UPDATED",
      targetType: "USER",
      targetId: usersByPhone.get("09170000024")?.id ?? null,
      targetLabel: "Role assignment",
      details: JSON.stringify({ source: "screenshot-seed", note: "Assigned official support role for drill." }),
      createdAt: new Date(BASE.getTime() - 4 * HOURS),
    },
    {
      id: "ss-audit-002",
      action: "ADMIN_ANALYTICS_VIEWED",
      targetType: "SYSTEM",
      targetId: null,
      targetLabel: "Analytics overview",
      details: JSON.stringify({ source: "screenshot-seed", note: "Reviewed city-wide dashboard." }),
      createdAt: new Date(BASE.getTime() - 3 * HOURS),
    },
    {
      id: "ss-audit-003",
      action: "ADMIN_BARANGAY_BOUNDARY_UPDATED",
      targetType: "BARANGAY",
      targetId: barangayByCode.get("252")?.id ?? null,
      targetLabel: "Boundary update",
      details: JSON.stringify({ source: "screenshot-seed", note: "Boundary sync check completed." }),
      createdAt: new Date(BASE.getTime() - 90 * 60 * 1000),
    },
  ];

  for (const log of auditEvents) {
    await prisma.adminAuditLog.upsert({
      where: { id: log.id },
      update: {
        actorUserId: superAdmin.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetLabel: log.targetLabel,
        details: log.details,
        createdAt: log.createdAt,
      },
      create: {
        id: log.id,
        actorUserId: superAdmin.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetLabel: log.targetLabel,
        details: log.details,
        createdAt: log.createdAt,
      },
    });
  }

  console.log("Screenshot-focused seed complete.");
  console.log("Demo password for all listed accounts: Password123!");
  console.log("- Super Admin: 09170000001");
  console.log("- Official 251: 09170000011");
  console.log("- Official 252: 09170000012");
  console.log("- Official 256: 09170000013");
  console.log("- Citizen 251: 09170000021");
  console.log("- Citizen 252: 09170000022");
  console.log("- Citizen 256: 09170000023");
  console.log("Guaranteed data included:");
  console.log("- Citizen reports with Submitted and Resolved statuses");
  console.log("- Official queue records across multiple statuses");
  console.log("- Heatmap-ready cluster in Barangay 252 (>= threshold)");
  console.log("- Cross-border alerts from Barangay 252 to 251 and 256");
  console.log("- Super admin audit logs and role-distributed users");
}

let hasFailed = false;

main()
  .catch((error) => {
    hasFailed = true;
    console.error("Screenshot seed failed:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (hasFailed) {
      throw new Error("Screenshot seed execution failed.");
    }
  });
