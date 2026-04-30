import type { ReportCategory, ReportSubcategory } from '../data/reportTaxonomy';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentReportValidationPin {
  barangay: string;
}

export interface IncidentReportValidationState {
  category: ReportCategory | null;
  subcategory: ReportSubcategory | null;
  severity: IncidentSeverity | null;
  pin: IncidentReportValidationPin | null;
  isPinWithinSupportedBarangay: boolean;
  address: string;
  description: string;
  photoPreviews: string[];
}

export const OUTSIDE_REGISTERED_BARANGAY_LABEL = 'Outside Your Registered Barangay';

export function validateIncidentReportStep(step: number, state: IncidentReportValidationState): string | null {
  if (step === 1) {
    if (!state.category) {
      return 'Select an incident category to continue.';
    }
    if (!state.subcategory) {
      return 'Select a subcategory to continue.';
    }
    if (!state.severity) {
      return 'Select incident severity to continue.';
    }
    return null;
  }

  if (step === 2) {
    if (!state.pin) {
      return 'Drop a map pin inside your registered barangay to continue.';
    }
    if (!state.isPinWithinSupportedBarangay || state.pin.barangay === OUTSIDE_REGISTERED_BARANGAY_LABEL) {
      return 'Your pin must be inside your registered barangay.';
    }
    if (!state.address.trim()) {
      return 'Enter a specific address or landmark to continue.';
    }
    return null;
  }

  if (step === 3) {
    if (state.description.trim().length < 10) {
      return 'Provide at least 10 characters in the incident description.';
    }
    return null;
  }

  if (step === 4) {
    if (state.photoPreviews.length === 0) {
      return 'Attach at least one photo before continuing.';
    }
    return null;
  }

  return null;
}
