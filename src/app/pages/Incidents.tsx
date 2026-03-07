import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Eye, Edit2, Printer, Download,
  ChevronDown, ChevronUp, ChevronsUpDown, X,
  Users, Clock, MapPin, Info, Flame, Droplets, Car, Heart, Shield as ShieldIcon, Zap,
} from 'lucide-react';
import {
  Incident, IncidentType, Severity, IncidentStatus,
  incidentTypeConfig, severityConfig, statusConfig,
} from '../data/incidents';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import type { ApiCitizenReport, ApiIncidentType, ApiTicketStatus } from '../services/citizenReportsApi';
import { officialReportsApi } from '../services/officialReportsApi';

type IncidentView = Incident & {
  ticketStatus: ApiTicketStatus;
  source: ApiCitizenReport;
};

const typeIcons: Record<IncidentType, React.ReactNode> = {
  fire: <Flame size={14} />,
  flood: <Droplets size={14} />,
  accident: <Car size={14} />,
  medical: <Heart size={14} />,
  crime: <ShieldIcon size={14} />,
  infrastructure: <Zap size={14} />,
  typhoon: <Zap size={14} />,
};

function mapIncidentType(type: ApiIncidentType): IncidentType {
  switch (type) {
    case 'Fire':
      return 'fire';
    case 'Crime':
      return 'crime';
    case 'Road Hazard':
      return 'accident';
    case 'Pollution':
    case 'Noise':
    case 'Other':
    default:
      return 'infrastructure';
  }
}

