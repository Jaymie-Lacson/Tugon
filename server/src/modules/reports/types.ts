export type TicketStatus =
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Unresolvable";

export type IncidentType =
  | "Fire"
  | "Pollution"
  | "Noise"
  | "Crime"
  | "Road Hazard"
  | "Other";

export type ReportSeverity = "low" | "medium" | "high" | "critical";

export interface TimelineEntry {
  status: "Created" | TicketStatus;
  label: string;
  description: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  note?: string;
}

export interface CitizenReportRecord {
  id: string;
  citizenUserId: string;
  type: IncidentType;
  status: TicketStatus;
  location: string;
  barangay: string;
  district: string;
  description: string;
  severity: ReportSeverity;
  affectedCount: string | null;
  submittedAt: string;
  updatedAt: string;
  hasPhotos: boolean;
  photoCount: number;
  hasAudio: boolean;
  assignedOfficer: string | null;
  assignedUnit: string | null;
  resolutionNote: string | null;
  timeline: TimelineEntry[];
}

export interface CreateCitizenReportInput {
  type: IncidentType;
  barangay: string;
  district: string;
  location: string;
  description: string;
  severity: ReportSeverity;
  affectedCount: string | null;
  photoCount: number;
  hasAudio: boolean;
}
