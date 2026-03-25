import { describe, expect, it } from 'vitest';
import {
  OUTSIDE_REGISTERED_BARANGAY_LABEL,
  validateIncidentReportStep,
  type IncidentReportValidationState,
} from './incidentReportValidation';

function createBaseState(overrides: Partial<IncidentReportValidationState> = {}): IncidentReportValidationState {
  return {
    category: 'Fire',
    subcategory: 'Structural fire',
    severity: 'high',
    pin: { barangay: 'Barangay 251' },
    isPinWithinSupportedBarangay: true,
    address: 'Street 1, Tondo, Manila',
    description: 'Visible flames from a residential building.',
    photoPreviews: ['data:image/jpeg;base64,abc'],
    ...overrides,
  };
}

describe('validateIncidentReportStep', () => {
  it('requires category, subcategory, and severity on step 1', () => {
    expect(validateIncidentReportStep(1, createBaseState({ category: null }))).toBe('Select an incident category to continue.');
    expect(validateIncidentReportStep(1, createBaseState({ subcategory: null }))).toBe('Select a subcategory to continue.');
    expect(validateIncidentReportStep(1, createBaseState({ severity: null }))).toBe('Select incident severity to continue.');
    expect(validateIncidentReportStep(1, createBaseState())).toBeNull();
  });

  it('enforces supported in-barangay pin and address on step 2', () => {
    expect(validateIncidentReportStep(2, createBaseState({ pin: null }))).toBe('Drop a map pin inside your registered barangay to continue.');
    expect(
      validateIncidentReportStep(
        2,
        createBaseState({
          pin: { barangay: OUTSIDE_REGISTERED_BARANGAY_LABEL },
        }),
      ),
    ).toBe('Your pin must be inside your registered barangay.');
    expect(
      validateIncidentReportStep(
        2,
        createBaseState({
          isPinWithinSupportedBarangay: false,
        }),
      ),
    ).toBe('Your pin must be inside your registered barangay.');
    expect(validateIncidentReportStep(2, createBaseState({ address: '   ' }))).toBe('Enter a specific address or landmark to continue.');
  });

  it('requires meaningful details and photo evidence on steps 3 and 4', () => {
    expect(validateIncidentReportStep(3, createBaseState({ description: 'Too short' }))).toBe('Provide at least 10 characters in the incident description.');
    expect(validateIncidentReportStep(4, createBaseState({ photoPreviews: [] }))).toBe('Attach at least one photo before continuing.');
    expect(validateIncidentReportStep(5, createBaseState())).toBeNull();
  });
});
