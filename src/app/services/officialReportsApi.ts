import { clearAuthSession, getAuthSession } from "../utils/authSession";
import { withSecurityHeaders } from "../utils/requestSecurity";
import type { ApiCitizenReport, ApiTicketStatus } from "./citizenReportsApi";
import type { ReportCategory, ReportSubcategory } from "../data/reportTaxonomy";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api").replace(
  /\/+$/,
  "",
);

const missingOfficialRoute = {
  historyExport: false,
  reportExport: false,
  dssActions: false,
} as const;

const missingOfficialRouteState: { [K in keyof typeof missingOfficialRoute]: boolean } = {
  historyExport: false,
  reportExport: false,
  dssActions: false,
};

type CsrfBootstrap = {
  csrfToken: string;
  headerName: string;
};

let cachedCsrfBootstrap: CsrfBootstrap | null = null;

function requiresCsrfHeader(method: string | undefined) {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

async function fetchCsrfBootstrap(forceRefresh = false): Promise<CsrfBootstrap> {
  if (!forceRefresh && cachedCsrfBootstrap) {
    return cachedCsrfBootstrap;
  }

  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: withSecurityHeaders({}, { method: "GET" }),
  });

  if (!response.ok) {
    throw new Error("Unable to initialize secure session. Please refresh and try again.");
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<CsrfBootstrap>;
  const csrfToken = typeof payload.csrfToken === "string" ? payload.csrfToken.trim() : "";
  const headerName = typeof payload.headerName === "string" ? payload.headerName.trim() : "";

  if (!csrfToken || !headerName) {
    throw new Error("Unable to initialize secure session. Please refresh and try again.");
  }

  cachedCsrfBootstrap = { csrfToken, headerName };
  return cachedCsrfBootstrap;
}

function normalizeOfficialApiMessage(message: string): string {
  const session = getAuthSession();
  if (
    message === "Unexpected reports service error." &&
    session?.user.role === "OFFICIAL" &&
    !session.user.barangayCode
  ) {
    return "Your official account has no assigned barangay yet. Please contact Super Admin to assign your barangay profile.";
  }
  return message;
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const text = error.message.toLowerCase();
  return text.includes("404") || text.includes("not found");
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

function buildSingleReportExcelXml(report: ApiCitizenReport): string {
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

function buildReportsCsv(reports: ApiCitizenReport[]): string {
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

  const esc = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
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
    report.photoCount,
    report.hasAudio ? "yes" : "no",
  ]);

  return [header, ...rows].map((cols) => cols.map((v) => esc(v)).join(",")).join("\n");
}

function buildTemplatePreview(templateId: string, reports: ApiCitizenReport[]): string[] {
  return [
    "TUGON Official Report",
    `Template: ${templateId}`,
    `Generated At: ${new Date().toISOString()}`,
    `Total Incidents: ${reports.length}`,
    "",
    "Generated from live report records.",
  ];
}

function buildTemplateText(templateId: string, reports: ApiCitizenReport[]): string {
  return [
    ...buildTemplatePreview(templateId, reports),
    "",
    ...reports.slice(0, 15).map((report) => `${report.id} | ${report.status} | ${report.barangay} | ${report.location}`),
  ].join("\n");
}

function reportIdVariants(input: string): string[] {
  const trimmed = input.trim();
  const sanitized = trimmed.replace(/^[^0-9A-Za-z]+/, "");
  const withoutPrefix = sanitized.startsWith("MY-") ? sanitized.slice(3) : sanitized;
  const withPrefix = withoutPrefix ? `MY-${withoutPrefix}` : "";

  return Array.from(new Set([trimmed, sanitized, withPrefix, withoutPrefix].filter(Boolean)));
}

async function fallbackExportAllReportsCsv(): Promise<{ text: string; fileName: string }> {
  const fallback = await authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", { method: "GET" });
  const generatedAt = new Date().toISOString();
  return {
    text: buildReportsCsv(fallback.reports),
    fileName: `tugon-report-history-${generatedAt.slice(0, 10)}.csv`,
  };
}

