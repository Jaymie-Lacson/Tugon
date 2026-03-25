import type { IncidentType } from '../data/incidents';

const INCIDENT_TYPE_TO_CATEGORY_LABEL: Record<IncidentType, string> = {
  flood: 'Pollution',
  accident: 'Road Hazard',
  medical: 'Noise',
  crime: 'Crime',
  infrastructure: 'Other',
  typhoon: 'Other',
};

export function getCategoryLabelForIncidentType(type: IncidentType): string {
  return INCIDENT_TYPE_TO_CATEGORY_LABEL[type] ?? 'Other';
}
