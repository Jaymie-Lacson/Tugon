import type { IncidentType } from '../data/incidents';

const INCIDENT_TYPE_TO_CATEGORY_LABEL: Record<IncidentType, string> = {
  flood: 'Pollution',
  accident: 'Road Hazard',
  medical: 'Noise',
  crime: 'Crime',
  infrastructure: 'Road Hazard',
  typhoon: 'Pollution',
};

export function getCategoryLabelForIncidentType(type: IncidentType): string {
  return INCIDENT_TYPE_TO_CATEGORY_LABEL[type] ?? 'Other';
}
