export type IncidentType = 'fire' | 'flood' | 'accident' | 'medical' | 'crime' | 'infrastructure' | 'typhoon';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'active' | 'responding' | 'contained' | 'resolved';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  barangay: string;
  district: string;
  location: string;
  reportedAt: string;
  respondedAt?: string;
  resolvedAt?: string;
  responders: number;
  description: string;
  reportedBy: string;
  affectedPersons?: number;
  mapX: number;
  mapY: number;
  lat: number;
  lng: number;
}

export function isIncidentVisibleOnMap(incident: Pick<Incident, 'status'>): boolean {
  return incident.status !== 'resolved';
}

export const incidentTypeConfig: Record<IncidentType, { label: string; color: string; bgColor: string }> = {
  fire: { label: 'Fire', color: '#B91C1C', bgColor: '#FEE2E2' },
  flood: { label: 'Flood', color: '#1D4ED8', bgColor: '#DBEAFE' },
  accident: { label: 'Accident', color: '#B4730A', bgColor: '#FEF3C7' },
  medical: { label: 'Medical', color: '#0F766E', bgColor: '#CCFBF1' },
  crime: { label: 'Crime', color: '#7C3AED', bgColor: '#EDE9FE' },
  infrastructure: { label: 'Infrastructure', color: '#374151', bgColor: '#F3F4F6' },
  typhoon: { label: 'Typhoon', color: '#0369A1', bgColor: '#E0F2FE' },
};

export const severityConfig: Record<Severity, { label: string; color: string; bgColor: string; dotColor: string }> = {
  critical: { label: 'Critical', color: '#B91C1C', bgColor: '#FEE2E2', dotColor: '#B91C1C' },
  high: { label: 'High', color: '#C2410C', bgColor: '#FFEDD5', dotColor: '#EA580C' },
  medium: { label: 'Medium', color: '#92400E', bgColor: '#FEF3C7', dotColor: '#B4730A' },
  low: { label: 'Low', color: '#065F46', bgColor: '#D1FAE5', dotColor: '#059669' },
};

export const statusConfig: Record<IncidentStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: '#B91C1C', bgColor: '#FEE2E2' },
  responding: { label: 'Responding', color: '#1E3A8A', bgColor: '#DBEAFE' },
  contained: { label: 'Contained', color: '#92400E', bgColor: '#FEF3C7' },
  resolved: { label: 'Resolved', color: '#065F46', bgColor: '#D1FAE5' },
};
