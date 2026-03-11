import { getAuthSession } from "../utils/authSession";
import type { ReportCategory, ReportSubcategory } from "../data/reportTaxonomy";
import { apiErrorDebugStore, parseJsonResponse } from "./apiErrorDebug";

export type ApiTicketStatus =
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Unresolvable";

export interface ApiTimelineEntry {
  status: "Created" | ApiTicketStatus;
  label: string;
  description: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  note?: string;
}

export interface ApiCitizenReport {
  id: string;
  routedBarangayCode: string;
  latitude: number;
  longitude: number;
  category: ReportCategory;
  subcategory: ReportSubcategory;
  requiresMediation: boolean;
  mediationWarning: string | null;
  status: ApiTicketStatus;
  location: string;
  barangay: string;
  district: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedCount: string | null;
  submittedAt: string;
  updatedAt: string;
  hasPhotos: boolean;
  photoCount: number;
  hasAudio: boolean;
  assignedOfficer: string | null;
  assignedUnit: string | null;
  resolutionNote: string | null;
  timeline: ApiTimelineEntry[];
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

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

export const citizenReportsApi = {
  submitReport(input: {
    category: ReportCategory;
    subcategory: ReportSubcategory;
    requiresMediation: boolean;
    mediationWarning: string | null;
    latitude: number;
    longitude: number;
    location: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    affectedCount: string | null;
    photoCount: number;
    hasAudio: boolean;
  }) {
    return authedRequest<{ message: string; report: ApiCitizenReport }>("/citizen/reports", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getMyReports() {
    return authedRequest<{ reports: ApiCitizenReport[] }>("/citizen/reports", {
      method: "GET",
    });
  },
};
