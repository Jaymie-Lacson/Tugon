import bcrypt from "bcryptjs";
import { PrismaClient, ReportSeverity, Role, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

const TOTAL_USERS = 30;
const TOTAL_REPORTS = 60;
const PASSWORD_PLAIN = "Password123!";
const MEDIATION_WARNING =
  "Filing this report requires both parties to attend a face-to-face mediation hearing at the barangay hall.";

const TARGET_ROLE_COUNTS: Record<Role, number> = {
  [Role.CITIZEN]: 26,
  [Role.OFFICIAL]: 3,
  [Role.SUPER_ADMIN]: 1,
};

type BarangaySeed = {
  id: string;
  code: string;
  name: string;
  centerLat: number;
  centerLng: number;
};

const BARANGAYS: BarangaySeed[] = [
  { id: "seed-brgy-251", code: "251", name: "Barangay 251", centerLat: 14.61448, centerLng: 120.97756 },
  { id: "seed-brgy-252", code: "252", name: "Barangay 252", centerLat: 14.61442, centerLng: 120.97696 },
  { id: "seed-brgy-256", code: "256", name: "Barangay 256", centerLat: 14.61558, centerLng: 120.97883 },
];

type CategorySeed = {
  category: string;
  requiresMediation: boolean;
  subcategories: string[];
};

const CATEGORIES: CategorySeed[] = [
  {
    category: "Garbage and Sanitation",
    requiresMediation: false,
    subcategories: ["Uncollected trash", "Illegal dumping", "Clogged canals", "Dead animals"],
  },
  {
    category: "Public Disturbance",
    requiresMediation: false,
    subcategories: ["Loud noises or late-night karaoke", "Drinking in public streets", "Loitering"],
  },
  {
    category: "Road and Street Issues",
    requiresMediation: false,
    subcategories: ["Broken streetlights", "Illegal parking", "Blocked sidewalks", "Potholes"],
  },
  {
    category: "Hazards and Safety",
    requiresMediation: false,
    subcategories: ["Dangling or sparking electric wires", "Stray or aggressive animals", "Fire hazards"],
  },
  {
    category: "Neighbor Disputes / Lupon",
    requiresMediation: true,
    subcategories: [
      "Petty quarrels and fighting",
      "Unpaid personal debts",
      "Gossip and slander",
      "Property boundary disputes",
    ],
  },
  {
    category: "Others",
    requiresMediation: false,
    subcategories: ["Unlisted general issues"],
  },
];

const STATUS_WEIGHTS: Array<{ status: TicketStatus; weight: number }> = [
  { status: TicketStatus.SUBMITTED, weight: 30 },
  { status: TicketStatus.UNDER_REVIEW, weight: 20 },
  { status: TicketStatus.IN_PROGRESS, weight: 20 },
  { status: TicketStatus.RESOLVED, weight: 18 },
  { status: TicketStatus.CLOSED, weight: 8 },
  { status: TicketStatus.UNRESOLVABLE, weight: 4 },
];

const SEVERITY_WEIGHTS: Array<{ severity: ReportSeverity; weight: number }> = [
  { severity: ReportSeverity.low, weight: 40 },
  { severity: ReportSeverity.medium, weight: 30 },
  { severity: ReportSeverity.high, weight: 20 },
  { severity: ReportSeverity.critical, weight: 10 },
];

const FIRST_NAMES = [
  "Juan",
  "Maria",
  "Jose",
  "Ana",
  "Mark",
  "Carla",
  "Paolo",
  "Lea",
  "Rico",
  "Liza",
  "Rafael",
  "Angela",
  "Miguel",
  "Patricia",
  "Carlo",
  "Bianca",
];

const LAST_NAMES = [
  "Dela Cruz",
  "Santos",
  "Reyes",
  "Mendoza",
  "Garcia",
  "Bautista",
  "Torres",
  "Navarro",
  "Flores",
  "Castro",
  "Ramos",
  "Villanueva",
  "Aquino",
  "Domingo",
  "Pascual",
  "Salazar",
];

const OFFICIAL_POSITIONS = ["Barangay Kagawad", "SK Chairperson", "Peace and Order Officer"];

const FIXED_DEMO_USERS: Array<{
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  barangayCode?: string;
}> = [
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
  },
  {
    id: "seed-user-official-252",
    fullName: "Demo Official 252",
    phoneNumber: "09170000012",
    role: Role.OFFICIAL,
    barangayCode: "252",
  },
  {
    id: "seed-user-official-256",
    fullName: "Demo Official 256",
    phoneNumber: "09170000013",
    role: Role.OFFICIAL,
    barangayCode: "256",
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
];

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(251252256);

function pickOne<T>(items: T[]): T {
  const index = Math.floor(rand() * items.length);
  return items[index];
}

function pickWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rand() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1].value;
}

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const delta = Math.floor(rand() * days * 24 * 60 * 60 * 1000);
  return new Date(now - delta);
}

