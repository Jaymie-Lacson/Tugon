import type { IncidentType } from '../data/incidents';

const INCIDENT_TYPE_TO_CATEGORY_LABEL: Record<IncidentType, string> = {
  fire: 'Fire',
  flood: 'Pollution',
  accident: 'Road Hazard',
  medical: 'Other',
  crime: 'Crime',
  infrastructure: 'Other',
  typhoon: 'Other',
};

export function getCategoryLabelForIncidentType(type: IncidentType): string {
  return INCIDENT_TYPE_TO_CATEGORY_LABEL[type] ?? 'Other';
}
