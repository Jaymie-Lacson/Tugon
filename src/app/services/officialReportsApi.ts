import { getAuthSession } from "../utils/authSession";
import type { ApiCitizenReport, ApiTicketStatus } from "./citizenReportsApi";
import type { ReportCategory, ReportSubcategory } from "../data/reportTaxonomy";
import { ApiRequestError, apiErrorDebugStore, parseJsonResponse } from "./apiErrorDebug";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

function shouldUseSoftFallback(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  // Temporary client-side compatibility mode while production backend is being fixed.
  return error.details.status >= 500;
}

function getDateRangeFromDays(days: number): { fromDate: string; toDate: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
  };
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error("You must be logged in to continue.");
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const url = `${API_BASE}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message = `Unable to reach the API server (${API_BASE}).`;
    const record = apiErrorDebugStore.recordNetworkError({
      method,
      url,
      message,
      error,
    });
    throw new Error(`${record.message} [status=${record.status} code=${record.code ?? record.statusText}]`);
  }

  return parseJsonResponse<T>(response, method, url);
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
  async getReports() {
    try {
      return await authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", {
        method: "GET",
      });
    } catch (error) {
      if (shouldUseSoftFallback(error)) {
        return { reports: [] };
      }
      throw error;
    }
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

  async getAlerts() {
    try {
      return await authedRequest<{ alerts: ApiCrossBorderAlert[] }>("/official/alerts", {
        method: "GET",
      });
    } catch (error) {
      if (shouldUseSoftFallback(error)) {
        return { alerts: [] };
      }
      throw error;
    }
  },

  markAlertRead(alertId: string) {
    return authedRequest<{ message: string; alert: ApiCrossBorderAlert }>(`/official/alerts/${alertId}/read`, {
      method: "PATCH",
    });
  },

  async getHeatmap(params?: {
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

    try {
      return await authedRequest<ApiHeatmapResponse>(`/official/heatmap${query ? `?${query}` : ""}`, {
        method: "GET",
      });
    } catch (error) {
      if (shouldUseSoftFallback(error)) {
        const days = typeof params?.days === "number" ? params.days : 14;
        const { fromDate, toDate } = getDateRangeFromDays(days);

        return {
          clusters: [],
          applied: {
            category: params?.category ?? null,
            fromDate,
            toDate,
            threshold: typeof params?.threshold === "number" ? params.threshold : 3,
            cellSize: typeof params?.cellSize === "number" ? params.cellSize : 0.0025,
          },
        };
      }
      throw error;
    }
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
