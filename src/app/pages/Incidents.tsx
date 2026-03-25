import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Edit2, Printer, RefreshCw,
  ChevronDown, ChevronUp, ChevronsUpDown, X,
  ChevronRight,
  Users, Clock, MapPin, Info, Droplets, Car, Heart, Shield as ShieldIcon, Zap,
} from 'lucide-react';
import {
  Incident, IncidentType, Severity, IncidentStatus,
  incidentTypeConfig, severityConfig, statusConfig,
} from '../data/incidents';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import CardSkeleton from '../components/ui/CardSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import type { ApiCitizenReport, ApiTicketStatus } from '../services/citizenReportsApi';
import { officialReportsApi } from '../services/officialReportsApi';
import type { ReportCategory } from '../data/reportTaxonomy';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';
import { useLocation } from 'react-router';

type IncidentView = Incident & {
  ticketStatus: ApiTicketStatus;
  source: ApiCitizenReport;
};

const typeIcons: Record<IncidentType, React.ReactNode> = {
  flood: <Droplets size={14} />,
  accident: <Car size={14} />,
  medical: <Heart size={14} />,
  crime: <ShieldIcon size={14} />,
  infrastructure: <Zap size={14} />,
  typhoon: <Zap size={14} />,
};

const CATEGORY_FILTER_OPTIONS = [
  'Pollution',
  'Noise',
  'Crime',
  'Road Hazard',
  'Other',
] as const;

function mapIncidentType(category: ReportCategory): IncidentType {
  if (category === 'Noise') return 'medical';
  if (category === 'Crime') return 'crime';
  if (category === 'Road Hazard') return 'accident';
  if (category === 'Pollution') return 'flood';
  return 'infrastructure';
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
  const createdEntry = report.timeline.find((entry) => entry.status === 'Created');
  const reportedBy = createdEntry?.actor?.trim() || report.timeline[0]?.actor?.trim() || 'Citizen';

  return {
    id: report.id,
    type: mapIncidentType(report.category),
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
    reportedBy,
    affectedPersons: parseAffectedCount(report.affectedCount),
    mapX: 0,
    mapY: 0,
    lat: report.latitude,
    lng: report.longitude,
    source: report,
  };
}

const STATUS_TRANSITIONS: Record<ApiTicketStatus, ApiTicketStatus[]> = {
  Submitted: ['Under Review', 'Unresolvable'],
  'Under Review': ['In Progress', 'Resolved', 'Unresolvable'],
  'In Progress': ['Resolved', 'Unresolvable'],
  Resolved: [],
  Closed: [],
  Unresolvable: [],
};

