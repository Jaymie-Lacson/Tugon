import { getAuthSession } from "../utils/authSession";
import type { ApiCitizenReport, ApiTicketStatus } from "./citizenReportsApi";
import type { ReportCategory, ReportSubcategory } from "../data/reportTaxonomy";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api").replace(
  /\/+$/,
  "",
);

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

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error("You must be logged in to continue.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMessage = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(normalizeOfficialApiMessage(rawMessage));
  }

  return payload as T;
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
};
