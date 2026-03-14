import type { Incident, IncidentStatus, IncidentType } from '../data/incidents';
import type { ApiCitizenReport, ApiTicketStatus } from '../services/citizenReportsApi';
import type { ReportCategory } from '../data/reportTaxonomy';

export function mapIncidentType(category: ReportCategory): IncidentType {
  if (category === 'Hazards and Safety') return 'fire';
  if (category === 'Neighbor Disputes / Lupon') return 'crime';
  if (category === 'Road and Street Issues') return 'accident';
  if (category === 'Garbage and Sanitation') return 'flood';
  return 'infrastructure';
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
  const createdEntry = report.timeline.find((entry) => entry.status === 'Created');
  const reportedBy = createdEntry?.actor?.trim() || report.timeline[0]?.actor?.trim() || 'Citizen';

  return {
    id: report.id,
    type: mapIncidentType(report.category),
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
    reportedBy,
    affectedPersons: parseAffectedCount(report.affectedCount),
    mapX: 0,
    mapY: 0,
    lat: report.latitude,
    lng: report.longitude,
  };
}
