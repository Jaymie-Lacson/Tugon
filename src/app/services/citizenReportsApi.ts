import { getAuthSession } from "../utils/authSession";

export type ApiTicketStatus =
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Unresolvable";

export type ApiIncidentType =
  | "Fire"
  | "Pollution"
  | "Noise"
  | "Crime"
  | "Road Hazard"
  | "Other";

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
  type: ApiIncidentType;
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

export const citizenReportsApi = {
  submitReport(input: {
    type: ApiIncidentType;
    barangay: string;
    district: string;
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