async function fallbackExportReportById(reportId: string): Promise<{ text: string; fileName: string }> {
  const candidates = reportIdVariants(reportId);

  for (const candidate of candidates) {
    try {
      const payload = await authedRequest<{ report: ApiCitizenReport }>(`/official/reports/${encodeURIComponent(candidate)}`, {
        method: "GET",
      });

      return {
        text: buildSingleReportExcelXml(payload.report),
        fileName: `tugon-${payload.report.id}.xls`,
      };
    } catch {
      // Try next candidate.
    }
  }

  const listPayload = await authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", { method: "GET" });
  const found = listPayload.reports.find((report) => candidates.includes(report.id));
  if (!found) {
    throw new Error(`Report ${reportId} was not found in your accessible report list.`);
  }

  return {
    text: buildSingleReportExcelXml(found),
    fileName: `tugon-${found.id}.xls`,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    const raw = typeof payload?.message === "string" ? payload.message : "";
    if (raw.trim()) {
      return normalizeOfficialApiMessage(raw);
    }
  } else {
    const text = await response.text().catch(() => "");
    if (text.trim() && !text.toLowerCase().includes("<!doctype")) {
      return text.trim();
    }
  }

  return `Request failed (${response.status}).`;
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.user) {
    throw new Error("You must be logged in to continue.");
  }

  const method = init?.method;
  const headers = new Headers(withSecurityHeaders({
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  }, { method, token: session.token }));

  if (requiresCsrfHeader(method) && path !== "/auth/csrf") {
    const bootstrap = await fetchCsrfBootstrap();
    if (!headers.has(bootstrap.headerName)) {
      headers.set(bootstrap.headerName, bootstrap.csrfToken);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Reset stale/local-invalid auth to avoid repeated unauthorized loops.
      clearAuthSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    throw new Error(await readErrorMessage(response));
  }

  const payload = await response.json().catch(() => ({}));

  return payload as T;
}

async function authedTextRequest(path: string, init?: RequestInit): Promise<{ text: string; fileName: string | null }> {
  const session = getAuthSession();
  if (!session?.user) {
    throw new Error("You must be logged in to continue.");
  }

  const method = init?.method;
  const headers = new Headers(withSecurityHeaders({
    ...(init?.headers ?? {}),
  }, { method, token: session.token }));

  if (requiresCsrfHeader(method) && path !== "/auth/csrf") {
    const bootstrap = await fetchCsrfBootstrap();
    if (!headers.has(bootstrap.headerName)) {
      headers.set(bootstrap.headerName, bootstrap.csrfToken);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    throw new Error(await readErrorMessage(response));
  }

  const disposition = response.headers.get("content-disposition");
  const fileNameMatch = disposition?.match(/filename="([^"]+)"/i);
  return {
    text: await response.text(),
    fileName: fileNameMatch?.[1] ?? null,
  };
}

export interface ApiCrossBorderAlert {
  id: string;
  reportId: string;
  sourceBarangayCode: string;
  targetBarangayCode: string;
  alertReason: string;
  createdAt: string;
  readAt: string | null;
  report: {
    id: string;
    category: ReportCategory;
    subcategory: ReportSubcategory;
    requiresMediation: boolean;
    mediationWarning: string | null;
    status: ApiTicketStatus;
    location: string;
    barangay: string;
    district: string;
    submittedAt: string;
  };
}

export interface ApiHeatmapCluster {
  clusterId: string;
  category: ReportCategory;
  incidentCount: number;
  centerLatitude: number;
  centerLongitude: number;
  intensity: number;
  threshold: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  barangayCodes: string[];
}

export interface ApiHeatmapResponse {
  clusters: ApiHeatmapCluster[];
  applied: {
    category: ReportCategory | null;
    fromDate: string;
    toDate: string;
    threshold: number;
    cellSize: number;
  };
}

export interface ApiPendingVerification {
  citizenUserId: string;
  fullName: string;
  phoneNumber: string;
  idImageUrl: string | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  barangayCode: string | null;
  barangayName: string | null;
  submittedAt: string;
  createdAt: string;
}

export interface ApiGeneratedTemplateReport {
  message: string;
  templateId: string;
  generatedAt: string;
  fileName: string;
  preview: string[];
}

export interface ApiDssActionResult {
  message: string;
  action: {
    actionType: "DISMISS";
    recommendationTitle: string;
    actedAt: string;
    actor: string;
  };
}

export interface ApiDssRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "info";
  title: string;
  description: string;
  actions: string[];
  confidence: number;
  source: string;
}

export interface ApiDssRecommendationsResponse {
  recommendations: ApiDssRecommendation[];
  source: "ai" | "fallback";
}

export type ApiVerificationDecision = "APPROVE" | "REJECT" | "REQUEST_REUPLOAD" | "BAN_ACCOUNT";