function shiftMinutes(date: Date, minMinutes: number, maxMinutes: number): Date {
  const minutes = minMinutes + Math.floor(rand() * (maxMinutes - minMinutes + 1));
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function boundedCoordinate(base: number, jitter: number): number {
  return Number((base + (rand() * 2 - 1) * jitter).toFixed(6));
}

function getBarangayByCode(code: string): BarangaySeed {
  const found = BARANGAYS.find((b) => b.code === code);
  if (!found) {
    throw new Error(`Missing barangay code ${code}`);
  }
  return found;
}

function buildStatusHistory(
  reportId: string,
  submittedAt: Date,
  status: TicketStatus,
  citizenName: string,
  officialActor: string,
): Array<{
  reportId: string;
  status: TicketStatus;
  label: string;
  description: string;
  actor: string;
  actorRole: string;
  note: string | null;
  createdAt: Date;
}> {
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
    {
      reportId,
      status: TicketStatus.SUBMITTED,
      label: "Received by System",
      description: `Report logged with tracking number ${reportId}.`,
      actor: "TUGON System",
      actorRole: "Automated",
      note: null,
      createdAt: shiftMinutes(submittedAt, 1, 8),
    },
  ];

  if (status === TicketStatus.SUBMITTED) {
    return entries;
  }

  const underReviewAt = shiftMinutes(entries[entries.length - 1].createdAt, 30, 720);
  entries.push({
    reportId,
    status: TicketStatus.UNDER_REVIEW,
    label: "Under Review",
    description: "Official has started reviewing this report.",
    actor: officialActor,
    actorRole: "Official",
    note: null,
    createdAt: underReviewAt,
  });

  if (status === TicketStatus.UNDER_REVIEW) {
    return entries;
  }

  if (status === TicketStatus.UNRESOLVABLE) {
    entries.push({
      reportId,
      status: TicketStatus.UNRESOLVABLE,
      label: "Unresolvable",
      description: "Official marked this report as unresolvable.",
      actor: officialActor,
      actorRole: "Official",
      note: "Insufficient verifiable evidence from involved parties.",
      createdAt: shiftMinutes(underReviewAt, 60, 1440),
    });
    return entries;
  }

  const inProgressAt = shiftMinutes(underReviewAt, 30, 720);
  entries.push({
    reportId,
    status: TicketStatus.IN_PROGRESS,
    label: "In Progress",
    description: "Official action is in progress for this report.",
    actor: officialActor,
    actorRole: "Official",
    note: null,
    createdAt: inProgressAt,
  });

  if (status === TicketStatus.IN_PROGRESS) {
    return entries;
  }

  const resolvedAt = shiftMinutes(inProgressAt, 60, 2880);
  entries.push({
    reportId,
    status: TicketStatus.RESOLVED,
    label: "Resolved",
    description: "Official marked this report as resolved.",
    actor: officialActor,
    actorRole: "Official",
    note: "Action completed and documented by barangay team.",
    createdAt: resolvedAt,
  });

  if (status === TicketStatus.RESOLVED) {
    return entries;
  }

  entries.push({
    reportId,
    status: TicketStatus.CLOSED,
    label: "Closed",
    description: "Official closed this report after resolution.",
    actor: officialActor,
    actorRole: "Official",
    note: "Case archived after confirmation.",
    createdAt: shiftMinutes(resolvedAt, 120, 4320),
  });

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

  const generatedUsers: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    role: Role;
    barangayCode?: string;
  }> = [];

  const currentCounts: Record<Role, number> = {
    [Role.CITIZEN]: FIXED_DEMO_USERS.filter((user) => user.role === Role.CITIZEN).length,
    [Role.OFFICIAL]: FIXED_DEMO_USERS.filter((user) => user.role === Role.OFFICIAL).length,
    [Role.SUPER_ADMIN]: FIXED_DEMO_USERS.filter((user) => user.role === Role.SUPER_ADMIN).length,
  };

  let generatedIndex = 1;
  const makeGeneratedName = () => `${pickOne(FIRST_NAMES)} ${pickOne(LAST_NAMES)}`;

  while (currentCounts[Role.CITIZEN] < TARGET_ROLE_COUNTS[Role.CITIZEN]) {
    const barangay = pickOne(BARANGAYS);
    const id = `seed-user-citizen-${String(generatedIndex).padStart(3, "0")}`;
    generatedUsers.push({
      id,
      fullName: makeGeneratedName(),
      phoneNumber: `0918${String(100000 + generatedIndex).slice(-6)}`,
      role: Role.CITIZEN,
      barangayCode: barangay.code,
    });
    generatedIndex += 1;
    currentCounts[Role.CITIZEN] += 1;
  }

  const allUsers = [...FIXED_DEMO_USERS, ...generatedUsers].slice(0, TOTAL_USERS);

  for (const user of allUsers) {
    await prisma.user.upsert({
      where: { phoneNumber: user.phoneNumber },
      update: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        isPhoneVerified: true,
        passwordHash,
      },
      create: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isPhoneVerified: true,
        passwordHash,
      },
    });

    if (user.role === Role.CITIZEN && user.barangayCode) {
      const barangay = getBarangayByCode(user.barangayCode);
      await prisma.citizenProfile.upsert({
        where: { userId: user.id },
        update: {
          barangayId: barangay.id,
          address: `Blk ${Math.floor(rand() * 30) + 1}, Barangay ${barangay.code}, Tondo, Manila`,
        },
        create: {
          id: `seed-cprofile-${user.id}`,
          userId: user.id,
          barangayId: barangay.id,
          address: `Blk ${Math.floor(rand() * 30) + 1}, Barangay ${barangay.code}, Tondo, Manila`,
        },
      });
    }

    if (user.role === Role.OFFICIAL && user.barangayCode) {
      const barangay = getBarangayByCode(user.barangayCode);
      await prisma.officialProfile.upsert({
        where: { userId: user.id },
        update: {
          barangayId: barangay.id,
          position: pickOne(OFFICIAL_POSITIONS),
        },
        create: {
          id: `seed-oprofile-${user.id}`,
          userId: user.id,
          barangayId: barangay.id,
          position: pickOne(OFFICIAL_POSITIONS),
        },
      });
    }
  }

  const citizenUsers = allUsers.filter((user) => user.role === Role.CITIZEN && user.barangayCode);
  const officialUsers = allUsers.filter((user) => user.role === Role.OFFICIAL && user.barangayCode);
  const superAdminUser = allUsers.find((user) => user.role === Role.SUPER_ADMIN);

  const luponTarget = Math.max(1, Math.round(TOTAL_REPORTS * 0.08));
  let luponAssigned = 0;

  for (let index = 1; index <= TOTAL_REPORTS; index += 1) {
    const reportId = `RPT-SEED-${String(index).padStart(4, "0")}`;
    const citizen = pickOne(citizenUsers);
    const barangay = getBarangayByCode(citizen.barangayCode!);

    const shouldUseLupon = luponAssigned < luponTarget && rand() < 0.22;
    const categorySeed = shouldUseLupon
      ? CATEGORIES.find((entry) => entry.category === "Neighbor Disputes / Lupon")!
      : pickOne(CATEGORIES.filter((entry) => entry.category !== "Neighbor Disputes / Lupon"));

    if (categorySeed.category === "Neighbor Disputes / Lupon") {
      luponAssigned += 1;
    }

    const category = categorySeed.category;
    const subcategory = pickOne(categorySeed.subcategories);
    const requiresMediation = categorySeed.requiresMediation;
    const mediationWarning = requiresMediation ? MEDIATION_WARNING : null;

    const status = pickWeighted(
      STATUS_WEIGHTS.map((item) => ({ value: item.status, weight: item.weight })),
    );
    const severity = pickWeighted(
      SEVERITY_WEIGHTS.map((item) => ({ value: item.severity, weight: item.weight })),
    );

    const submittedAt = randomDateWithinLastDays(90);
    const updatedAt = shiftMinutes(submittedAt, 30, 7200);

    const latitude = boundedCoordinate(barangay.centerLat, 0.00065);
    const longitude = boundedCoordinate(barangay.centerLng, 0.00065);

    const hasPhotos = rand() < 0.65;
    const photoCount = hasPhotos ? Math.max(1, Math.floor(rand() * 4)) : 0;
    const hasAudio = rand() < 0.35;

    const assignedOfficial =
      status === TicketStatus.SUBMITTED ? null : pickOne(officialUsers).fullName;

    const affectedCount = rand() < 0.55 ? String(Math.floor(rand() * 12) + 1) : null;

    const description = `${subcategory} reported near Barangay ${barangay.code}. Incident requires barangay coordination and follow-up actions.`;

    await prisma.citizenReport.upsert({
      where: { id: reportId },
      update: {
        citizenUserId: citizen.id,
        routedBarangayCode: barangay.code,
        latitude,
        longitude,
        category,
        subcategory,
        requiresMediation,
        mediationWarning,
        status,
        location: `Street ${Math.floor(rand() * 18) + 1}, Barangay ${barangay.code}, Tondo, Manila`,
        barangay: barangay.name,
        district: `Barangay ${barangay.code}`,
        description,
        severity,
        affectedCount,
        submittedAt,
        updatedAt,
        hasPhotos,
        photoCount,
        hasAudio,
        assignedOfficer: assignedOfficial,
        assignedUnit: assignedOfficial ? "Barangay Response Unit" : null,
        resolutionNote:
          status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
            ? "Action completed by responding officials."
            : status === TicketStatus.UNRESOLVABLE
              ? "Case marked unresolvable after field validation."
              : null,
      },
      create: {
        id: reportId,
        citizenUserId: citizen.id,
        routedBarangayCode: barangay.code,
        latitude,
        longitude,
        category,
        subcategory,
        requiresMediation,
        mediationWarning,
        status,
        location: `Street ${Math.floor(rand() * 18) + 1}, Barangay ${barangay.code}, Tondo, Manila`,
        barangay: barangay.name,
        district: `Barangay ${barangay.code}`,
        description,
        severity,
        affectedCount,
        submittedAt,
        updatedAt,
        hasPhotos,
        photoCount,
        hasAudio,
        assignedOfficer: assignedOfficial,
        assignedUnit: assignedOfficial ? "Barangay Response Unit" : null,
        resolutionNote:
          status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
            ? "Action completed by responding officials."
            : status === TicketStatus.UNRESOLVABLE
              ? "Case marked unresolvable after field validation."
              : null,
      },
    });

    const history = buildStatusHistory(
      reportId,
      submittedAt,
      status,
      citizen.fullName,
      assignedOfficial ?? "Assigned Official",
    );

    await prisma.ticketStatusHistory.deleteMany({ where: { reportId } });
    await prisma.ticketStatusHistory.createMany({ data: history });

    const shouldCreateAlert = rand() < 0.32;
    await prisma.crossBorderAlert.deleteMany({ where: { reportId } });
    if (shouldCreateAlert) {
      const neighborTargets = BARANGAYS.filter((item) => item.code !== barangay.code);
      const target = pickOne(neighborTargets);
      await prisma.crossBorderAlert.create({
        data: {
          reportId,
          sourceBarangayCode: barangay.code,
          targetBarangayCode: target.code,
          alertReason: "Incident reported near shared jurisdiction boundary.",
          readAt: rand() < 0.5 ? shiftMinutes(submittedAt, 180, 4320) : null,
          createdAt: shiftMinutes(submittedAt, 10, 180),
        },
      });
    }
  }

  if (superAdminUser) {
    for (let i = 1; i <= 18; i += 1) {
      const action =
        i % 3 === 0
          ? "ADMIN_USER_ROLE_UPDATED"
          : i % 2 === 0
            ? "ADMIN_BARANGAY_BOUNDARY_UPDATED"
            : "ADMIN_ANALYTICS_VIEWED";
      await prisma.adminAuditLog.upsert({
        where: { id: `seed-audit-${String(i).padStart(3, "0")}` },
        update: {
          actorUserId: superAdminUser.id,
          action,
          targetType: action === "ADMIN_USER_ROLE_UPDATED" ? "USER" : "BARANGAY",
          targetId: action === "ADMIN_USER_ROLE_UPDATED" ? pickOne(allUsers).id : pickOne(BARANGAYS).id,
          targetLabel: action === "ADMIN_USER_ROLE_UPDATED" ? "Role assignment" : "Boundary update",
          details: JSON.stringify({ source: "seed-script", index: i }),
          createdAt: randomDateWithinLastDays(90),
        },
        create: {
          id: `seed-audit-${String(i).padStart(3, "0")}`,
          actorUserId: superAdminUser.id,
          action,
          targetType: action === "ADMIN_USER_ROLE_UPDATED" ? "USER" : "BARANGAY",
          targetId: action === "ADMIN_USER_ROLE_UPDATED" ? pickOne(allUsers).id : pickOne(BARANGAYS).id,
          targetLabel: action === "ADMIN_USER_ROLE_UPDATED" ? "Role assignment" : "Boundary update",
          details: JSON.stringify({ source: "seed-script", index: i }),
          createdAt: randomDateWithinLastDays(90),
        },
      });
    }
  }

  console.log("Mock seed complete.");
  console.log(`Users upserted: ${allUsers.length}`);
  console.log(`Reports upserted: ${TOTAL_REPORTS}`);
  console.log("Demo password for all users: Password123!");
  console.log("Demo login phones:");
  console.log("- Super Admin: 09170000001");
  console.log("- Official 251: 09170000011");
  console.log("- Official 252: 09170000012");
  console.log("- Official 256: 09170000013");
  console.log("- Citizen 251: 09170000021");
  console.log("- Citizen 252: 09170000022");
  console.log("- Citizen 256: 09170000023");
}

let seedFailed = false;

main()
  .catch((error) => {
    seedFailed = true;
    console.error("Seed failed:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (seedFailed) {
      throw new Error("Seed execution failed.");
    }
  });
