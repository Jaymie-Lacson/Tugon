import { getAuthSession } from "../utils/authSession";
import type { ApiCitizenReport, ApiTicketStatus } from "./citizenReportsApi";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

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
    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
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
    type: "Fire" | "Pollution" | "Noise" | "Crime" | "Road Hazard" | "Other";
    status: ApiTicketStatus;
    location: string;
    barangay: string;
    district: string;
    submittedAt: string;
  };
}

export interface ApiHeatmapCluster {
  clusterId: string;
  incidentType: "Fire" | "Pollution" | "Noise" | "Crime" | "Road Hazard" | "Other";
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
    incidentType: "Fire" | "Pollution" | "Noise" | "Crime" | "Road Hazard" | "Other" | null;
    fromDate: string;
    toDate: string;
    threshold: number;
    cellSize: number;
  };
}

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
    type?: "Fire" | "Pollution" | "Noise" | "Crime" | "Road Hazard" | "Other";
    days?: number;
    threshold?: number;
    cellSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.type) {
      search.set("type", params.type);
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
};
