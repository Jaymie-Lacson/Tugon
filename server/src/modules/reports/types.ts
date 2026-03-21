export type TicketStatus =
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Unresolvable";

import type { ReportCategory, ReportSubcategory } from "./taxonomy.js";

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

export interface ReportEvidenceRecord {
  id: string;
  kind: "photo" | "audio";
  publicUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface CitizenReportRecord {
  id: string;
  citizenUserId: string;
  routedBarangayCode: string;
  latitude: number;
  longitude: number;
  category: ReportCategory;
  subcategory: ReportSubcategory;
  requiresMediation: boolean;
  mediationWarning: string | null;
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
  evidence: ReportEvidenceRecord[];
  reporterVerificationStatus: "verified" | "pending" | "rejected" | "banned";
  timeline: TimelineEntry[];
}

export interface CreateCitizenReportInput {
  category: string;
  subcategory: string;
  requiresMediation: boolean;
  mediationWarning: string | null;
  latitude: number;
  longitude: number;
  location: string;
  description: string;
  severity: ReportSeverity;
  affectedCount: string | null;
  photoCount: number;
  hasAudio: boolean;
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
}

export interface CrossBorderAlertRecord {
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
    status: TicketStatus;
    location: string;
    barangay: string;
    district: string;
    submittedAt: string;
  };
}

export interface HeatmapQueryInput {
  category?: string;
  fromDate?: string;
  toDate?: string;
  days?: number;
  threshold?: number;
  cellSize?: number;
}

export interface HeatmapClusterRecord {
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
