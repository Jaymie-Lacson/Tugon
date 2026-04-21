import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import {
  Edit2, Printer, RefreshCw,
  ChevronDown, ChevronUp, ChevronsUpDown, X,
  ChevronRight,
  Users, Clock, MapPin, Info, Droplets, Car, Heart, Shield as ShieldIcon, Zap,
} from 'lucide-react';
import { SearchInput } from '../components/ui/search-input';
import {
  Incident, IncidentType, Severity, IncidentStatus,
  incidentTypeConfig, severityConfig, statusConfig,
} from '../data/incidents';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import CardSkeleton from '../components/ui/CardSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import { OfficialPageHeader } from '../components/OfficialPageHeader';
import type { ApiCitizenReport, ApiTicketStatus } from '../services/citizenReportsApi';
import { officialReportsApi } from '../services/officialReportsApi';
import type { ReportCategory } from '../data/reportTaxonomy';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';
import { useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficialReports, officialReportsKeys } from '../hooks/useOfficialReportsQueries';

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
      className="fixed inset-x-0 z-[2600] flex items-center justify-center bg-[rgba(15,23,42,0.68)] p-3.5 backdrop-blur-[4px] top-[var(--app-vv-top,0px)] bottom-[var(--app-vv-bottom-gap,0px)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-[760px] overflow-auto rounded-2xl bg-[var(--surface-container-low)] shadow-[0_24px_70px_rgba(15,23,42,0.33)]">
        {/* Header */}
        <div className="flex items-start justify-between border-t-[3px] border-t-[#2563EB] border-b border-border bg-card px-5 py-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('official.incidents.details')}</div>
            <div className="font-mono text-base font-extrabold text-primary">{incident.id}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{incident.location}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close incident details"
            className="icon-btn-square cursor-pointer rounded-lg border border-border bg-card text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Badge bar */}
        <div className="flex flex-wrap gap-2 bg-[var(--surface-container-high)] px-5 py-3 shadow-[inset_0_-1px_0_rgba(197,197,211,0.22)]">
          <TypeBadge type={incident.type} />
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} pulse={incident.status === 'active'} />
        </div>

        {/* Body */}
        <div className="px-5 pt-[18px] pb-5">
          {/* Description */}
          <div className="mb-4 border border-border bg-card px-3.5 py-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--outline)]">{t('official.incidents.descriptionLabel')}</div>
            <div className="text-[13px] leading-[1.65] text-[var(--on-surface-variant)]">
              {incident.description}
            </div>
          </div>

          {/* Evidence */}
          <div className="mb-4 border border-border bg-card px-3.5 py-3">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--outline)]">
              {t('official.incidents.evidenceAttachments')}
            </div>

            {photoEvidence.length === 0 && audioEvidence.length === 0 ? (
              <div className="text-xs text-[var(--on-surface-variant)]">
                {t('official.incidents.noEvidence')}
              </div>
            ) : (
              <div className="grid gap-3">
                {photoEvidence.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold text-[var(--on-surface-variant)]">
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
                          className="cursor-[zoom-in] overflow-hidden rounded-[10px] border border-[var(--outline-variant)]/35 bg-[var(--surface-container-low)] p-0 m-0"
                        >
                          <img
                            src={item.publicUrl}
                            alt={item.fileName}
                            className="block h-[110px] w-full object-cover"
                          />
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1.5 text-[10px] text-[var(--on-surface-variant)]">
                            {item.fileName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {audioEvidence.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold text-[var(--on-surface-variant)]">
                      {t('official.incidents.audio', { count: audioEvidence.length })}
                    </div>
                    <div className="grid gap-2">
                      {audioEvidence.map((item) => (
                        <div key={item.id} className="rounded-[10px] bg-[var(--surface-container-low)] p-2">
                          <div className="mb-1.5 text-[10px] text-[var(--on-surface-variant)]">{item.fileName}</div>
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
              <div key={item.label} className="border border-border bg-card px-3 py-2.5">
                <div className="mb-[5px] flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-wide text-[var(--outline)]">
                  {item.icon} {item.label}
                </div>
                <div className="text-xs font-medium text-[var(--on-surface-variant)]">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="border border-border bg-card px-3.5 py-3">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--outline)]">{t('official.incidents.ticketTimeline')}</div>
            <div className="flex flex-col gap-2.5">
              {incident.source.timeline.map((entry) => (
                <div key={`${entry.label}-${entry.timestamp}`} className="relative border-l-2 border-[var(--surface-container-high)] pl-2.5">
                  <div className="absolute -left-[6px] top-[3px] h-[9px] w-[9px] rounded-full border-2 border-white bg-primary" />
                  <div className="text-xs font-bold text-[var(--on-surface)]">{entry.label}</div>
                  <div className="mt-[1px] text-[11px] text-[var(--outline)]">{entry.description}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--outline)]">{formatTime(entry.timestamp)} • {entry.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2.5 bg-[var(--surface-container-high)] px-5 py-3.5">
          {canUpdateStatus ? (
            <div className="relative grid min-w-[180px] flex-1 gap-2">
              {statusSelectorOpen ? (
                <div className="absolute inset-x-0 bottom-[calc(100%+8px)] z-[120] max-h-[200px] overflow-y-auto rounded-lg bg-[var(--surface-container-lowest)] shadow-[0_16px_30px_rgba(15,23,42,0.2)]">
                  {availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setNextStatus(status);
                        setStatusSelectorOpen(false);
                      }}
                      className={`w-full border-none px-3 py-[9px] text-left text-xs font-semibold cursor-pointer ${
                        nextStatus === status ? 'bg-[var(--surface-container-high)] text-primary' : 'bg-card text-[var(--on-surface-variant)]'
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
                className={`flex w-full items-center justify-between rounded-lg border-none bg-[var(--surface-container-lowest)] px-2.5 py-2 text-xs font-bold text-[var(--on-surface)] shadow-[inset_0_0_0_1px_rgba(197,197,211,0.3)] ${
                  isUpdating || !canUpdateStatus ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span>{nextStatus || t('official.incidents.selectNewStatus')}</span>
                <ChevronUp size={14} className="text-[var(--outline)]" />
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
            className={`flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-low)] px-4 py-[9px] text-xs font-semibold text-[var(--on-surface-variant)] ${canUpdateStatus ? 'flex-1' : 'basis-full flex-auto'}`}
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
            className="fixed inset-x-0 z-[2700] flex items-center justify-center bg-[rgba(13,28,46,0.76)] p-[18px] backdrop-blur-[2px] top-[var(--app-vv-top,0px)] bottom-[var(--app-vv-bottom-gap,0px)]"
          >
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface-container-lowest)] text-[var(--on-surface)] shadow-[inset_0_0_0_1px_rgba(197,197,211,0.42)]"
              aria-label={t('official.incidents.closePhotoPreview')}
            >
              <X size={16} />
            </button>
            <div onClick={(event) => event.stopPropagation()} className="grid max-h-full max-w-full gap-2.5">
              <img
                src={previewPhotoUrl}
                alt={previewPhotoName}
                className="max-w-full max-h-[calc(100dvh-92px-var(--app-vv-top,0px)-var(--app-vv-bottom-gap,0px))] rounded-xl shadow-[0_20px_44px_rgba(13,28,46,0.36)]"
              />
              <div className="text-center text-xs font-semibold text-white/90">
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
  const queryClient = useQueryClient();

  const [listView, setListView] = useState<IncidentListView>('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [sortKey, setSortKey] = useState<keyof IncidentView>('reportedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIncident, setSelectedIncident] = useState<IncidentView | null>(null);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    incident: IncidentView;
    x: number;
    y: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const hasFilter = Boolean(search || filterCategory || filterSeverity || filterStatus);

  const [pendingReportId, setPendingReportId] = useState<string | null>(() => {
    const routeState = location.state as { reportId?: unknown } | null;
    return typeof routeState?.reportId === 'string' ? routeState.reportId : null;
  });
  useEffect(() => {
    const routeState = location.state as { reportId?: unknown } | null;
    const reportId = typeof routeState?.reportId === 'string' ? routeState.reportId : null;
    setPendingReportId(reportId);
  }, [location.state]);

  // Debounce search → debouncedSearch to drive the query key
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const { data: reportsData, isLoading, isFetching, error: reportsError } = useOfficialReports(
    debouncedSearch ? { search: debouncedSearch } : undefined,
  );

  const incidents = useMemo(
    () => (reportsData?.reports ?? []).map(toIncidentView),
    [reportsData],
  );

  const loading = isFetching;
  const error = reportsError ? (reportsError instanceof Error ? reportsError.message : 'Failed to load reports.') : statusError;
  const initialLoadPending = isLoading && !reportsData;

  // Keep selectedIncident in sync when list refreshes
  useEffect(() => {
    if (!selectedIncident) return;
    const refreshed = incidents.find((item) => item.id === selectedIncident.id);
    if (refreshed) setSelectedIncident(refreshed);
  }, [incidents]);

  // SSE stream → invalidate query
  useEffect(() => {
    const disconnect = officialReportsApi.connectReportsStream(() => {
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reports() });
    });
    return () => disconnect();
  }, [queryClient]);

  const { openCount, archivedCount } = useMemo(() => {
    const open = incidents.filter((incident) => OPEN_TICKET_STATUSES.has(incident.ticketStatus)).length;
    return { openCount: open, archivedCount: incidents.length - open };
  }, [incidents]);

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
        setSelectedIncident(mapped);
        void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reports() });
      } catch (err) {
        if (!disposed) {
          setStatusError(err instanceof Error ? err.message : 'Failed to open selected report.');
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
  }, [incidents, listView, filterCategory, filterSeverity, filterStatus, sortKey, sortDir]);

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
    setStatusError(null);
    try {
      const updated = await officialReportsApi.updateReportStatus(selectedIncident.id, { status: nextStatus });
      const mapped = toIncidentView(updated.report);
      setSelectedIncident(mapped);
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reports() });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const updateIncidentStatus = async (incident: IncidentView, nextStatus: ApiTicketStatus) => {
    setContextMenu(null);
    setUpdatingIncidentId(incident.id);
    setStatusError(null);
    try {
      await officialReportsApi.updateReportStatus(incident.id, { status: nextStatus });
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reports() });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status.');
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
    if (sortKey !== k) return <ChevronsUpDown size={12} className="text-[var(--outline-variant)]" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  const isVerifiedReporter = (incident: IncidentView) =>
    incident.source.reporterVerificationStatus.toLowerCase() === 'verified';

  if (initialLoadPending) {
    return (
      <div className="min-h-full bg-[var(--surface)] px-4 py-4">
        <TableSkeleton rows={8} columns={7} showHeader />
        <div className="mt-3.5">
          <CardSkeleton count={3} lines={3} showImage={false} gridClassName="grid grid-cols-1 gap-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content min-h-full bg-[var(--surface)] px-4 py-4">
      <OfficialPageHeader
        title={t('official.incidents.pageTitle')}
        subtitle={
          loading
            ? t('official.incidents.loadingReports')
            : listView === 'open'
              ? (filtered.length === 1
                ? (hasFilter ? t('official.incidents.activeReportsFound', { count: filtered.length }) : t('official.incidents.activeReportsFoundUnfiltered', { count: filtered.length }))
                : (hasFilter ? t('official.incidents.activeReportsFoundPluralFiltered', { count: filtered.length }) : t('official.incidents.activeReportsFoundPlural', { count: filtered.length })))
              : (filtered.length === 1
                ? (hasFilter ? t('official.incidents.archivedReportsFound', { count: filtered.length }) : t('official.incidents.archivedReportsFoundUnfiltered', { count: filtered.length }))
                : (hasFilter ? t('official.incidents.archivedReportsFoundPluralFiltered', { count: filtered.length }) : t('official.incidents.archivedReportsFoundPlural', { count: filtered.length })))
        }
      />

      {/* List view toggle */}
      <div className="mb-3 flex w-fit max-w-full flex-wrap border-b border-border">
        <button
          type="button"
          onClick={() => {
            setListView('open');
            setPage(1);
          }}
          className={`cursor-pointer border-none bg-transparent px-3.5 py-2 text-xs font-bold ${
            listView === 'open'
              ? '-mb-px border-b-2 border-primary text-primary'
              : 'text-[var(--on-surface-variant)]'
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
          className={`cursor-pointer border-none bg-transparent px-3.5 py-2 text-xs font-bold ${
            listView === 'archived'
              ? '-mb-px border-b-2 border-primary text-primary'
              : 'text-[var(--on-surface-variant)]'
          }`}
        >
          {t('official.incidents.archived', { count: archivedCount })}
        </button>
      </div>

      {error ? (
        <div role="alert" className="mb-3 border-l-4 border-[var(--severity-critical)] bg-[var(--error-container)] px-3 py-2.5 text-[13px] font-semibold text-[var(--severity-critical)]">
          {error}
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border border-border bg-card px-3.5 py-3">
        <div className="flex-[2_1_200px]">
          <SearchInput
            value={search}
            onValueChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            loading={isFetching}
            shortcut="/"
            placeholder={t('official.incidents.searchPlaceholderTable')}
            aria-label={t('official.incidents.searchPlaceholderTable')}
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
              aria-label={f.label}
              title={f.label}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              className={`w-full cursor-pointer appearance-none rounded-lg border-none bg-[var(--surface-container-low)] py-2.5 pr-[34px] pl-2.5 text-[13px] outline-none shadow-[inset_0_0_0_1px_rgba(197,197,211,0.24)] ${
                f.value ? 'text-[var(--on-surface)]' : 'text-[var(--outline)]'
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
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--outline)]"
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
            className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-[var(--error-container)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--error)]"
          >
            <X size={14} /> {t('official.incidents.clear')}
          </button>
        ) : null}

        <button
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reports() });
          }}
          className="ml-auto flex cursor-pointer items-center gap-1 rounded-lg border-none bg-[var(--surface-container-low)] px-3.5 py-2.5 text-xs font-semibold text-[var(--on-surface-variant)]"
        >
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      {/* Desktop table */}
      <div className="incidents-table-wrapper mb-3.5 overflow-hidden border border-t-2 border-t-foreground border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--surface-container-low)]">
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
                    className={`whitespace-nowrap border-b border-[var(--outline-variant)]/25 px-3.5 py-[11px] text-left text-[11px] font-semibold tracking-wide select-none ${
                      sortKey === col.key ? 'text-primary' : 'text-[var(--outline)]'
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
                  <td colSpan={7} className="py-10 text-center text-[13px] text-[var(--outline)]">{t('official.incidents.noMatchFilters')}</td>
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

                    document.documentElement.style.setProperty('--context-menu-top', `${event.clientY}px`);
                    document.documentElement.style.setProperty('--context-menu-left', `${event.clientX}px`);

                    setContextMenu({
                      incident: inc,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  className="cursor-pointer transition-colors odd:bg-[var(--surface-container-lowest)] even:bg-[var(--surface-container-low)]/55 hover:bg-[var(--surface-container-high)]/55"
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
                    <div className="font-medium text-[var(--on-surface)]">{inc.barangay}</div>
                    <div className="text-[10px] text-[var(--outline)]">{inc.district}</div>
                  </td>
                  <td className="px-3.5 py-[11px]"><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td className="px-3.5 py-[11px]"><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td className="whitespace-nowrap px-3.5 py-[11px] text-[var(--outline)]">{new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  <td className="px-3.5 py-[11px]">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                      className="flex cursor-pointer items-center gap-[3px] rounded-md border-none bg-[var(--surface-container-high)] px-2.5 py-1.5 text-[11px] font-semibold text-primary"
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
          className="fixed z-[2800] min-w-[180px] rounded-[10px] bg-[var(--surface-container-lowest)] p-1.5 shadow-[0_16px_30px_rgba(15,23,42,0.22)] top-[var(--context-menu-top,0px)] left-[var(--context-menu-left,0px)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setSelectedIncident(contextMenu.incident);
              setContextMenu(null);
            }}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-lowest)] px-2.5 py-[9px] text-left text-xs font-semibold text-[var(--on-surface)]"
          >
            <Edit2 size={13} /> {t('official.incidents.openEditIncident')}
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!getArchiveTargetStatus(contextMenu.incident) || updatingIncidentId === contextMenu.incident.id}
            onClick={() => {
              const archiveStatus = getArchiveTargetStatus(contextMenu.incident);
              if (!archiveStatus) {
                return;
              }
              void updateIncidentStatus(contextMenu.incident, archiveStatus);
            }}
            className={`flex w-full items-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-lowest)] px-2.5 py-[9px] text-left text-xs font-semibold ${
              !getArchiveTargetStatus(contextMenu.incident) ? 'text-[var(--outline)]' : 'text-amber-700'
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
          <div className="border border-border bg-card px-4 py-[22px] text-center text-[13px] text-[var(--on-surface-variant)]">
            {t('official.incidents.noMatchFilters')}
          </div>
        ) : (
          paginated.map((inc) => (
            <article
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className="cursor-pointer border border-border bg-card px-3 pb-2.5 pt-3"
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

              <div className="mb-1 text-xs font-semibold text-[var(--on-surface)]">{inc.barangay}</div>
              <div className="mb-1.5 text-xs text-[var(--outline)]">{inc.location}</div>

              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="text-[11px] text-[var(--outline)]">
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
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-high)] px-3 py-[9px] text-xs font-semibold text-primary"
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
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 border border-border bg-card px-3 py-2.5">
          <div className="text-xs text-[var(--on-surface-variant)]">
            {t('official.incidents.showingRange', { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, filtered.length), total: filtered.length })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className={`rounded-lg border-none px-3 py-2 text-xs font-semibold ${
                page === 1
                  ? 'bg-[var(--surface-container-low)] text-[var(--outline)] cursor-not-allowed'
                  : 'bg-[var(--surface-container-high)] text-[var(--on-surface)] cursor-pointer'
              }`}
            >
              {t('official.incidents.previous')}
            </button>
            <div className="min-w-[72px] text-center text-xs font-bold text-[var(--on-surface-variant)]">
              {t('official.incidents.page', { page, total: totalPages })}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className={`rounded-lg border-none px-3 py-2 text-xs font-semibold ${
                page === totalPages
                  ? 'bg-[var(--surface-container-low)] text-[var(--outline)] cursor-not-allowed'
                  : 'bg-[var(--surface-container-high)] text-[var(--on-surface)] cursor-pointer'
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


