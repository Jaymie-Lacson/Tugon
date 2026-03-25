import {
  Prisma,
  ReportSeverity as PrismaReportSeverity,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { geofencingService } from "../map/geofencing.service.js";
import { evidenceStorageService } from "./evidenceStorage.service.js";
import { reportsStore } from "./store.js";
import {
  getCategoryMetadata,
  isValidCategorySubcategoryPair,
  isValidReportCategory,
  isValidReportSubcategory,
  type ReportCategory,
  type ReportSubcategory,
} from "./taxonomy.js";
import type { Role } from "../auth/types.js";
import type {
  CrossBorderAlertRecord,
  CitizenReportRecord,
  CreateCitizenReportInput,
  HeatmapClusterRecord,
  HeatmapQueryInput,
  ReportSeverity,
  TicketStatus,
} from "./types.js";

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
const REPORT_TEMPLATE_IDS = [
  "daily-ops",
  "incident-summary",
  "resource-deployment",
  "critical-incidents",
  "barangay-profile",
  "trend-analysis",
] as const;

type ReportTemplateId = (typeof REPORT_TEMPLATE_IDS)[number];
const DSS_ACTION_TYPES = ["APPROVE_DISPATCH", "DISMISS"] as const;
type DssActionType = (typeof DSS_ACTION_TYPES)[number];

type DssRecommendationPriority = "critical" | "high" | "medium" | "info";

export interface DssRecommendationRecord {
  id: string;
  priority: DssRecommendationPriority;
  title: string;
  description: string;
  actions: string[];
  confidence: number;
  source: string;
}


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

const toPrismaStatusMap: Record<TicketStatus, PrismaTicketStatus> = {
  "Submitted": PrismaTicketStatus.SUBMITTED,
  "Under Review": PrismaTicketStatus.UNDER_REVIEW,
  "In Progress": PrismaTicketStatus.IN_PROGRESS,
  "Resolved": PrismaTicketStatus.RESOLVED,
  "Closed": PrismaTicketStatus.CLOSED,
  "Unresolvable": PrismaTicketStatus.UNRESOLVABLE,
};

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  "Submitted": ["Under Review", "Unresolvable"],
  "Under Review": ["In Progress", "Resolved", "Unresolvable"],
  "In Progress": ["Resolved", "Unresolvable"],
  "Resolved": ["Closed", "In Progress"],
  "Closed": [],
  "Unresolvable": [],
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

function isReportTemplateId(value: string): value is ReportTemplateId {
  return (REPORT_TEMPLATE_IDS as readonly string[]).includes(value);
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function xmlEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSingleReportExcelXml(report: CitizenReportRecord): string {
  const rows: Array<[string, string]> = [
    ["Report ID", report.id],
    ["Status", report.status],
    ["Category", report.category],
    ["Subcategory", report.subcategory],
    ["Severity", report.severity],
    ["Barangay", report.barangay],
    ["Location", report.location],
    ["Submitted At", report.submittedAt],
    ["Updated At", report.updatedAt],
    ["Description", report.description],
    ["Photos", String(report.photoCount)],
    ["Audio", report.hasAudio ? "yes" : "no"],
  ];

  const xmlRows = rows
    .map(
      ([label, value]) =>
        `<Row><Cell ss:StyleID="label"><Data ss:Type="String">${xmlEscape(label)}</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell></Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="label">
   <Font ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Report Detail">
  <Table>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

function buildTemplateBody(templateId: ReportTemplateId, reports: CitizenReportRecord[], generatedAt: string): string {
  const byStatus = new Map<string, number>();
  const bySeverity = new Map<string, number>();
  const byBarangay = new Map<string, number>();
  const byCategory = new Map<string, number>();
  let respondersTotal = 0;
  let criticalCount = 0;

  for (const report of reports) {
    byStatus.set(report.status, (byStatus.get(report.status) ?? 0) + 1);
    bySeverity.set(report.severity, (bySeverity.get(report.severity) ?? 0) + 1);
    byBarangay.set(report.barangay, (byBarangay.get(report.barangay) ?? 0) + 1);
    byCategory.set(report.category, (byCategory.get(report.category) ?? 0) + 1);
    respondersTotal += report.assignedUnit ? 1 : 0;
    if (report.severity === "critical") {
      criticalCount += 1;
    }
  }

  const topBarangay = [...byBarangay.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const unresolved = reports.filter((report) => report.status !== "Resolved" && report.status !== "Closed").length;

  const lines: string[] = [
    "TUGON Official Report",
    `Template: ${templateId}`,
    `Generated At: ${generatedAt}`,
    `Total Incidents: ${reports.length}`,
    "",
  ];

  if (templateId === "daily-ops") {
    lines.push("Daily Operations Summary");
    lines.push(`Unresolved Queue: ${unresolved}`);
    lines.push(`Critical Incidents: ${criticalCount}`);
    lines.push(`Responder Assignments: ${respondersTotal}`);
  }

  if (templateId === "incident-summary") {
    lines.push("Incident Breakdown by Category");
    for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${category}: ${count}`);
    }
  }

  if (templateId === "resource-deployment") {
    lines.push("Resource Deployment Snapshot");
    lines.push(`Reports with Assigned Unit: ${respondersTotal}`);
    lines.push(`Reports without Assignment: ${Math.max(0, reports.length - respondersTotal)}`);
  }

  if (templateId === "critical-incidents") {
    lines.push("Critical Incident Detail");
    for (const report of reports.filter((item) => item.severity === "critical").slice(0, 10)) {
      lines.push(`- ${report.id} | ${report.status} | ${report.location}`);
    }
  }

  if (templateId === "barangay-profile") {
    lines.push("Barangay Risk Profile");
    if (topBarangay) {
      lines.push(`Top Barangay by Volume: ${topBarangay[0]} (${topBarangay[1]})`);
    }
    for (const [barangay, count] of [...byBarangay.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${barangay}: ${count}`);
    }
  }

  if (templateId === "trend-analysis") {
    lines.push("Trend Analysis Highlights");
    if (topCategory) {
      lines.push(`Top Category: ${topCategory[0]} (${topCategory[1]})`);
    }
    for (const [status, count] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${status}: ${count}`);
    }
  }

  lines.push("");
  lines.push("Severity Distribution");
  for (const [severity, count] of [...bySeverity.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${severity}: ${count}`);
  }

  lines.push("");
  lines.push("Recent Incidents");
  for (const report of reports.slice(0, 15)) {
    lines.push(`- ${report.id} | ${report.status} | ${report.barangay} | ${report.location}`);
  }

  return lines.join("\n");
}

function buildHistoryCsv(reports: CitizenReportRecord[]): string {
  const header = [
    "Report ID",
    "Status",
    "Category",
    "Subcategory",
    "Severity",
    "Barangay",
    "Location",
    "Submitted At",
    "Updated At",
    "Photos",
    "Audio",
  ];

  const rows = reports.map((report) => [
    report.id,
    report.status,
    report.category,
    report.subcategory,
    report.severity,
    report.barangay,
    report.location,
    report.submittedAt,
    report.updatedAt,
    String(report.photoCount),
    report.hasAudio ? "yes" : "no",
  ]);

  return [header, ...rows].map((columns) => columns.map((value) => csvEscape(value)).join(",")).join("\n");
}

function normalizeDssRecommendations(input: unknown): DssRecommendationRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowedPriorities: DssRecommendationPriority[] = ["critical", "high", "medium", "info"];

  return input
    .map((item, index) => {
      const row = item as {
        priority?: unknown;
        title?: unknown;
        description?: unknown;
        actions?: unknown;
        confidence?: unknown;
        source?: unknown;
      };

      const priority = typeof row.priority === "string" ? row.priority.toLowerCase() : "info";
      const normalizedPriority = allowedPriorities.includes(priority as DssRecommendationPriority)
        ? (priority as DssRecommendationPriority)
        : "info";
      const title = typeof row.title === "string" ? row.title.trim() : "Recommendation";
      const description = typeof row.description === "string" ? row.description.trim() : "";
      const actions = Array.isArray(row.actions)
        ? row.actions.filter((action): action is string => typeof action === "string" && action.trim().length > 0)
        : [];
      const confidenceRaw = Number(row.confidence);
      const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
        : 60;
      const source = typeof row.source === "string" && row.source.trim() ? row.source.trim() : "AI Decision Model";

      if (!title || !description || actions.length === 0) {
        return null;
      }

      return {
        id: `ai-${index + 1}`,
        priority: normalizedPriority,
        title,
        description,
        actions: actions.slice(0, 4),
        confidence,
        source,
      } satisfies DssRecommendationRecord;
    })
    .filter((item): item is DssRecommendationRecord => Boolean(item))
    .slice(0, 4);
}

function buildFallbackDssRecommendations(reports: CitizenReportRecord[]): DssRecommendationRecord[] {
  if (reports.length === 0) {
    return [];
  }

  const now = Date.now();
  const unresolved = reports.filter((report) => report.status !== "Resolved" && report.status !== "Closed");
  const criticalUnresolved = unresolved.filter((report) => report.severity === "critical");
  const unresolvedOlderThan24h = unresolved.filter(
    (report) => now - new Date(report.submittedAt).getTime() >= 24 * 60 * 60 * 1000,
  );
  const recentWeek = reports.filter((report) => now - new Date(report.submittedAt).getTime() <= 7 * 24 * 60 * 60 * 1000);

  const byBarangay = new Map<string, number>();
  for (const report of recentWeek) {
    byBarangay.set(report.barangay, (byBarangay.get(report.barangay) ?? 0) + 1);
  }
  const topBarangay = [...byBarangay.entries()].sort((a, b) => b[1] - a[1])[0];

  const respondersTotal = reports.reduce((sum, report) => sum + (report.assignedUnit ? 1 : 0), 0);
  const assignedRate = reports.length > 0 ? Math.round((respondersTotal / reports.length) * 100) : 0;

  const recommendations: DssRecommendationRecord[] = [];

  if (criticalUnresolved.length > 0) {
    recommendations.push({
      id: "fallback-1",
      priority: "critical",
      title: "Critical Incidents Need Immediate Action",
      description: `${criticalUnresolved.length} critical incident${criticalUnresolved.length > 1 ? "s are" : " is"} still unresolved in your queue. Prioritize verification and dispatch to reduce escalation risk.`,
      actions: [
        "Escalate critical queue to duty officer",
        "Confirm responder assignment for each critical case",
        "Publish barangay situational update for ongoing risks",
      ],
      confidence: Math.min(95, 70 + criticalUnresolved.length * 5),
      source: "Operational Rules Engine",
    });
  }

  if (topBarangay) {
    recommendations.push({
      id: "fallback-2",
      priority: "high",
      title: "Weekly Hotspot Concentration Detected",
      description: `${topBarangay[0]} logged ${topBarangay[1]} incident${topBarangay[1] > 1 ? "s" : ""} in the last 7 days. Plan targeted patrol and preventive advisories.`,
      actions: [
        "Increase field monitoring in hotspot puroks",
        "Coordinate with barangay tanod for peak-hour visibility",
        "Issue focused community safety advisory",
      ],
      confidence: Math.min(92, 55 + topBarangay[1] * 6),
      source: "7-Day Incident Distribution",
    });
  }

  recommendations.push({
    id: "fallback-3",
    priority: "medium",
    title: "Responder Assignment Coverage",
    description: `${respondersTotal} responder assignment${respondersTotal !== 1 ? "s" : ""} recorded across ${reports.length} reports. Current assignment intensity is ${assignedRate}%.`,
    actions: [
      "Review unresolved reports without assigned responders",
      "Balance assignment load across ongoing incidents",
      "Document reassignment for shift handover",
    ],
    confidence: Math.min(90, 50 + Math.round(assignedRate * 0.4)),
    source: "Responder Utilization Metrics",
  });

  if (unresolvedOlderThan24h.length > 0) {
    recommendations.push({
      id: "fallback-4",
      priority: "high",
      title: "Aging Unresolved Reports",
      description: `${unresolvedOlderThan24h.length} unresolved report${unresolvedOlderThan24h.length > 1 ? "s are" : " is"} older than 24 hours. Prioritize reassessment to prevent backlog growth.`,
      actions: [
        "Tag aging incidents for priority reassessment",
        "Assign resolution owner per aging report",
        "Update status notes for pending field verification",
      ],
      confidence: Math.min(94, 60 + unresolvedOlderThan24h.length * 6),
      source: "Queue Aging Monitor",
    });
  }

  return recommendations.slice(0, 4);
}

async function buildAiDssRecommendations(reports: CitizenReportRecord[]): Promise<DssRecommendationRecord[]> {
  if (!env.dssAiEnabled || !env.dssAiApiKey || reports.length === 0) {
    return [];
  }

  const summarizedReports = reports.slice(0, 60).map((report) => ({
    id: report.id,
    status: report.status,
    category: report.category,
    severity: report.severity,
    barangay: report.barangay,
    submittedAt: report.submittedAt,
    hasAssignedUnit: Boolean(report.assignedUnit),
    hasAudio: report.hasAudio,
    photoCount: report.photoCount,
  }));

  const prompt = {
    role: "system",
    content:
      "You are an incident-response decision support assistant for barangay officials. Reply with strict JSON only: {\"recommendations\":[{\"priority\":\"critical|high|medium|info\",\"title\":string,\"description\":string,\"actions\":string[],\"confidence\":number,\"source\":string}]}. Provide 2 to 4 recommendations. Keep actions operational and concise.",
  };

  const userInput = {
    role: "user",
    content: JSON.stringify({
      context: {
        system: "TUGON barangay official dashboard",
        now: new Date().toISOString(),
      },
      reports: summarizedReports,
    }),
  };

  const response = await fetch(env.dssAiProviderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.dssAiApiKey}`,
      ...(env.dssAiHttpReferer ? { "HTTP-Referer": env.dssAiHttpReferer } : {}),
      ...(env.dssAiAppName ? { "X-Title": env.dssAiAppName } : {}),
    },
    body: JSON.stringify({
      model: env.dssAiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [prompt, userInput],
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
      }
    | null;

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return [];
  }

  const parsed = JSON.parse(content) as { recommendations?: unknown };
  return normalizeDssRecommendations(parsed.recommendations);
}

function isDssActionType(value: string): value is DssActionType {
  return (DSS_ACTION_TYPES as readonly string[]).includes(value);
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
  category: string;
  subcategory: string;
  requiresMediation: boolean;
  mediationWarning: string | null;
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
  evidences?: Array<{
    id: string;
    kind: string;
    publicUrl: string | null;
    fileName: string;
    mimeType: string;
    createdAt: Date;
  }>;
  citizen?: {
    isVerified: boolean;
    isBanned: boolean;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  } | null;
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
  const reporterVerificationStatus = row.citizen?.isBanned
    ? "banned"
    : row.citizen?.isVerified
    ? "verified"
    : row.citizen?.verificationStatus === "REJECTED"
    ? "rejected"
    : "pending";

  return {
    id: row.id,
    citizenUserId: row.citizenUserId,
    routedBarangayCode: row.routedBarangayCode,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category as ReportCategory,
    subcategory: row.subcategory as ReportSubcategory,
    requiresMediation: row.requiresMediation,
    mediationWarning: row.mediationWarning,
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
    evidence: (row.evidences ?? [])
      .filter((item) => Boolean(item.publicUrl) && (item.kind === "photo" || item.kind === "audio"))
      .map((item) => ({
        id: item.id,
        kind: item.kind as "photo" | "audio",
        publicUrl: item.publicUrl as string,
        fileName: item.fileName,
        mimeType: item.mimeType,
        createdAt: item.createdAt.toISOString(),
      })),
    reporterVerificationStatus,
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

function validateCreateInput(input: CreateCitizenReportInput): CreateCitizenReportInput & {
  category: ReportCategory;
  subcategory: ReportSubcategory;
  mediationWarning: string | null;
  photos: Array<{
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
    bytes?: Buffer;
  }>;
  audio: {
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
    bytes?: Buffer;
  } | null;
} {
  const category = input.category?.trim();
  const subcategory = input.subcategory?.trim();

  if (!category || !isValidReportCategory(category)) {
    throw new ReportsError("Invalid report category.", 400);
  }

  if (!subcategory || !isValidReportSubcategory(subcategory)) {
    throw new ReportsError("Invalid report subcategory.", 400);
  }

  if (!isValidCategorySubcategoryPair(category, subcategory)) {
    throw new ReportsError("Subcategory does not belong to the selected category.", 400);
  }

  const metadata = getCategoryMetadata(category);
  const warning = metadata.requiresMediation ? metadata.mediationWarning : null;

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

  const photos = Array.isArray(input.photos)
    ? input.photos.filter(
        (item) =>
          (typeof item?.dataUrl === "string" && item.dataUrl.trim().length > 0)
          || Buffer.isBuffer(item?.bytes),
      )
    : [];

  const audio = input.audio
    && (
      (typeof input.audio.dataUrl === "string" && input.audio.dataUrl.trim().length > 0)
      || Buffer.isBuffer(input.audio.bytes)
    )
      ? input.audio
      : null;

  const rawPhotoCount = Number(input.photoCount ?? 0);
  if (Number.isNaN(rawPhotoCount) || rawPhotoCount < 0) {
    throw new ReportsError("Invalid photo count.", 400);
  }

  const effectivePhotoCount = Math.max(rawPhotoCount, photos.length);
  if (effectivePhotoCount < 1) {
    throw new ReportsError("At least one photo evidence is required.", 400);
  }

  const isNoiseRelated = category === "Noise" || subcategory.toLowerCase().includes("noise");
  const hasAnyAudio = Boolean(input.hasAudio || audio);
  if (hasAnyAudio && !isNoiseRelated) {
    throw new ReportsError("Voice recording is only allowed for noise-related incidents.", 400);
  }

  return {
    ...input,
    category,
    subcategory: subcategory as ReportSubcategory,
    mediationWarning: warning,
    location,
    latitude,
    longitude,
    description,
    photoCount: effectivePhotoCount,
    affectedCount: input.affectedCount ?? null,
    photos,
    audio,
  };
}

function validateHeatmapInput(input: HeatmapQueryInput): {
  category?: ReportCategory;
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

  let category: ReportCategory | undefined;
  if (typeof input.category === "string") {
    const candidate = input.category.trim();
    if (!isValidReportCategory(candidate)) {
      throw new ReportsError("Invalid heatmap category filter.", 400);
    }
    category = candidate;
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
    category,
    fromDate: parsedFrom,
    toDate: parsedTo,
    threshold,
    cellSize,
  };
}

// Super Admin must not see the citizenUserId that would allow cross-referencing
// a specific citizen to their report (RA 10173 � Data Privacy Act of 2012).
function anonymizeReportForSuperAdmin(report: CitizenReportRecord): CitizenReportRecord {
  return { ...report, citizenUserId: "[protected]" };
}

function buildSuperAdminNotificationMetadata(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input);
  } catch {
    return "{}";
  }
}

export const reportsService = {
  async create(
    citizenUser: {
      id: string;
      fullName: string;
      barangayCode: string;
      isVerified?: boolean;
      isBanned?: boolean;
      verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
    },
    input: CreateCitizenReportInput,
  ) {
    const validated = validateCreateInput(input);
    let routedBarangay: Awaited<ReturnType<typeof geofencingService.resolveBarangayFromCoordinates>>;

    try {
      routedBarangay = await geofencingService.resolveBarangayFromCoordinates(
        validated.latitude,
        validated.longitude,
      );
    } catch (error) {
      const parsed = geofencingService.parseError(error);
      throw new ReportsError(parsed.message, parsed.status);
    }

    if (routedBarangay.code !== citizenUser.barangayCode) {
      throw new ReportsError(
        `Pinned location belongs to Barangay ${routedBarangay.code}. You can only submit incidents within Barangay ${citizenUser.barangayCode}.`,
        403,
      );
    }

    const now = new Date().toISOString();
    const reportId = reportsStore.nextReportId();
    let nearbyBarangays: Awaited<ReturnType<typeof geofencingService.findNearbyBarangaysForAlert>> = [];

    try {
      nearbyBarangays = await geofencingService.findNearbyBarangaysForAlert(
        validated.latitude,
        validated.longitude,
        routedBarangay.code,
      );
    } catch (error) {
      const parsed = geofencingService.parseError(error);
      throw new ReportsError(parsed.message, parsed.status);
    }

    let uploadedEvidence: Awaited<ReturnType<typeof evidenceStorageService.uploadReportEvidence>> = [];
    try {
      uploadedEvidence = await evidenceStorageService.uploadReportEvidence({
        reportId,
        citizenUserId: citizenUser.id,
        photos: validated.photos,
        audio: validated.audio,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload evidence files.";
      throw new ReportsError(message, 400);
    }

    const metadata = getCategoryMetadata(validated.category);
    const uploadedPhotoCount = uploadedEvidence.filter((item) => item.kind === "photo").length;
    const hasUploadedAudio = uploadedEvidence.some((item) => item.kind === "audio");
    const effectivePhotoCount = uploadedPhotoCount > 0 ? uploadedPhotoCount : validated.photoCount;
    const effectiveHasAudio = hasUploadedAudio || validated.hasAudio;

    const report: CitizenReportRecord = {
      id: reportId,
      citizenUserId: citizenUser.id,
      routedBarangayCode: routedBarangay.code,
      latitude: validated.latitude,
      longitude: validated.longitude,
      category: validated.category,
      subcategory: validated.subcategory,
      requiresMediation: metadata.requiresMediation,
      mediationWarning: metadata.mediationWarning,
      status: "Submitted",
      location: validated.location,
      barangay: routedBarangay.name,
      district: `Barangay ${routedBarangay.code}`,
      description: validated.description,
      severity: validated.severity,
      affectedCount: validated.affectedCount,
      submittedAt: now,
      updatedAt: now,
      hasPhotos: effectivePhotoCount > 0,
      photoCount: effectivePhotoCount,
      hasAudio: effectiveHasAudio,
      assignedOfficer: null,
      assignedUnit: null,
      resolutionNote: null,
      evidence: uploadedEvidence.reduce<CitizenReportRecord["evidence"]>((acc, item, index) => {
        if (!item.publicUrl || (item.kind !== "photo" && item.kind !== "audio")) {
          return acc;
        }

        acc.push({
          id: `${reportId}-evidence-${index + 1}`,
          kind: item.kind,
          publicUrl: item.publicUrl,
          fileName: item.fileName,
          mimeType: item.mimeType,
          createdAt: now,
        });

        return acc;
      }, []),
      reporterVerificationStatus: citizenUser.isBanned
        ? "banned"
        : citizenUser.isVerified
        ? "verified"
        : citizenUser.verificationStatus === "REJECTED"
        ? "rejected"
        : "pending",
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

    const txOperations: Prisma.PrismaPromise<unknown>[] = [
      prisma.citizenReport.upsert({
        where: { id: report.id },
        update: {
          citizenUserId: report.citizenUserId,
          routedBarangayCode: report.routedBarangayCode,
          latitude: report.latitude,
          longitude: report.longitude,
          category: report.category,
          subcategory: report.subcategory,
          requiresMediation: report.requiresMediation,
          mediationWarning: report.mediationWarning,
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
          category: report.category,
          subcategory: report.subcategory,
          requiresMediation: report.requiresMediation,
          mediationWarning: report.mediationWarning,
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
    ];

    const superAdminRecipients = await prisma.user.findMany({
      where: {
        role: "SUPER_ADMIN",
      },
      select: {
        id: true,
      },
    });

    if (superAdminRecipients.length > 0) {
      txOperations.push(
        prisma.adminNotification.createMany({
          data: superAdminRecipients.map((recipient) => ({
            recipientUserId: recipient.id,
            kind: "REPORT_SUBMITTED",
            title: "New Incident Report Submitted",
            message: `${report.category} reported in Barangay ${report.routedBarangayCode} (${report.id}).`,
            reportId: report.id,
            metadata: buildSuperAdminNotificationMetadata({
              category: report.category,
              subcategory: report.subcategory,
              severity: report.severity,
              routedBarangayCode: report.routedBarangayCode,
            }),
          })),
        }),
      );
    }

    if (uploadedEvidence.length > 0) {
      txOperations.push(
        prisma.$executeRaw(Prisma.sql`DELETE FROM "IncidentEvidence" WHERE "reportId" = ${report.id}`),
      );

      for (const evidence of uploadedEvidence) {
        txOperations.push(
          prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO "IncidentEvidence" (
                "id",
                "reportId",
                "kind",
                "storageProvider",
                "storagePath",
                "publicUrl",
                "fileName",
                "mimeType",
                "sizeBytes"
              ) VALUES (
                ${randomUUID()},
                ${report.id},
                ${evidence.kind},
                ${evidence.storageProvider},
                ${evidence.storagePath},
                ${evidence.publicUrl},
                ${evidence.fileName},
                ${evidence.mimeType},
                ${evidence.sizeBytes}
              )
            `,
          ),
        );
      }
    }

    await prisma.$transaction(txOperations);

    return {
      message: "Report submitted successfully.",
      report,
    };
  },

  async listMine(citizenUserId: string): Promise<CitizenReportRecord[]> {
    const persisted = await (prisma.citizenReport as any).findMany({
      where: { citizenUserId },
      include: {
        citizen: {
          select: {
            isVerified: true,
            isBanned: true,
            verificationStatus: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        evidences: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            kind: true,
            publicUrl: true,
            fileName: true,
            mimeType: true,
            createdAt: true,
          },
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

  async cancelMine(citizenUserId: string, reportId: string): Promise<CitizenReportRecord> {
    const existing = await prisma.citizenReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        citizenUserId: true,
        status: true,
        citizen: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!existing || existing.citizenUserId !== citizenUserId) {
      throw new ReportsError("Report not found.", 404);
    }

    if (existing.status !== PrismaTicketStatus.SUBMITTED) {
      throw new ReportsError("Only submitted reports can be cancelled.", 409);
    }

    await prisma.$transaction([
      prisma.citizenReport.update({
        where: { id: reportId },
        data: {
          status: PrismaTicketStatus.CLOSED,
          updatedAt: new Date(),
        },
      }),
      prisma.ticketStatusHistory.create({
        data: {
          reportId,
          status: PrismaTicketStatus.CLOSED,
          label: "Cancelled by Citizen",
          description: "Citizen cancelled this report while it was still in submitted status.",
          actor: existing.citizen?.fullName || "Citizen",
          actorRole: "Citizen",
          note: "Citizen-initiated cancellation before official review.",
        },
      }),
    ]);

    return reportsService.getMineById(citizenUserId, reportId);
  },

  async listForOfficial(user: { role: Role; barangayCode: string | null }): Promise<CitizenReportRecord[]> {
    if (user.role === "OFFICIAL" && !user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    const where = user.role === "OFFICIAL" ? { routedBarangayCode: user.barangayCode! } : {};
    const persisted = await (prisma.citizenReport as any).findMany({
      where,
      include: {
        citizen: {
          select: {
            isVerified: true,
            isBanned: true,
            verificationStatus: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        evidences: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            kind: true,
            publicUrl: true,
            fileName: true,
            mimeType: true,
            createdAt: true,
          },
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
    const persisted = await (prisma.citizenReport as any).findUnique({
      where: { id: reportId },
      include: {
        citizen: {
          select: {
            isVerified: true,
            isBanned: true,
            verificationStatus: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        evidences: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            kind: true,
            publicUrl: true,
            fileName: true,
            mimeType: true,
            createdAt: true,
          },
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
    const superAdminRecipients = await prisma.user.findMany({
      where: {
        role: "SUPER_ADMIN",
        ...(user.role === "SUPER_ADMIN" ? { id: { not: user.id } } : {}),
      },
      select: {
        id: true,
      },
    });

    const txOperations: Prisma.PrismaPromise<unknown>[] = [
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
    ];

    if (superAdminRecipients.length > 0) {
      txOperations.push(
        prisma.adminNotification.createMany({
          data: superAdminRecipients.map((recipient) => ({
            recipientUserId: recipient.id,
            kind: "REPORT_STATUS_UPDATED",
            title: "Incident Status Updated",
            message: `${user.fullName} changed ${reportId} to ${input.status}.`,
            reportId,
            metadata: buildSuperAdminNotificationMetadata({
              actorUserId: user.id,
              actorRole: user.role,
              status: input.status,
              note: note ?? null,
              routedBarangayCode: report.routedBarangayCode,
            }),
          })),
        }),
      );
    }

    await prisma.$transaction(txOperations);

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
            category: true,
            subcategory: true,
            requiresMediation: true,
            mediationWarning: true,
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
        category: alert.report.category as ReportCategory,
        subcategory: alert.report.subcategory as ReportSubcategory,
        requiresMediation: alert.report.requiresMediation,
        mediationWarning: alert.report.mediationWarning,
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
            category: true,
            subcategory: true,
            requiresMediation: true,
            mediationWarning: true,
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
            category: true,
            subcategory: true,
            requiresMediation: true,
            mediationWarning: true,
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
        category: updatedAlert.report.category as ReportCategory,
        subcategory: updatedAlert.report.subcategory as ReportSubcategory,
        requiresMediation: updatedAlert.report.requiresMediation,
        mediationWarning: updatedAlert.report.mediationWarning,
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
      category: ReportCategory | null;
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
      ...(validated.category ? { category: validated.category } : {}),
      submittedAt: {
        gte: validated.fromDate,
        lte: validated.toDate,
      },
    };

    const reports = await prisma.citizenReport.findMany({
      where,
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        routedBarangayCode: true,
        submittedAt: true,
      },
    });

    const clustersMap = new Map<
      string,
      {
        category: string;
        incidentCount: number;
        sumLatitude: number;
        sumLongitude: number;
        barangayCodes: Set<string>;
      }
    >();

    for (const report of reports) {
      const cellLat = Math.floor(report.latitude / validated.cellSize);
      const cellLng = Math.floor(report.longitude / validated.cellSize);
      const key = `${report.category}:${cellLat}:${cellLng}`;
      const existing = clustersMap.get(key);

      if (existing) {
        existing.incidentCount += 1;
        existing.sumLatitude += report.latitude;
        existing.sumLongitude += report.longitude;
        existing.barangayCodes.add(report.routedBarangayCode);
      } else {
        clustersMap.set(key, {
          category: report.category,
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
        category: cluster.category as ReportCategory,
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
        category: validated.category ?? null,
        fromDate: validated.fromDate.toISOString(),
        toDate: validated.toDate.toISOString(),
        threshold: validated.threshold,
        cellSize: validated.cellSize,
      },
    };
  },

  async generateTemplateReport(
    user: { role: Role; barangayCode: string | null },
    templateIdRaw: string,
  ): Promise<{
    templateId: ReportTemplateId;
    generatedAt: string;
    fileName: string;
    content: string;
  }> {
    if (!isReportTemplateId(templateIdRaw)) {
      throw new ReportsError("Invalid report template.", 400);
    }

    const reports = await reportsService.listForOfficial(user);
    const generatedAt = new Date().toISOString();
    const fileName = `tugon-${templateIdRaw}-${generatedAt.slice(0, 10)}.txt`;
    const content = buildTemplateBody(templateIdRaw, reports, generatedAt);

    return {
      templateId: templateIdRaw,
      generatedAt,
      fileName,
      content,
    };
  },

  async exportAllReportsCsv(user: { role: Role; barangayCode: string | null }): Promise<{ fileName: string; csv: string }> {
    const reports = await reportsService.listForOfficial(user);
    const generatedAt = new Date().toISOString();
    return {
      fileName: `tugon-report-history-${generatedAt.slice(0, 10)}.csv`,
      csv: buildHistoryCsv(reports),
    };
  },

  async exportSingleReportExcel(
    user: { role: Role; barangayCode: string | null },
    reportId: string,
  ): Promise<{ fileName: string; content: string }> {
    let report: CitizenReportRecord;
    try {
      report = await reportsService.getForOfficialById(user, reportId);
    } catch (error) {
      const parsed = reportsService.parseError(error);
      const trimmed = reportId.trim();
      const normalizedCandidate = trimmed.startsWith("MY-") ? null : `MY-${trimmed.replace(/^[^0-9A-Za-z]+/, "")}`;

      if (parsed.status !== 404 || !normalizedCandidate) {
        throw error;
      }

      report = await reportsService.getForOfficialById(user, normalizedCandidate);
    }

    const content = buildSingleReportExcelXml(report);

    return {
      fileName: `tugon-${report.id}.xls`,
      content,
    };
  },

  async submitDssAction(
    user: { role: Role; barangayCode: string | null; fullName: string },
    input: {
      actionType: string;
      recommendationTitle: string;
      notes?: string;
    },
  ): Promise<{ actionType: DssActionType; recommendationTitle: string; actedAt: string; actor: string }> {
    if (user.role === "OFFICIAL" && !user.barangayCode) {
      throw new ReportsError("Official barangay profile is required.", 403);
    }

    if (!isDssActionType(input.actionType)) {
      throw new ReportsError("Invalid DSS action type.", 400);
    }

    const recommendationTitle = input.recommendationTitle?.trim();
    if (!recommendationTitle) {
      throw new ReportsError("Recommendation title is required.", 400);
    }

    // Keep DSS actions auditable at API level even when no dedicated table exists yet.
    return {
      actionType: input.actionType,
      recommendationTitle,
      actedAt: new Date().toISOString(),
      actor: user.fullName,
    };
  },

  async getDssRecommendations(user: { role: Role; barangayCode: string | null }): Promise<{ recommendations: DssRecommendationRecord[]; source: "ai" | "fallback" }> {
    const reports = await reportsService.listForOfficial(user);

    try {
      const aiRecommendations = await buildAiDssRecommendations(reports);
      if (aiRecommendations.length > 0) {
        return { recommendations: aiRecommendations, source: "ai" };
      }
    } catch {
      // Ignore AI provider errors and fallback to deterministic recommendations.
    }

    return {
      recommendations: buildFallbackDssRecommendations(reports),
      source: "fallback",
    };
  },

  parseError(error: unknown) {
    const shouldLogInternals = env.nodeEnv !== "test";

    if (error instanceof ReportsError) {
      return { status: error.status, message: error.message };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      if (shouldLogInternals) {
        console.error("[reports] Prisma initialization error", {
          name: error.name,
          message: error.message,
        });
      }
      return {
        status: 503,
        message: "Unable to process report request right now.",
      };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      if (shouldLogInternals) {
        console.error("[reports] Prisma validation error", {
          name: error.name,
          message: error.message,
        });
      }
      return {
        status: 500,
        message: "Unable to process report request right now.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (shouldLogInternals) {
        console.error("[reports] Prisma known request error", {
          code: error.code,
          meta: error.meta,
        });
      }

      if (error.code === "P2021" || error.code === "P2022") {
        return {
          status: 503,
          message: "Unable to process report request right now.",
        };
      }

      if (error.code === "P2010") {
        return {
          status: 500,
          message: "Unable to process report request right now.",
        };
      }

      if (error.code === "P2011") {
        return {
          status: 400,
          message: "Invalid report data.",
        };
      }

      if (error.code === "P2003") {
        return {
          status: 400,
          message: "Invalid report data.",
        };
      }

      if (error.code === "P2025") {
        return {
          status: 404,
          message: "Report not found.",
        };
      }

      if (error.code === "P2002") {
        return {
          status: 409,
          message: "Conflict while processing report request.",
        };
      }

      if (error.code === "P1001") {
        return {
          status: 503,
          message: "Unable to process report request right now.",
        };
      }

      return {
        status: 500,
        message: "Unable to process report request right now.",
      };
    }

    if (error instanceof Error) {
      if (shouldLogInternals) {
        console.error("[reports] Unexpected service error", {
          name: error.name,
          message: error.message,
        });
      }
      return { status: 500, message: "Unable to process report request right now." };
    }

    if (shouldLogInternals) {
      console.error("[reports] Unexpected non-error failure", { error });
    }
    return { status: 500, message: "Unable to process report request right now." };
  },
};
