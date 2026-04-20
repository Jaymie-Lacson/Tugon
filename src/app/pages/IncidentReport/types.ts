import type { ReportCategory, ReportSubcategory } from '../../data/reportTaxonomy';

export type IncidentCategory = ReportCategory;
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface PinData {
  lat: number;
  lng: number;
  barangay: string;
  district: string;
  barangayCode: string | null;
  isCrossBarangay: boolean;
}

export interface ReportForm {
  category: IncidentCategory | null;
  subcategory: ReportSubcategory | null;
  requiresMediation: boolean;
  mediationWarning: string | null;
  severity: Severity | null;
  pin: PinData | null;
  address: string;
  description: string;
  quickTags: string[];
  affectedCount: string | null;
  photoPreviews: string[];
  photoFiles: File[];
  audioUrl: string | null;
  audioBlob: Blob | null;
}

export type LatLng = [number, number];
