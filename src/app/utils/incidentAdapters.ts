import type { Incident, IncidentStatus, IncidentType } from '../data/incidents';
import type { ApiCitizenReport, ApiIncidentType, ApiTicketStatus } from '../services/citizenReportsApi';

export function mapIncidentType(type: ApiIncidentType): IncidentType {
  switch (type) {
    case 'Fire':
      return 'fire';
    case 'Crime':
      return 'crime';
    case 'Road Hazard':
      return 'accident';
    case 'Pollution':
      return 'flood';
    case 'Noise':
    case 'Other':
    default:
      return 'infrastructure';
  }
}

export function mapTicketStatus(status: ApiTicketStatus): IncidentStatus {
  switch (status) {
    case 'Submitted':
      return 'active';
    case 'Under Review':
    case 'In Progress':
      return 'responding';
    case 'Unresolvable':
      return 'contained';
    case 'Resolved':
    case 'Closed':
    default:
      return 'resolved';
  }
}

function parseAffectedCount(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function reportToIncident(report: ApiCitizenReport): Incident {
  const respondedAt =
    report.timeline.find((entry) => entry.status === 'Under Review' || entry.status === 'In Progress')?.timestamp;
  const resolvedAt = report.timeline.find((entry) => entry.status === 'Resolved' || entry.status === 'Closed')?.timestamp;

  return {
    id: report.id,
    type: mapIncidentType(report.type),
    severity: report.severity,
    status: mapTicketStatus(report.status),
    barangay: report.barangay,
    district: report.district,
    location: report.location,
    reportedAt: report.submittedAt,
    respondedAt,
    resolvedAt,
    responders: report.assignedOfficer ? 1 : 0,
    description: report.description,
    reportedBy: 'Citizen Report',
    affectedPersons: parseAffectedCount(report.affectedCount),
    mapX: 0,
    mapY: 0,
    lat: report.latitude,
    lng: report.longitude,
  };
}