const OPEN_TICKET_STATUSES = new Set<ApiTicketStatus>(['Submitted', 'Under Review', 'In Progress']);
type IncidentListView = 'open' | 'archived';

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
  const [statusSelectorOpen, setStatusSelectorOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ApiTicketStatus | ''>('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoName, setPreviewPhotoName] = useState<string>('');
  const availableStatuses = useMemo(
    () => STATUS_TRANSITIONS[incident.ticketStatus],
    [incident.ticketStatus],
  );
  const canUpdateStatus = availableStatuses.length > 0;

  useEffect(() => {
    setNextStatus(availableStatuses[0] ?? '');
    setStatusSelectorOpen(false);
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
  const photoEvidence = incident.source.evidence.filter((item) => item.kind === 'photo');
  const audioEvidence = incident.source.evidence.filter((item) => item.kind === 'audio');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.68)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 14,
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: 16,
          width: '100%',
          maxWidth: 760,
          maxHeight: '92vh',
          overflow: 'auto',
          boxShadow: '0 24px 70px rgba(15,23,42,0.33)',
        }}
      >
        <div style={{ background: '#1E3A8A', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FFFFFF', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeIcons[incident.type]}
              </div>
              <div>
                <div style={{ color: '#BFDBFE', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase' }}>Incident Details</div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{incident.id}</div>
              </div>
            </div>
            <div style={{ color: '#DBEAFE', fontSize: 12 }}>{incident.location}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close incident details"
            className="icon-btn-square"
            style={{ background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white' }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        <div style={{ padding: '12px 20px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TypeBadge type={incident.type} />
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} pulse={incident.status === 'active'} />
        </div>

        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ marginBottom: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.65 }}>
              {incident.description}
            </div>
          </div>

          <div style={{ marginBottom: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Evidence Attachments
            </div>

            {photoEvidence.length === 0 && audioEvidence.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: 12 }}>
                No evidence files are available for this report.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {photoEvidence.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 8 }}>
                      Photos ({photoEvidence.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                      {photoEvidence.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPreviewPhotoUrl(item.publicUrl);
                            setPreviewPhotoName(item.fileName);
                          }}
                          style={{
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            textDecoration: 'none',
                            padding: 0,
                            margin: 0,
                            cursor: 'zoom-in',
                          }}
                        >
                          <img
                            src={item.publicUrl}
                            alt={item.fileName}
                            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{ padding: '6px 8px', fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.fileName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {audioEvidence.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 8 }}>
                      Audio ({audioEvidence.length})
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {audioEvidence.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 8, background: '#F8FAFC' }}>
                          <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>{item.fileName}</div>
                          <audio controls src={item.publicUrl} style={{ width: '100%' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Barangay', value: incident.barangay, icon: <MapPin size={13} /> },
              { label: 'Reported By', value: incident.reportedBy, icon: <Users size={13} /> },
              { label: 'Reporter Verification', value: incident.source.reporterVerificationStatus.toUpperCase(), icon: <ShieldIcon size={13} /> },
              { label: 'Affected Persons', value: incident.affectedPersons !== undefined ? `${incident.affectedPersons} individual(s)` : 'Under assessment', icon: <Info size={13} /> },
              { label: 'Response Time', value: responseTime ? `${responseTime} minutes` : 'Not yet responded', icon: <Clock size={13} /> },
            ].map((item) => (
              <div key={item.label} style={{ background: '#FFFFFF', borderRadius: 10, padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Ticket Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {incident.source.timeline.map((entry) => (
                <div key={`${entry.label}-${entry.timestamp}`} style={{ borderLeft: '2px solid #DBE4EE', paddingLeft: 10, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -6, top: 3, width: 9, height: 9, borderRadius: 999, background: '#1E3A8A', border: '2px solid #FFFFFF' }} />
                  <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 700 }}>{entry.label}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{entry.description}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{formatTime(entry.timestamp)} • {entry.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canUpdateStatus ? (
            <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: 8, position: 'relative' }}>
              {statusSelectorOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 'calc(100% + 8px)',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    boxShadow: '0 16px 30px rgba(15,23,42,0.2)',
                    maxHeight: 200,
                    overflowY: 'auto',
                    zIndex: 120,
                  }}
                >
                  {availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setNextStatus(status);
                        setStatusSelectorOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: nextStatus === status ? '#EFF6FF' : '#FFFFFF',
                        color: nextStatus === status ? '#1E3A8A' : '#334155',
                        padding: '9px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                disabled={isUpdating || !canUpdateStatus}
                onClick={() => setStatusSelectorOpen((value) => !value)}
                style={{
                  width: '100%',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isUpdating || !canUpdateStatus ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{nextStatus || 'Select new status'}</span>
                <ChevronUp size={14} color="#64748B" />
              </button>

              <button
                disabled={!nextStatus || isUpdating || !canUpdateStatus}
                onClick={() => {
                  if (!nextStatus) {
                    return;
                  }
                  void onUpdateStatus(nextStatus);
                }}
                style={{
                  width: '100%',
                  background: '#1E3A8A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: !nextStatus || isUpdating || !canUpdateStatus ? 'not-allowed' : 'pointer',
                  opacity: !nextStatus || isUpdating || !canUpdateStatus ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Edit2 size={13} /> {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          ) : null}

          <button style={{ flex: canUpdateStatus ? 1 : '1 1 100%', minWidth: 100, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={13} /> Print Report
          </button>
        </div>

        {previewPhotoUrl ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Evidence photo preview"
            onClick={() => setPreviewPhotoUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 140,
              background: 'rgba(2,6,23,0.86)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(15,23,42,0.7)',
                color: '#fff',
                borderRadius: 999,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close photo preview"
            >
              <X size={16} />
            </button>
            <div onClick={(event) => event.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', display: 'grid', gap: 10 }}>
              <img
                src={previewPhotoUrl}
                alt={previewPhotoName}
                style={{ maxWidth: '100%', maxHeight: 'calc(100dvh - 92px)', borderRadius: 12 }}
              />
              <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600, textAlign: 'center' }}>
                {previewPhotoName}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Incidents() {
  const location = useLocation();
  const [incidents, setIncidents] = useState<IncidentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [listView, setListView] = useState<IncidentListView>('open');

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [sortKey, setSortKey] = useState<keyof IncidentView>('reportedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIncident, setSelectedIncident] = useState<IncidentView | null>(null);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const hasFilter = Boolean(search || filterCategory || filterSeverity || filterStatus);

  const { openCount, archivedCount } = useMemo(() => {
    const open = incidents.filter((incident) => OPEN_TICKET_STATUSES.has(incident.ticketStatus)).length;
    return {
      openCount: open,
      archivedCount: incidents.length - open,
    };
  }, [incidents]);
  const [pendingReportId, setPendingReportId] = useState<string | null>(() => {
    const routeState = location.state as { reportId?: unknown } | null;
    return typeof routeState?.reportId === 'string' ? routeState.reportId : null;
  });
  useEffect(() => {
    const routeState = location.state as { reportId?: unknown } | null;
    const reportId = typeof routeState?.reportId === 'string' ? routeState.reportId : null;
    setPendingReportId(reportId);
  }, [location.state]);

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

  useEffect(() => {
    if (!initialLoadPending) {
      return;
    }

    if (!loading) {
      setInitialLoadPending(false);
    }
  }, [initialLoadPending, loading]);

  useEffect(() => {
    const incidentId = new URLSearchParams(location.search).get('incident');
    if (!incidentId) {
      return;
    }

    setSearch(incidentId);
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    const incidentId = new URLSearchParams(location.search).get('incident');
    if (!incidentId || loading) {
      return;
    }

    const target = incidents.find((item) => item.id.toLowerCase() === incidentId.toLowerCase());
    if (target) {
      setSelectedIncident(target);
    }
  }, [incidents, loading, location.search]);

  useEffect(() => {
    if (!pendingReportId || loading) {
      return;
    }

    const localMatch = incidents.find((incident) => incident.id === pendingReportId);
    if (localMatch) {
      setSelectedIncident(localMatch);
      setPendingReportId(null);
      return;
    }

    let disposed = false;

    const openFromApi = async () => {
      try {
        const payload = await officialReportsApi.getReportById(pendingReportId);
        if (disposed) {
          return;
        }

        const mapped = toIncidentView(payload.report);
        setIncidents((current) => (current.some((item) => item.id === mapped.id) ? current : [mapped, ...current]));
        setSelectedIncident(mapped);
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Failed to open selected report.');
        }
      } finally {
        if (!disposed) {
          setPendingReportId(null);
        }
      }
    };

    void openFromApi();

    return () => {
      disposed = true;
    };
  }, [incidents, loading, pendingReportId]);

  const filtered = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (listView === 'open' && !OPEN_TICKET_STATUSES.has(inc.ticketStatus)) {
          return false;
        }

        if (listView === 'archived' && OPEN_TICKET_STATUSES.has(inc.ticketStatus)) {
          return false;
        }

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
        if (filterCategory && getCategoryLabelForIncidentType(inc.type) !== filterCategory) return false;
        if (filterSeverity && inc.severity !== filterSeverity) return false;
        if (filterStatus && inc.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const va = String(a[sortKey] ?? '');
        const vb = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [incidents, listView, search, filterCategory, filterSeverity, filterStatus, sortKey, sortDir]);

  const perPage = 10;
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

  const isVerifiedReporter = (incident: IncidentView) =>
    incident.source.reporterVerificationStatus.toLowerCase() === 'verified';

  if (initialLoadPending) {
    return (
      <div style={{ padding: '14px 16px', minHeight: '100%' }}>
        <TableSkeleton rows={8} columns={7} showHeader />
        <div style={{ marginTop: 14 }}>
          <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px', minHeight: '100%' }}>
      <div className="incidents-page-header" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Incident Management</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>
            {loading
              ? 'Loading reports...'
              : `${filtered.length} ${listView === 'open' ? 'active' : 'archived'} report${filtered.length !== 1 ? 's' : ''} found${hasFilter ? ' (filtered)' : ''}`}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setListView('open');
            setPage(1);
          }}
          style={{
            border: '1px solid #CBD5E1',
            background: listView === 'open' ? '#1E3A8A' : '#FFFFFF',
            color: listView === 'open' ? '#FFFFFF' : '#334155',
            borderRadius: 999,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Open Incidents ({openCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setListView('archived');
            setPage(1);
          }}
          style={{
            border: '1px solid #CBD5E1',
            background: listView === 'archived' ? '#1E3A8A' : '#FFFFFF',
            color: listView === 'archived' ? '#FFFFFF' : '#334155',
            borderRadius: 999,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Archived ({archivedCount})
        </button>
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
            label: 'All Categories',
            value: filterCategory,
            setter: (v: string) => {
              setFilterCategory(v);
              setPage(1);
            },
            options: CATEGORY_FILTER_OPTIONS.map((label) => ({ value: label, label })),
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
          <div
            key={f.label}
            style={{
              flex: '1 1 130px',
              minWidth: 0,
              width: '100%',
              position: 'relative',
            }}
          >
            <select
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 34px 10px 10px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                background: '#F8FAFC',
                color: f.value ? '#1E293B' : '#94A3B8',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                appearance: 'none',
              }}
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="#94A3B8"
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>
        ))}

        {hasFilter ? (
          <button
            onClick={() => {
              setSearch('');
              setFilterCategory('');
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
          <RefreshCw size={14} /> Refresh
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
                  <td colSpan={7} style={{ padding: 16 }}>
                    <TableSkeleton rows={6} columns={7} showHeader={false} className="border-0 shadow-none" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No reports match your filters.</td>
                </tr>
              ) : paginated.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}
                >
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontSize: 12 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#1E3A8A' }}>{inc.id}</span>
                      {isVerifiedReporter(inc) ? (
                        <span
                          title="Verified Reporter"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#1E3A8A',
                          }}
                          aria-label="Verified Reporter"
                        >
                          <ShieldIcon size={13} />
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><TypeBadge type={inc.type} size="sm" /></td>
                  <td style={{ padding: '11px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#1E293B', fontWeight: 500 }}>{inc.barangay}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>{inc.district}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                      style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600 }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="incidents-mobile-cards"
        style={{
          display: 'none',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {loading ? (
          <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
        ) : paginated.length === 0 ? (
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              padding: '22px 16px',
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: 13,
            }}
          >
            No reports match your filters.
          </div>
        ) : (
          paginated.map((inc) => (
            <article
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              style={{
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                padding: '12px 12px 10px',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'grid', gap: 5 }}>
                  <div style={{ color: '#1E3A8A', fontWeight: 700, fontSize: 12 }}>{inc.id}</div>
                  {isVerifiedReporter(inc) ? (
                    <span
                      title="Verified Reporter"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: '#1E3A8A',
                      }}
                      aria-label="Verified Reporter"
                    >
                      <ShieldIcon size={13} />
                    </span>
                  ) : null}
                </div>
                <StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <TypeBadge type={inc.type} size="sm" />
                <SeverityBadge severity={inc.severity} size="sm" />
              </div>

              <div style={{ color: '#1E293B', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{inc.barangay}</div>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>{inc.location}</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ color: '#94A3B8', fontSize: 11 }}>
                  {new Date(inc.reportedAt).toLocaleString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </div>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedIncident(inc);
                }}
                style={{
                  width: '100%',
                  background: '#EFF6FF',
                  color: '#1E3A8A',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ChevronRight size={13} /> View Details
              </button>
            </article>
          ))
        )}
      </div>

      {selectedIncident ? (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updatingIncidentId === selectedIncident.id}
        />
      ) : null}
      {!loading && filtered.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                background: page === 1 ? '#F8FAFC' : '#FFFFFF',
                color: page === 1 ? '#94A3B8' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 12px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <div style={{ minWidth: 72, textAlign: 'center', fontSize: 12, color: '#334155', fontWeight: 700 }}>
              Page {page} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                background: page === totalPages ? '#F8FAFC' : '#FFFFFF',
                color: page === totalPages ? '#94A3B8' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 12px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