function mapTicketStatus(status: ApiTicketStatus): IncidentStatus {
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

function toIncidentView(report: ApiCitizenReport): IncidentView {
  const respondedAt =
    report.timeline.find((entry) => entry.status === 'Under Review' || entry.status === 'In Progress')?.timestamp;
  const resolvedAt = report.timeline.find((entry) => entry.status === 'Resolved' || entry.status === 'Closed')?.timestamp;

  return {
    id: report.id,
    type: mapIncidentType(report.type),
    severity: report.severity,
    status: mapTicketStatus(report.status),
    ticketStatus: report.status,
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
    source: report,
  };
}

function getNextStatuses(currentStatus: ApiTicketStatus): ApiTicketStatus[] {
  switch (currentStatus) {
    case 'Submitted':
      return ['Under Review'];
    case 'Under Review':
      return ['In Progress', 'Unresolvable'];
    case 'In Progress':
      return ['Resolved'];
    case 'Resolved':
      return ['Closed'];
    default:
      return [];
  }
}

function IncidentDetailModal({
  incident,
  onClose,
  onUpdateStatus,
  isUpdating,
}: {
  incident: IncidentView;
  onClose: () => void;
  onUpdateStatus: (nextStatus: ApiTicketStatus) => Promise<void>;
  isUpdating: boolean;
}) {
  const cfg = incidentTypeConfig[incident.type];
  const [nextStatus, setNextStatus] = useState<ApiTicketStatus | ''>('');
  const availableStatuses = useMemo(() => getNextStatuses(incident.ticketStatus), [incident.ticketStatus]);

  useEffect(() => {
    setNextStatus(availableStatuses[0] ?? '');
  }, [incident.id, availableStatuses]);

  const formatTime = (t?: string) =>
    t
      ? new Date(t).toLocaleString('en-PH', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '—';

  const responseTime = incident.respondedAt
    ? Math.round((new Date(incident.respondedAt).getTime() - new Date(incident.reportedAt).getTime()) / 60000)
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ background: '#1E3A8A', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: '14px 14px 0 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.bgColor, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeIcons[incident.type]}
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{incident.id}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 12 }}>{incident.location}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: 8, cursor: 'pointer', color: 'white' }}>
            <X size={16} color="white" />
          </button>
        </div>

        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TypeBadge type={incident.type} />
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} pulse={incident.status === 'active'} />
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.6, background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              {incident.description}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Barangay', value: incident.barangay, icon: <MapPin size={13} /> },
              { label: 'District', value: incident.district, icon: <Info size={13} /> },
              { label: 'Reported By', value: incident.reportedBy, icon: <Users size={13} /> },
              { label: 'Responders', value: `${incident.responders} unit(s) assigned`, icon: <Users size={13} /> },
              { label: 'Affected Persons', value: incident.affectedPersons !== undefined ? `${incident.affectedPersons} individual(s)` : 'Under assessment', icon: <Info size={13} /> },
              { label: 'Response Time', value: responseTime ? `${responseTime} minutes` : 'Not yet responded', icon: <Clock size={13} /> },
            ].map((item) => (
              <div key={item.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Ticket Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incident.source.timeline.map((entry) => (
                <div key={`${entry.label}-${entry.timestamp}`} style={{ borderLeft: '2px solid #E2E8F0', paddingLeft: 10 }}>
                  <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600 }}>{entry.label}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{entry.description}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{formatTime(entry.timestamp)} • {entry.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as ApiTicketStatus)}
            disabled={availableStatuses.length === 0 || isUpdating}
            style={{
              flex: 1,
              minWidth: 170,
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              background: '#F8FAFC',
              color: '#334155',
            }}
          >
            {availableStatuses.length === 0 ? <option value="">No further transitions</option> : null}
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            disabled={!nextStatus || isUpdating || availableStatuses.length === 0}
            onClick={() => {
              if (nextStatus) {
                void onUpdateStatus(nextStatus);
              }
            }}
            style={{
              flex: 1,
              minWidth: 140,
              background: '#1E3A8A',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 12,
              fontWeight: 600,
              cursor: !nextStatus || isUpdating || availableStatuses.length === 0 ? 'not-allowed' : 'pointer',
              opacity: !nextStatus || isUpdating || availableStatuses.length === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Edit2 size={13} /> {isUpdating ? 'Updating...' : 'Update Status'}
          </button>
          <button style={{ flex: 1, minWidth: 100, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={13} /> Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<IncidentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [sortKey, setSortKey] = useState<keyof IncidentView>('reportedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIncident, setSelectedIncident] = useState<IncidentView | null>(null);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      setIncidents(payload.reports.map((report) => toIncidentView(report)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const filtered = useMemo(() => {
    return incidents
      .filter((inc) => {
        const q = search.toLowerCase();
        if (
          search &&
          !inc.id.toLowerCase().includes(q) &&
          !inc.barangay.toLowerCase().includes(q) &&
          !inc.location.toLowerCase().includes(q) &&
          !inc.description.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (filterType && inc.type !== filterType) return false;
        if (filterSeverity && inc.severity !== filterSeverity) return false;
        if (filterStatus && inc.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const va = String(a[sortKey] ?? '');
        const vb = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [incidents, search, filterType, filterSeverity, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSort = (key: keyof IncidentView) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleUpdateStatus = async (nextStatus: ApiTicketStatus) => {
    if (!selectedIncident) return;

    setUpdatingIncidentId(selectedIncident.id);
    setError(null);
    try {
      const updated = await officialReportsApi.updateReportStatus(selectedIncident.id, { status: nextStatus });
      const mapped = toIncidentView(updated.report);
      setIncidents((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
      setSelectedIncident(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const SortIcon = ({ k }: { k: keyof IncidentView }) => {
    if (sortKey !== k) return <ChevronsUpDown size={12} color="#CBD5E1" />;
    return sortDir === 'asc' ? <ChevronUp size={12} color="#1E3A8A" /> : <ChevronDown size={12} color="#1E3A8A" />;
  };

  const hasFilter = search || filterType || filterSeverity || filterStatus;

  return (
    <div style={{ padding: '14px 16px', minHeight: '100%' }}>
      <div className="incidents-page-header" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Incident Management</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>
            {loading ? 'Loading reports...' : `${filtered.length} report${filtered.length !== 1 ? 's' : ''} found${hasFilter ? ' (filtered)' : ''}`}
          </p>
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div className="incidents-filter-bar" style={{ background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '2 1 200px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search reports, barangays..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', color: '#1E293B' }}
          />
        </div>

        {[
          {
            label: 'All Types',
            value: filterType,
            setter: (v: string) => {
              setFilterType(v as IncidentType | '');
              setPage(1);
            },
            options: Object.entries(incidentTypeConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
          {
            label: 'All Severity',
            value: filterSeverity,
            setter: (v: string) => {
              setFilterSeverity(v as Severity | '');
              setPage(1);
            },
            options: Object.entries(severityConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
          {
            label: 'All Status',
            value: filterStatus,
            setter: (v: string) => {
              setFilterStatus(v as IncidentStatus | '');
              setPage(1);
            },
            options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
        ].map((f) => (
          <select
            key={f.label}
            value={f.value}
            onChange={(e) => f.setter(e.target.value)}
            style={{ flex: '1 1 130px', padding: '10px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', color: f.value ? '#1E293B' : '#94A3B8', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        {hasFilter ? (
          <button
            onClick={() => {
              setSearch('');
              setFilterType('');
              setFilterSeverity('');
              setFilterStatus('');
              setPage(1);
            }}
            style={{ background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
          >
            <X size={14} /> Clear
          </button>
        ) : null}

        <button
          onClick={() => {
            void loadReports();
          }}
          style={{ marginLeft: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Download size={14} /> Refresh
        </button>
      </div>

      <div className="incidents-table-wrapper" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {[
                  { key: 'id' as keyof IncidentView, label: 'Incident ID' },
                  { key: 'type' as keyof IncidentView, label: 'Type' },
                  { key: 'barangay' as keyof IncidentView, label: 'Location' },
                  { key: 'severity' as keyof IncidentView, label: 'Severity' },
                  { key: 'status' as keyof IncidentView, label: 'Status' },
                  { key: 'reportedAt' as keyof IncidentView, label: 'Reported' },
                  { key: 'responders' as keyof IncidentView, label: 'Responders' },
                  { key: null, label: 'Actions' },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key)}
                    style={{ padding: '11px 14px', textAlign: 'left', color: sortKey === col.key ? '#1E3A8A' : '#64748B', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', borderBottom: '2px solid #F1F5F9', cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.key && <SortIcon k={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading reports...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No reports match your filters.</td>
                </tr>
              ) : paginated.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap', fontSize: 12 }}>{inc.id}</td>
                  <td style={{ padding: '11px 14px' }}><TypeBadge type={inc.type} size="sm" /></td>
                  <td style={{ padding: '11px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#1E293B', fontWeight: 500 }}>{inc.barangay}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>{inc.district}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} color="#94A3B8" />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{inc.responders}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => setSelectedIncident(inc)} style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600 }}>
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIncident ? (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updatingIncidentId === selectedIncident.id}
        />
      ) : null}
    </div>
  );
}