export const officialReportsApi = {
  getReports() {
    return authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", {
      method: "GET",
    });
  },

  getReportById(reportId: string) {
    return authedRequest<{ report: ApiCitizenReport }>(`/official/reports/${reportId}`, {
      method: "GET",
    });
  },

  updateReportStatus(reportId: string, input: { status: ApiTicketStatus; note?: string }) {
    return authedRequest<{ message: string; report: ApiCitizenReport }>(
      `/official/reports/${reportId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  getAlerts() {
    return authedRequest<{ alerts: ApiCrossBorderAlert[] }>("/official/alerts", {
      method: "GET",
    });
  },

  markAlertRead(alertId: string) {
    return authedRequest<{ message: string; alert: ApiCrossBorderAlert }>(`/official/alerts/${alertId}/read`, {
      method: "PATCH",
    });
  },

  getHeatmap(params?: {
    category?: ReportCategory;
    days?: number;
    threshold?: number;
    cellSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.category) {
      search.set("category", params.category);
    }
    if (typeof params?.days === "number") {
      search.set("days", String(params.days));
    }
    if (typeof params?.threshold === "number") {
      search.set("threshold", String(params.threshold));
    }
    if (typeof params?.cellSize === "number") {
      search.set("cellSize", String(params.cellSize));
    }

    const query = search.toString();
    return authedRequest<ApiHeatmapResponse>(`/official/heatmap${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getPendingVerifications() {
    return authedRequest<{ verifications: ApiPendingVerification[] }>("/official/verifications", {
      method: "GET",
    });
  },

  reviewVerification(
    citizenUserId: string,
    input: {
      decision: ApiVerificationDecision;
      reason?: string;
      notes?: string;
    },
  ) {
    return authedRequest<{
      message: string;
      verification: {
        citizenUserId: string;
        fullName: string;
        isVerified: boolean;
        verificationStatus: "APPROVED" | "REJECTED" | null;
        rejectionReason: string | null;
        verifiedAt: string | null;
        isBanned: boolean;
        bannedReason: string | null;
        idImageUrl: string | null;
      };
    }>(`/official/verifications/${citizenUserId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  generateTemplateReport(templateId: string) {
    return authedRequest<ApiGeneratedTemplateReport>(`/official/reports/templates/${encodeURIComponent(templateId)}/generate`, {
      method: "POST",
    }).catch(async (error: unknown) => {
      if (!isNotFoundError(error)) {
        throw error;
      }

      const fallback = await authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", { method: "GET" });
      const generatedAt = new Date().toISOString();
      return {
        message: "Template generated using compatibility fallback.",
        templateId,
        generatedAt,
        fileName: `tugon-${templateId}-${generatedAt.slice(0, 10)}.txt`,
        preview: buildTemplatePreview(templateId, fallback.reports),
      };
    });
  },

  exportTemplateReport(templateId: string) {
    return authedTextRequest(`/official/reports/templates/${encodeURIComponent(templateId)}/export`, {
      method: "GET",
    }).catch(async (error: unknown) => {
      if (!isNotFoundError(error)) {
        throw error;
      }

      const fallback = await authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", { method: "GET" });
      const generatedAt = new Date().toISOString();
      return {
        text: buildTemplateText(templateId, fallback.reports),
        fileName: `tugon-${templateId}-${generatedAt.slice(0, 10)}.txt`,
      };
    });
  },

  exportAllReports() {
    if (missingOfficialRouteState.historyExport) {
      return fallbackExportAllReportsCsv();
    }

    return authedTextRequest("/official/reports/history/export", {
      method: "GET",
    }).catch(async (error: unknown) => {
      if (!isNotFoundError(error)) {
        throw error;
      }

      missingOfficialRouteState.historyExport = true;
      return fallbackExportAllReportsCsv();
    });
  },

  exportReportById(reportId: string) {
    if (missingOfficialRouteState.reportExport) {
      return fallbackExportReportById(reportId);
    }

    return authedTextRequest(`/official/reports/${encodeURIComponent(reportId)}/export`, {
      method: "GET",
    }).catch(async (error: unknown) => {
      if (!isNotFoundError(error)) {
        throw error;
      }

      missingOfficialRouteState.reportExport = true;
      return fallbackExportReportById(reportId);
    });
  },

  submitDssAction(input: { actionType: "DISMISS"; recommendationTitle: string; notes?: string }) {
    if (missingOfficialRouteState.dssActions) {
      const actor = getAuthSession()?.user.fullName ?? "Barangay Official";
      return Promise.resolve({
        message: "DSS action recorded locally (compatibility mode).",
        action: {
          actionType: input.actionType,
          recommendationTitle: input.recommendationTitle,
          actedAt: new Date().toISOString(),
          actor,
        },
      } as ApiDssActionResult);
    }

    return authedRequest<ApiDssActionResult>("/official/reports/dss/actions", {
      method: "POST",
      body: JSON.stringify(input),
    }).catch((error: unknown) => {
      if (!isNotFoundError(error)) {
        throw error;
      }

      missingOfficialRouteState.dssActions = true;
      const actor = getAuthSession()?.user.fullName ?? "Barangay Official";
      return {
        message: "DSS action recorded locally (compatibility mode).",
        action: {
          actionType: input.actionType,
          recommendationTitle: input.recommendationTitle,
          actedAt: new Date().toISOString(),
          actor,
        },
      } as ApiDssActionResult;
    });
  },

  getDssRecommendations() {
    return authedRequest<ApiDssRecommendationsResponse>("/official/reports/dss/recommendations", {
      method: "GET",
    });
  },
};
