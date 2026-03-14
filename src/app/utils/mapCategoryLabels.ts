import type { IncidentType } from '../data/incidents';

const INCIDENT_TYPE_TO_CATEGORY_LABEL: Record<IncidentType, string> = {
  fire: 'Hazards and Safety',
  flood: 'Garbage and Sanitation',
  accident: 'Road and Street Issues',
  medical: 'Hazards and Safety',
  crime: 'Neighbor Disputes / Lupon',
  infrastructure: 'Public Disturbance / Others',
  typhoon: 'Hazards and Safety',
};

export function getCategoryLabelForIncidentType(type: IncidentType): string {
  return INCIDENT_TYPE_TO_CATEGORY_LABEL[type] ?? 'Others';
}
