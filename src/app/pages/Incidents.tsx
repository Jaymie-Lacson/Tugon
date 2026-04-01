import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
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
  const { t } = useTranslation();
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/[0.68] p-3.5 backdrop-blur-[3px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] max-h-[92vh] overflow-auto rounded-2xl bg-slate-50 shadow-[0_24px_70px_rgba(15,23,42,0.33)]">
        {/* Header */}
        <div className="flex items-start justify-between rounded-t-2xl bg-primary px-5 py-[18px]">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-white ${
                cfg.label === 'Flood' ? 'text-blue-700' :
                cfg.label === 'Accident' ? 'text-severity-medium' :
                cfg.label === 'Medical' ? 'text-teal-700' :
                cfg.label === 'Crime' ? 'text-violet-700' :
                cfg.label === 'Infrastructure' ? 'text-slate-600' :
                'text-sky-700'
              }`}>
                {typeIcons[incident.type]}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200">{t('official.incidents.details')}</div>
                <div className="text-base font-extrabold text-white">{incident.id}</div>
              </div>
            </div>
            <div className="text-xs text-blue-100">{incident.location}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('official.incidents.closeDetails')}
            className="icon-btn-square rounded-lg border-none bg-white/[0.16] text-white cursor-pointer"
          >
            <X size={16} color="white" />
          </button>
        </div>

        {/* Badge bar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-100 px-5 py-3">
          <TypeBadge type={incident.type} />
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} pulse={incident.status === 'active'} />
        </div>

        {/* Body */}
        <div className="px-5 pt-[18px] pb-5">
          {/* Description */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('official.incidents.descriptionLabel')}</div>
            <div className="text-[13px] leading-[1.65] text-slate-700">
              {incident.description}
            </div>
          </div>

          {/* Evidence */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t('official.incidents.evidenceAttachments')}
            </div>

            {photoEvidence.length === 0 && audioEvidence.length === 0 ? (
              <div className="text-xs text-slate-500">
                {t('official.incidents.noEvidence')}
              </div>
            ) : (
              <div className="grid gap-3">
                {photoEvidence.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold text-slate-600">
                      {t('official.incidents.photos', { count: photoEvidence.length })}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                      {photoEvidence.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPreviewPhotoUrl(item.publicUrl);
                            setPreviewPhotoName(item.fileName);
                          }}
                          className="cursor-[zoom-in] overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 p-0 m-0"
                        >
                          <img
                            src={item.publicUrl}
                            alt={item.fileName}
                            className="block h-[110px] w-full object-cover"
                          />
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1.5 text-[10px] text-slate-600">
                            {item.fileName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {audioEvidence.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold text-slate-600">
                      {t('official.incidents.audio', { count: audioEvidence.length })}
                    </div>
                    <div className="grid gap-2">
                      {audioEvidence.map((item) => (
                        <div key={item.id} className="rounded-[10px] border border-slate-200 bg-slate-50 p-2">
                          <div className="mb-1.5 text-[10px] text-slate-600">{item.fileName}</div>
                          <audio controls src={item.publicUrl} className="w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
            {[
              { label: t('official.incidents.barangayLabel'), value: incident.barangay, icon: <MapPin size={13} /> },
              { label: t('official.incidents.reportedByLabel'), value: incident.reportedBy, icon: <Users size={13} /> },
              { label: t('official.incidents.reporterVerification'), value: incident.source.reporterVerificationStatus.toUpperCase(), icon: <ShieldIcon size={13} /> },
              { label: t('official.incidents.affectedPersons'), value: incident.affectedPersons !== undefined ? t('official.incidents.affectedValue', { count: incident.affectedPersons }) : t('official.incidents.underAssessment'), icon: <Info size={13} /> },
              { label: t('official.incidents.responseTime'), value: responseTime ? t('official.incidents.responseTimeValue', { minutes: responseTime }) : t('official.incidents.notYetResponded'), icon: <Clock size={13} /> },
            ].map((item) => (
              <div key={item.label} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2.5">
                <div className="mb-[5px] flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {item.icon} {item.label}
                </div>
                <div className="text-xs font-medium text-slate-700">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('official.incidents.ticketTimeline')}</div>
            <div className="flex flex-col gap-2.5">
              {incident.source.timeline.map((entry) => (
                <div key={`${entry.label}-${entry.timestamp}`} className="relative border-l-2 border-[#DBE4EE] pl-2.5">
                  <div className="absolute -left-[6px] top-[3px] h-[9px] w-[9px] rounded-full border-2 border-white bg-primary" />
                  <div className="text-xs font-bold text-slate-800">{entry.label}</div>
                  <div className="mt-[1px] text-[11px] text-slate-500">{entry.description}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{formatTime(entry.timestamp)} • {entry.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2.5 border-t border-slate-100 px-5 py-3.5">
          {canUpdateStatus ? (
            <div className="relative grid min-w-[180px] flex-1 gap-2">
              {statusSelectorOpen ? (
                <div className="absolute inset-x-0 bottom-[calc(100%+8px)] z-[120] max-h-[200px] overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
                  {availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setNextStatus(status);
                        setStatusSelectorOpen(false);
                      }}
                      className={`w-full border-none px-3 py-[9px] text-left text-xs font-semibold cursor-pointer ${
                        nextStatus === status ? 'bg-blue-50 text-primary' : 'bg-white text-slate-700'
                      }`}
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
                className={`flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 ${
                  isUpdating || !canUpdateStatus ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span>{nextStatus || t('official.incidents.selectNewStatus')}</span>
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
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg border-none bg-primary px-4 py-[9px] text-xs font-semibold text-white ${
                  !nextStatus || isUpdating || !canUpdateStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <Edit2 size={13} /> {isUpdating ? t('official.incidents.updating') : t('official.incidents.updateStatus')}
              </button>
            </div>
          ) : null}

          <button
            className={`flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-[9px] text-xs font-semibold text-slate-600 cursor-pointer ${canUpdateStatus ? 'flex-1' : 'flex-[1_1_100%]'}`}
          >
            <Printer size={13} /> {t('official.incidents.printReport')}
          </button>
        </div>

        {/* Photo preview lightbox */}
        {previewPhotoUrl ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('official.incidents.evidencePhotoPreview')}
            onClick={() => setPreviewPhotoUrl(null)}
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/[0.86] p-[18px]"
          >
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-slate-900/70 text-white cursor-pointer"
              aria-label={t('official.incidents.closePhotoPreview')}
            >
              <X size={16} />
            </button>
            <div onClick={(event) => event.stopPropagation()} className="grid max-h-full max-w-full gap-2.5">
              <img
                src={previewPhotoUrl}
                alt={previewPhotoName}
                className="max-w-full rounded-xl"
                style={{ maxHeight: 'calc(100dvh - 92px)' }}
              />
              <div className="text-center text-xs font-semibold text-slate-200">
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
  const { t } = useTranslation();
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
  const [contextMenu, setContextMenu] = useState<{
    incident: IncidentView;
    x: number;
    y: number;
  } | null>(null);
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

  const loadReports = React.useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      const mapped = payload.reports.map((report) => toIncidentView(report));
      setIncidents(mapped);
      setSelectedIncident((current) => {
        if (!current) {
          return current;
        }
        return mapped.find((incident) => incident.id === current.id) ?? current;
      });
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load reports.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const disconnect = officialReportsApi.connectReportsStream(() => {
      void loadReports(true);
    });

    return () => {
      disconnect();
    };
  }, [loadReports]);

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

    setContextMenu(null);

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

  const updateIncidentStatus = async (incident: IncidentView, nextStatus: ApiTicketStatus) => {
    setContextMenu(null);

    setUpdatingIncidentId(incident.id);
    setError(null);
    try {
      const updated = await officialReportsApi.updateReportStatus(incident.id, { status: nextStatus });
      const mapped = toIncidentView(updated.report);
      setIncidents((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
      setSelectedIncident((current) => (current?.id === mapped.id ? mapped : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeMenu = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  const getArchiveTargetStatus = (incident: IncidentView): ApiTicketStatus | null => {
    const allowed = STATUS_TRANSITIONS[incident.ticketStatus];
    if (allowed.includes('Resolved')) {
      return 'Resolved';
    }
    if (allowed.includes('Unresolvable')) {
      return 'Unresolvable';
    }
    if (allowed.includes('Closed')) {
      return 'Closed';
    }
    return null;
  };

  const SortIcon = ({ k }: { k: keyof IncidentView }) => {
    if (sortKey !== k) return <ChevronsUpDown size={12} color="#CBD5E1" />;
    return sortDir === 'asc' ? <ChevronUp size={12} color="var(--primary)" /> : <ChevronDown size={12} color="var(--primary)" />;
  };

  const isVerifiedReporter = (incident: IncidentView) =>
    incident.source.reporterVerificationStatus.toLowerCase() === 'verified';

  if (initialLoadPending) {
    return (
      <div className="min-h-full px-4 py-3.5">
        <TableSkeleton rows={8} columns={7} showHeader />
        <div className="mt-3.5">
          <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-3.5">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h1 className="mb-0.5 text-xl font-bold text-slate-800">{t('official.incidents.pageTitle')}</h1>
          <p className="text-xs text-slate-500">
            {loading
              ? t('official.incidents.loadingReports')
              : listView === 'open'
                ? (filtered.length === 1
                  ? (hasFilter ? t('official.incidents.activeReportsFound', { count: filtered.length }) : t('official.incidents.activeReportsFoundUnfiltered', { count: filtered.length }))
                  : (hasFilter ? t('official.incidents.activeReportsFoundPluralFiltered', { count: filtered.length }) : t('official.incidents.activeReportsFoundPlural', { count: filtered.length })))
                : (filtered.length === 1
                  ? (hasFilter ? t('official.incidents.archivedReportsFound', { count: filtered.length }) : t('official.incidents.archivedReportsFoundUnfiltered', { count: filtered.length }))
                  : (hasFilter ? t('official.incidents.archivedReportsFoundPluralFiltered', { count: filtered.length }) : t('official.incidents.archivedReportsFoundPlural', { count: filtered.length })))}
          </p>
        </div>
      </div>

      {/* List view toggle */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setListView('open');
            setPage(1);
          }}
          className={`rounded-full border border-slate-300 px-3 py-2 text-xs font-bold cursor-pointer ${
            listView === 'open' ? 'bg-primary text-white' : 'bg-white text-slate-700'
          }`}
        >
          {t('official.incidents.openIncidents', { count: openCount })}
        </button>
        <button
          type="button"
          onClick={() => {
            setListView('archived');
            setPage(1);
          }}
          className={`rounded-full border border-slate-300 px-3 py-2 text-xs font-bold cursor-pointer ${
            listView === 'archived' ? 'bg-primary text-white' : 'bg-white text-slate-700'
          }`}
        >
          {t('official.incidents.archived', { count: archivedCount })}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        <div className="relative flex-[2_1_200px]">
          <Search size={14} color="#94A3B8" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('official.incidents.searchPlaceholderTable')}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-8 text-[13px] text-slate-800 outline-none"
          />
        </div>

        {[
          {
            label: t('official.incidents.allCategories'),
            value: filterCategory,
            setter: (v: string) => {
              setFilterCategory(v);
              setPage(1);
            },
            options: CATEGORY_FILTER_OPTIONS.map((label) => ({ value: label, label })),
          },
          {
            label: t('official.incidents.allSeverity'),
            value: filterSeverity,
            setter: (v: string) => {
              setFilterSeverity(v as Severity | '');
              setPage(1);
            },
            options: Object.entries(severityConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
          {
            label: t('official.incidents.allStatus'),
            value: filterStatus,
            setter: (v: string) => {
              setFilterStatus(v as IncidentStatus | '');
              setPage(1);
            },
            options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
        ].map((f) => (
          <div key={f.label} className="relative w-full min-w-0 flex-[1_1_130px]">
            <select
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              aria-label={f.label}
              className={`w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-[34px] pl-2.5 text-[13px] outline-none ${
                f.value ? 'text-slate-800' : 'text-slate-400'
              }`}
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
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
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
            className="flex items-center gap-1 whitespace-nowrap rounded-lg border-none bg-red-100 px-3.5 py-2.5 text-[13px] font-semibold text-red-700 cursor-pointer"
          >
            <X size={14} /> {t('official.incidents.clear')}
          </button>
        ) : null}

        <button
          onClick={() => {
            void loadReports();
          }}
          className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600 cursor-pointer"
        >
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      {/* Desktop table */}
      <div className="incidents-table-wrapper mb-3.5 overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                {[
                  { key: 'id' as keyof IncidentView, label: t('official.incidents.incidentIdCol') },
                  { key: 'type' as keyof IncidentView, label: t('official.incidents.typeCol') },
                  { key: 'barangay' as keyof IncidentView, label: t('official.incidents.locationCol') },
                  { key: 'severity' as keyof IncidentView, label: t('official.incidents.severityCol') },
                  { key: 'status' as keyof IncidentView, label: t('official.incidents.statusCol') },
                  { key: 'reportedAt' as keyof IncidentView, label: t('official.incidents.reportedCol') },
                  { key: null, label: t('official.incidents.actionsCol') },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key)}
                    className={`whitespace-nowrap border-b-2 border-slate-100 px-3.5 py-[11px] text-left text-[11px] font-semibold tracking-wide select-none ${
                      sortKey === col.key ? 'text-primary' : 'text-slate-500'
                    } ${col.key ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="flex items-center gap-1">
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
                  <td colSpan={7} className="p-4">
                    <TableSkeleton rows={6} columns={7} showHeader={false} className="border-0 shadow-none" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[13px] text-slate-400">{t('official.incidents.noMatchFilters')}</td>
                </tr>
              ) : paginated.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    const canShowContextMenu = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
                    if (!canShowContextMenu) {
                      return;
                    }

                    setContextMenu({
                      incident: inc,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3.5 py-[11px] text-xs">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-primary">{inc.id}</span>
                      {isVerifiedReporter(inc) ? (
                        <span title="Verified Reporter" className="inline-flex items-center text-primary" aria-label="Verified Reporter">
                          <ShieldIcon size={13} />
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3.5 py-[11px]"><TypeBadge type={inc.type} size="sm" /></td>
                  <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap px-3.5 py-[11px]">
                    <div className="font-medium text-slate-800">{inc.barangay}</div>
                    <div className="text-[10px] text-slate-400">{inc.district}</div>
                  </td>
                  <td className="px-3.5 py-[11px]"><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td className="px-3.5 py-[11px]"><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td className="whitespace-nowrap px-3.5 py-[11px] text-slate-500">{new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  <td className="px-3.5 py-[11px]">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                      className="flex items-center gap-[3px] rounded-md border-none bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary cursor-pointer"
                    >
                      <Edit2 size={12} /> {t('official.incidents.editBtn')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu ? (
        <div
          role="menu"
          aria-label={`Actions for ${contextMenu.incident.id}`}
          onClick={(event) => event.stopPropagation()}
          className="fixed z-[160] min-w-[180px] rounded-[10px] border border-slate-300 bg-white p-1.5 shadow-[0_16px_30px_rgba(15,23,42,0.22)]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedIncident(contextMenu.incident);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-1.5 rounded-lg border-none bg-white px-2.5 py-[9px] text-left text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Edit2 size={13} /> {t('official.incidents.openEditIncident')}
          </button>

          <button
            type="button"
            disabled={!getArchiveTargetStatus(contextMenu.incident) || updatingIncidentId === contextMenu.incident.id}
            onClick={() => {
              const archiveStatus = getArchiveTargetStatus(contextMenu.incident);
              if (!archiveStatus) {
                return;
              }
              void updateIncidentStatus(contextMenu.incident, archiveStatus);
            }}
            className={`flex w-full items-center gap-1.5 rounded-lg border-none bg-white px-2.5 py-[9px] text-left text-xs font-semibold ${
              !getArchiveTargetStatus(contextMenu.incident) ? 'text-slate-400' : 'text-amber-700'
            } ${
              !getArchiveTargetStatus(contextMenu.incident) || updatingIncidentId === contextMenu.incident.id ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Clock size={13} />
            {updatingIncidentId === contextMenu.incident.id ? t('official.incidents.archiving') : t('official.incidents.archiveIncident')}
          </button>
        </div>
      ) : null}

      {/* Mobile cards (hidden by default, shown via parent CSS) */}
      <div className="incidents-mobile-cards mb-3.5 hidden flex-col gap-2.5">
        {loading ? (
          <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
        ) : paginated.length === 0 ? (
          <div className="rounded-xl bg-white px-4 py-[22px] text-center text-[13px] text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
            {t('official.incidents.noMatchFilters')}
          </div>
        ) : (
          paginated.map((inc) => (
            <article
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 pb-2.5 pt-3 shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="grid gap-[5px]">
                  <div className="text-xs font-bold text-primary">{inc.id}</div>
                  {isVerifiedReporter(inc) ? (
                    <span title="Verified Reporter" className="inline-flex items-center text-primary" aria-label="Verified Reporter">
                      <ShieldIcon size={13} />
                    </span>
                  ) : null}
                </div>
                <StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} />
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                <TypeBadge type={inc.type} size="sm" />
                <SeverityBadge severity={inc.severity} size="sm" />
              </div>

              <div className="mb-1 text-xs font-semibold text-slate-800">{inc.barangay}</div>
              <div className="mb-1.5 text-xs text-slate-500">{inc.location}</div>

              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
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
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-none bg-blue-50 px-3 py-[9px] text-xs font-semibold text-primary cursor-pointer"
              >
                <ChevronRight size={13} /> {t('official.incidents.viewDetails')}
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

      {/* Pagination */}
      {!loading && filtered.length > 0 ? (
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <div className="text-xs text-slate-500">
            {t('official.incidents.showingRange', { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, filtered.length), total: filtered.length })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className={`rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold ${
                page === 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 cursor-pointer'
              }`}
            >
              {t('official.incidents.previous')}
            </button>
            <div className="min-w-[72px] text-center text-xs font-bold text-slate-700">
              {t('official.incidents.page', { page, total: totalPages })}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className={`rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold ${
                page === totalPages ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 cursor-pointer'
              }`}
            >
              {t('official.incidents.next')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
