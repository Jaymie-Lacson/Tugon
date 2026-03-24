import { getAuthSession } from "../utils/authSession";
import { withSecurityHeaders } from "../utils/requestSecurity";
import type { ReportCategory, ReportSubcategory } from "../data/reportTaxonomy";

export type ApiIncidentType = "FIRE" | "POLLUTION" | "NOISE" | "CRIME" | "ROAD_HAZARD" | "OTHER";

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
  evidence: Array<{
    id: string;
    kind: "photo" | "audio";
    publicUrl: string;
    fileName: string;
    mimeType: string;
    createdAt: string;
  }>;
  reporterVerificationStatus: "verified" | "pending" | "rejected" | "banned";
  timeline: ApiTimelineEntry[];
}

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api").replace(
  /\/+$/,
  "",
);

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.user) {
    throw new Error("You must be logged in to continue.");
  }

  const headers = withSecurityHeaders({
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  }, { method: init?.method, token: session.token });

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
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
    type?: ApiIncidentType;
    photos?: Array<{
      fileName?: string;
      mimeType?: string;
      dataUrl: string;
    }>;
    audio?: {
      fileName?: string;
      mimeType?: string;
      dataUrl: string;
    } | null;
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

  cancelReport(reportId: string) {
    return authedRequest<{ message: string; report: ApiCitizenReport }>(
      `/citizen/reports/${encodeURIComponent(reportId)}/cancel`,
      {
        method: "PATCH",
      },
    );
  },
};
