import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficialReports, useAlerts, useHeatmap, officialReportsKeys } from '../hooks/useOfficialReportsQueries';
import { useTranslation } from '../i18n';
import {
  AlertTriangle, Users, CheckCircle2, Clock, TrendingUp,
  TrendingDown, Minus, MapPin, ArrowRight,
  Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind,
  ChevronRight, RefreshCw, Navigation2, Bell, BellDot, Check,
  SlidersHorizontal, Download,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { type Incident, incidentTypeConfig, isIncidentVisibleOnMap } from '../data/incidents';
import { IncidentMap, type HeatmapClusterOverlay } from '../components/IncidentMap';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import { OfficialPageHeader } from '../components/OfficialPageHeader';
import { useNavigate } from 'react-router';
import { officialReportsApi, type ApiCrossBorderAlert, type ApiHeatmapCluster } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';
import { applyRechartsWarningPatch } from '../utils/rechartsWarningPatch';

if (import.meta.env.DEV) {
  applyRechartsWarningPatch();
}

const CATEGORY_DIST_CONFIG = [
  { name: 'Pollution', color: '#0F766E' },
  { name: 'Noise', color: '#7C3AED' },
  { name: 'Crime', color: 'var(--primary)' },
  { name: 'Road Hazard', color: 'var(--severity-medium)' },
  { name: 'Other', color: '#475569' },
];

const LIVE_FEED_LIMIT = 5;

function trendColorClass(accent: string): string {
  if (accent === '#DC2626') return 'text-[var(--severity-critical)]';
  if (accent === '#2563EB') return 'text-[var(--primary)]';
  if (accent === '#16A34A') return 'text-[var(--severity-low)]';
  if (accent === '#D97706') return 'text-[var(--severity-medium)]';
  return 'text-[var(--on-surface-variant)]';
}

function legendDotClass(color: string): string {
  if (color === '#0F766E') return 'bg-teal-700';
  if (color === '#7C3AED') return 'bg-violet-600';
  if (color === 'var(--primary)') return 'bg-primary';
  if (color === 'var(--severity-medium)') return 'bg-severity-medium';
  if (color === '#475569') return 'bg-slate-600';
  return 'bg-slate-400';
}

const typeIcons: Record<string, React.ReactNode> = {
  flood: <Droplets size={14} />, accident: <Car size={14} />,
  medical: <Heart size={14} />, crime: <ShieldIcon size={14} />, infrastructure: <Zap size={14} />, typhoon: <Wind size={14} />,
};

function formatDurationFromMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '0m';
  }

  const roundedMinutes = Math.round(totalMinutes);
  const days = Math.floor(roundedMinutes / (24 * 60));
  const hours = Math.floor((roundedMinutes % (24 * 60)) / 60);
  const minutes = roundedMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

interface KPICardProps {
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; accent: string; trend?: { dir: 'up' | 'down' | 'flat'; val: string };
  bgLight: string;
}

function KPICard({ title, value, subtitle, accent, trend }: KPICardProps) {
  const TrendIcon = trend?.dir === 'up' ? TrendingUp : trend?.dir === 'down' ? TrendingDown : Minus;
  const isLiveLabel = trend?.val?.includes('Live') || trend?.val?.includes('live');
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 bg-card px-4 py-4 border-r border-b border-border">
      <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{title}</div>
      <div className="font-mono text-2xl font-bold leading-none text-foreground">{value}</div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        {trend && !isLiveLabel && (
          <span className={`flex items-center gap-[3px] font-mono text-[10px] font-semibold ${trendColorClass(accent)}`}>
            <TrendIcon size={11} />
            {trend.val}
          </span>
        )}
      </div>
    </div>
  );
}

const AlertBanner = ({
  incidents,
  onOpenIncident,
}: {
  incidents: Incident[];
  onOpenIncident: (incidentId: string) => void;
}) => {
  const { t } = useTranslation();
  const critical = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved');
  if (critical.length === 0) return null;
  return (
    <div className="mb-3 overflow-hidden border border-[var(--severity-critical-bg)] bg-[var(--error-container)]">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--severity-critical-bg)] bg-[var(--severity-critical-bg)] px-3.5 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Pulsing live indicator */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-[var(--severity-critical)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--severity-critical)] opacity-90" />
          </span>
          <span className="text-[var(--on-error-container)] font-semibold text-[11px] uppercase tracking-[0.05em]">
            {t('official.dashboard.criticalAlert')}
          </span>
          <span className="hidden sm:inline text-[var(--on-error-container)]/60 text-[11px]">·</span>
          <span className="hidden sm:inline text-[var(--on-error-container)] text-[11px] leading-none opacity-80">
            {critical.length > 1
              ? t('official.dashboard.criticalMessagePlural', { count: critical.length })
              : t('official.dashboard.criticalMessage', { count: critical.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenIncident(critical[0].id)}
          className="shrink-0 cursor-pointer rounded border-none bg-[var(--severity-critical)]/90 px-3 py-1 text-[10px] font-semibold text-[var(--on-error)] hover:bg-[var(--severity-critical)]"
          style={{ transition: 'background-color 150ms ease' }}
        >
          {t('official.dashboard.criticalLabel')}
        </button>
      </div>

      {/* Incident chips row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
        <span className="text-[var(--on-error-container)] text-[10px] font-bold uppercase tracking-[0.08em] shrink-0 opacity-70">
          {t('official.dashboard.criticalIncidentsLabel')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {critical.map((incident) => (
            <button
              key={incident.id}
              type="button"
              onClick={() => onOpenIncident(incident.id)}
              className="cursor-pointer rounded border border-[var(--severity-critical-bg)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--on-error-container)] hover:border-[var(--severity-critical)] hover:bg-[var(--error-container)] active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out, border-color 120ms ease, background-color 120ms ease' }}
            >
              {incident.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: reportsData, isLoading: incidentsLoading, error: incidentsQueryError } = useOfficialReports();
  const { data: alertsData, isLoading: alertsLoading, error: alertsQueryError } = useAlerts();
  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapQueryError } = useHeatmap({ days: 14, threshold: 3 });
  const incidents = reportsData?.reports.map((report) => reportToIncident(report)) ?? [];
  const alerts = alertsData?.alerts ?? [];
  const heatmapClusters = heatmapData?.clusters ?? [];
  const incidentsError = incidentsQueryError?.message ?? null;
  const heatmapError = heatmapQueryError?.message ?? null;
  const initialLoadPending = (incidentsLoading && !reportsData) || (alertsLoading && !alertsData) || (heatmapLoading && !heatmapData);

  const [alertActionError, setAlertActionError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [markingReadAlertId, setMarkingReadAlertId] = useState<string | null>(null);
  const [mapRenderMode, setMapRenderMode] = useState<'hotspot' | 'standard'>('hotspot');
  const [showHeatmapTuning, setShowHeatmapTuning] = useState(false);
  const [heatRadiusPercent, setHeatRadiusPercent] = useState(85);
  const [heatOpacityPercent, setHeatOpacityPercent] = useState(100);
  const [mapInView, setMapInView] = useState(false);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapIncidents = React.useMemo(() => incidents.filter((incident) => isIncidentVisibleOnMap(incident)), [incidents]);
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'responding');
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const resolvedToday = incidents.filter(i => i.resolvedAt?.startsWith(todayIso));
  const resolvedYesterday = incidents.filter(i => i.resolvedAt?.startsWith(yesterdayIso));
  const resolvedTrend = React.useMemo((): { dir: 'up' | 'down' | 'flat'; val: string } => {
    const today = resolvedToday.length;
    const yesterday = resolvedYesterday.length;
    if (yesterday === 0 && today === 0) return { dir: 'flat', val: t('official.dashboard.noDataYet') };
    if (yesterday === 0) return { dir: 'up', val: `+${today} vs yesterday` };
    const pct = Math.round(((today - yesterday) / yesterday) * 100);
    if (pct > 0) return { dir: 'up', val: `+${pct}% vs yesterday` };
    if (pct < 0) return { dir: 'down', val: `${pct}% vs yesterday` };
    return { dir: 'flat', val: 'Same as yesterday' };
  }, [resolvedToday.length, resolvedYesterday.length, t]);

  React.useEffect(() => {
    if (mapInView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMapInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    const ref = mapContainerRef.current;
    if (ref) io.observe(ref);
    return () => { io.disconnect(); };
  }, [mapInView]);

  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
  const deployedUnits = activeIncidents.reduce((sum, incident) => sum + Math.max(0, incident.responders || 0), 0);
  const avgResponseMinutes = React.useMemo(() => {
    const withResponse = incidents.filter((incident) => incident.respondedAt);
    if (withResponse.length === 0) {
      return null;
    }

    const totalMinutes = withResponse.reduce((sum, incident) => {
      const diff = new Date(incident.respondedAt ?? incident.reportedAt).getTime() - new Date(incident.reportedAt).getTime();
      return sum + Math.max(0, Math.round(diff / 60000));
    }, 0);

    return Number((totalMinutes / withResponse.length).toFixed(1));
  }, [incidents]);
  const unreadAlerts = alerts.filter((alert) => !alert.readAt).length;
  const strongestHeatCluster = heatmapClusters[0];
  const unresolvedCount = incidents.filter((incident) => incident.status !== 'resolved').length;

  const trendData = React.useMemo(() => {
    const base = Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        day: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        incidents: 0,
        resolved: 0,
      };
    });

    const indexByDay = new Map(base.map((item, index) => [item.key, index]));
    for (const incident of incidents) {
      const reportedDay = incident.reportedAt.slice(0, 10);
      const reportedIdx = indexByDay.get(reportedDay);
      if (typeof reportedIdx === 'number') {
        base[reportedIdx].incidents += 1;
      }

      if (incident.resolvedAt) {
        const resolvedDay = incident.resolvedAt.slice(0, 10);
        const resolvedIdx = indexByDay.get(resolvedDay);
        if (typeof resolvedIdx === 'number') {
          base[resolvedIdx].resolved += 1;
        }
      }
    }

    return base.map(({ day, incidents: reported, resolved }) => ({ day, incidents: reported, resolved }));
  }, [incidents]);

  const typeDist = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const incident of incidents) {
      const category = getCategoryLabelForIncidentType(incident.type);
      if (category === 'Noise') {
        counts.Noise = (counts.Noise ?? 0) + 1;
      } else if (category === 'Other') {
        counts.Other = (counts.Other ?? 0) + 1;
      } else {
        counts[category] = (counts[category] ?? 0) + 1;
      }
    }

    return CATEGORY_DIST_CONFIG.map((item) => ({
      name: item.name,
      value: counts[item.name] ?? 0,
      color: item.color,
    }));
  }, [incidents]);

  useEffect(() => {
    const mapIncidents = incidents.filter((incident) => isIncidentVisibleOnMap(incident));
    setSelectedIncident((current) => {
      if (!current) return mapIncidents[0] ?? null;
      return mapIncidents.find((item) => item.id === current.id) ?? null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsData]);

  useEffect(() => {
    const disconnect = officialReportsApi.connectReportsStream(() => {
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.reportsBase() });
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.alerts() });
      void queryClient.invalidateQueries({ queryKey: officialReportsKeys.heatmap({ days: 14, threshold: 3 }) });
    });
    return () => { disconnect(); };
  }, [queryClient]);

  useEffect(() => {
    if (heatmapLoading) return;
    // Fallback to pin mode when there are no qualifying hotspot clusters.
    if (heatmapClusters.length === 0 && mapRenderMode === 'hotspot') {
      setMapRenderMode('standard');
    }
  }, [heatmapClusters.length, heatmapLoading, mapRenderMode]);

  const handleMarkAlertRead = async (alertId: string) => {
    setMarkingReadAlertId(alertId);
    setAlertActionError(null);
    try {
      await officialReportsApi.markAlertRead(alertId);
      await queryClient.invalidateQueries({ queryKey: officialReportsKeys.alerts() });
    } catch (error) {
      setAlertActionError(error instanceof Error ? error.message : 'Unable to update alert.');
    } finally {
      setMarkingReadAlertId(null);
    }
  };

  const heatmapOverlays: HeatmapClusterOverlay[] = heatmapClusters.map((cluster) => ({
    id: cluster.clusterId,
    latitude: cluster.centerLatitude,
    longitude: cluster.centerLongitude,
    intensity: cluster.intensity,
    incidentCount: cluster.incidentCount,
    incidentType: cluster.category,
  }));
  const trendWindowLabel = trendData.length >= 2
    ? `${trendData[0].day} - ${trendData[trendData.length - 1].day}`
    : 'Latest reporting window';
  const staffedActiveIncidents = activeIncidents.filter((incident) => incident.responders > 0).length;
  const handleResetHeatmapTuning = () => {
    setHeatRadiusPercent(85);
    setHeatOpacityPercent(100);
  };

  if (initialLoadPending) {
    return (
      <div className="px-4 py-3.5 min-h-full">
        <CardSkeleton
          count={4}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        />
        <div className="mt-4">
          <TextSkeleton rows={3} title={false} />
        </div>
        <div className="mt-4">
          <TableSkeleton rows={8} columns={3} showHeader={false} />
        </div>
      </div>
    );
  }

  const hotspotDisabled = heatmapLoading || heatmapClusters.length === 0;

  return (
    <div className="page-content min-h-full bg-[var(--surface)] px-4 py-4">
      {/* Alert banner */}
      <AlertBanner
        incidents={incidents}
        onOpenIncident={(incidentId) => {
          navigate(`/app/incidents?incident=${encodeURIComponent(incidentId)}`);
        }}
      />

      {incidentsError ? (
        <div className="mb-3 rounded-xl bg-[var(--error-container)] px-3 py-2 text-xs text-[var(--on-error-container)]">
          {incidentsError}
        </div>
      ) : null}

      <OfficialPageHeader
        eyebrow="District Focus"
        title="Tondo Patrol Cluster"
        meta={(
          <>
            <span className="font-mono font-medium text-[var(--severity-critical)] opacity-90">{activeIncidents.length}</span> active
            {' · '}
            <span className="font-mono font-medium text-[var(--on-surface)]">{deployedUnits}</span> units deployed
            {' · '}
            <span className="font-mono font-medium text-[var(--on-surface)]">{unresolvedCount}</span> unresolved
          </>
        )}
        actions={(
          <>
            <button
              type="button"
              onClick={() => navigate('/app/incidents')}
              className="cursor-pointer rounded-md border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Dispatch Responder
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/reports')}
              className="cursor-pointer rounded-md border border-border bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              Request Support
            </button>
          </>
        )}
      />

      {strongestHeatCluster ? (
        <section
          className="mb-4 bg-card px-4 py-3 border border-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--severity-medium)] opacity-90">Geofencing Warning</div>
            <button
              type="button"
              onClick={() => navigate('/app/map')}
              className="cursor-pointer rounded-md border border-[var(--severity-medium)]/30 bg-transparent px-2.5 py-1 text-[11px] font-medium text-[var(--severity-medium)] opacity-90 transition-colors hover:bg-[var(--severity-medium-bg)]"
            >
              Open Map
            </button>
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            Elevated {strongestHeatCluster.category} activity detected near cluster center ({strongestHeatCluster.incidentCount} incidents).
          </div>
        </section>
      ) : null}

      {/* Cross-Border Alerts */}
      <div className="mb-4 overflow-hidden bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell size={14} color="var(--severity-medium)" className="opacity-80" />
            <span className="text-[13px] font-semibold text-foreground">{t('official.dashboard.crossBorderAlerts')}</span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--severity-low)] opacity-80">
              <span className="inline-block size-[5px] rounded-full bg-[var(--severity-low)] opacity-80" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadAlerts(true);
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-2 py-1.5 text-[11px] font-bold ${unreadAlerts > 0 ? 'bg-[var(--error-container)] text-[var(--on-error-container)]' : 'bg-[var(--surface-container-low)] text-[var(--outline)]'}`}
              aria-label={t('official.dashboard.unreadAlertsAction', { count: unreadAlerts })}
              title={t('official.dashboard.unreadAlertsAction', { count: unreadAlerts })}
            >
              <BellDot size={12} />
              <span>{unreadAlerts}</span>
              <span className="hidden sm:inline">{t('official.dashboard.unreadLabel')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void loadAlerts();
              }}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-none bg-[var(--surface-container-low)] px-0 py-0 text-[11px] font-semibold text-[var(--on-surface-variant)] sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5"
              aria-label={t('official.dashboard.refreshAlerts')}
              title={t('official.dashboard.refreshAlerts')}
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
          </div>
        </div>

        {(alertsQueryError ?? alertActionError) ? (
          <div className="mx-4 my-3 rounded-lg border border-[var(--on-error-container)]/20 bg-[var(--error-container)] px-2.5 py-2 text-xs text-[var(--on-error-container)]">
            {alertsQueryError?.message ?? alertActionError}
          </div>
        ) : null}

        <div className="px-4 pt-2 pb-3.5">
          {alertsLoading ? (
            <TextSkeleton
              rows={2}
              title={false}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          ) : alerts.length === 0 ? (
            <div className="py-2 text-xs text-[var(--outline)]">{t('official.dashboard.noAlerts')}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-2.5 bg-card py-[9px] pl-3 pr-2.5 border-b border-border/30 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--on-surface)]">
                      Incident {alert.report.id} near Barangay {alert.sourceBarangayCode}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--on-surface-variant)]">
                      {alert.alertReason}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--outline)]">
                      {new Date(alert.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} · {alert.report.location}
                    </div>
                  </div>
                  {alert.readAt ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full border-none bg-[var(--severity-low-bg)] text-[var(--severity-low)] shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)] leading-none"
                      aria-label={t('official.dashboard.read')}
                      title={t('official.dashboard.read')}
                    >
                      <Check size={16} className="block" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void handleMarkAlertRead(alert.id);
                      }}
                      disabled={markingReadAlertId === alert.id}
                      aria-label={t('official.dashboard.markRead')}
                      title={t('official.dashboard.markRead')}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full border-none bg-[var(--surface-container-lowest)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.14)] ${markingReadAlertId === alert.id ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      {markingReadAlertId === alert.id ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} className="block" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Hotspots */}
      <div className="mb-4 overflow-hidden bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} color="var(--primary)" className="opacity-80" />
            <span className="text-[13px] font-semibold text-foreground">{t('official.dashboard.heatmapHotspots')}</span>
          </div>
          <button
            onClick={() => {
              void loadHeatmap();
            }}
            className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-[var(--surface-container-low)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--on-surface-variant)]"
          >
            <RefreshCw size={12} /> {t('common.refresh')}
          </button>
        </div>
        <div className="px-4 py-2.5 pb-3.5">
          {heatmapError ? (
            <div className="rounded-lg border border-[var(--on-error-container)]/20 bg-[var(--error-container)] px-2.5 py-2 text-xs text-[var(--on-error-container)]">
              {heatmapError}
            </div>
          ) : heatmapLoading ? (
            <TextSkeleton
              rows={2}
              title={false}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          ) : heatmapClusters.length === 0 ? (
              <div className="py-2 text-xs text-[var(--outline)]">
                {t('official.dashboard.noHotspots')}
              </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                  <div className="text-[13px] font-bold text-[var(--on-surface)]">
                  {heatmapClusters.length > 1
                    ? t('official.dashboard.hotspotDetectedPlural', { count: heatmapClusters.length })
                    : t('official.dashboard.hotspotDetected', { count: heatmapClusters.length })}
                </div>
                {strongestHeatCluster ? (
                  <div className="mt-[3px] text-[11px] text-[var(--on-surface-variant)]">
                    {t('official.dashboard.strongestCluster', { category: strongestHeatCluster.category, count: strongestHeatCluster.incidentCount })}
                  </div>
                ) : null}
              </div>
              <div className="text-[11px] text-[var(--outline)]">
                {heatmapClusters.length > 0 ? t('official.dashboard.hotspotFocusAvailable') : t('official.dashboard.switchesToPins')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats — 4-col ruled table */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Operations Overview</span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--severity-low)] opacity-80">
          <span className="inline-block size-[5px] rounded-full bg-[var(--severity-low)] opacity-80" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-border mb-4">
        <KPICard
          title={t('official.dashboard.activeIncidents')}
          value={activeIncidents.length}
          subtitle={t('official.dashboard.criticalResponding', { critical: criticalCount, responding: activeIncidents.filter(i => i.status === 'responding').length })}
          icon={<AlertTriangle size={20} />}
          accent="#DC2626"
          bgLight="#FEE2E2"
          trend={{ dir: 'flat', val: t('official.dashboard.liveTotal') }}
        />
        <KPICard
          title="Unresolved"
          value={unresolvedCount}
          subtitle={staffedActiveIncidents > 0 ? t('official.dashboard.staffedCases', { count: staffedActiveIncidents }) : t('official.dashboard.noResponders')}
          icon={<Users size={20} />}
          accent="#2563EB"
          bgLight="#DBEAFE"
          trend={{ dir: 'flat', val: `${deployedUnits} units deployed` }}
        />
        <KPICard
          title={t('official.dashboard.resolvedToday')}
          value={resolvedToday.length}
          subtitle={t('official.dashboard.sincePhT')}
          icon={<CheckCircle2 size={20} />}
          accent="#16A34A"
          bgLight="#D1FAE5"
          trend={resolvedTrend}
        />
        <KPICard
          title={t('official.dashboard.avgResponse')}
          value={avgResponseMinutes !== null ? formatDurationFromMinutes(avgResponseMinutes) : 'N/A'}
          subtitle={avgResponseMinutes !== null ? t('official.dashboard.basedOnResponded') : t('official.dashboard.waitingTimestamps')}
          icon={<Clock size={20} />}
          accent="#D97706"
          bgLight="#FEF3C7"
          trend={{ dir: 'flat', val: '' }}
        />
      </div>

      {/* Map + Live Feed Row — stacks on mobile */}
      <div className="mb-[18px] flex flex-wrap gap-3.5">
        {/* Map Preview */}
        <div className="flex flex-[3_1_340px] flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPin size={14} color="var(--primary)" className="opacity-80" />
              <span className="text-[13px] font-semibold text-foreground">{t('official.dashboard.incidentOverviewMap')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-muted">
                <button
                  onClick={() => setMapRenderMode('hotspot')}
                  disabled={hotspotDisabled}
                  className={`border-none border-r border-border text-[10px] font-medium px-[9px] py-[5px] ${
                    mapRenderMode === 'hotspot' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  } ${hotspotDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer transition-colors hover:bg-muted/80'}`}
                  title={heatmapClusters.length === 0 ? t('official.dashboard.noHotspotThreshold') : t('official.dashboard.showHotspotAnalytics')}
                >
                  {t('official.dashboard.hotspotFocus')}
                </button>
                <button
                  onClick={() => setMapRenderMode('standard')}
                  className={`border-none text-[10px] font-medium px-[9px] py-[5px] cursor-pointer transition-colors ${
                    mapRenderMode === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  title={t('official.dashboard.showIncidentPins')}
                >
                  {t('official.dashboard.incidentPins')}
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-[5px] border border-[var(--severity-low-bg)] bg-[var(--severity-low-bg)] px-[7px] py-[3px]">
                <Navigation2 size={9} color="var(--severity-low)" />
                <span className="text-[9px] font-semibold text-[var(--severity-low)]">{t('official.dashboard.openStreetMap')}</span>
              </div>
              <button
                onClick={() => navigate('/app/map')}
                className="flex items-center gap-1 rounded-md bg-primary/5 border-none px-2.5 py-1 text-[11px] font-semibold text-primary cursor-pointer transition-colors hover:bg-primary/10"
              >
                {t('official.dashboard.fullMap')} <ArrowRight size={11} />
              </button>
              <button
                onClick={() => {
                  setShowHeatmapTuning((current) => !current);
                  setMapRenderMode('hotspot');
                }}
                className={`flex items-center gap-1 rounded-md border-none px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                  showHeatmapTuning ? 'bg-primary text-primary-foreground' : 'bg-primary/5 text-primary hover:bg-primary/10'
                }`}
              >
                <SlidersHorizontal size={11} /> {t('official.dashboard.tune')}
              </button>
            </div>
          </div>
          <div className="relative flex-1">
            {showHeatmapTuning ? (
              <div
                className="absolute top-2 right-2 z-[1200] w-[220px] rounded-xl border border-blue-100 bg-card/[0.98] p-2.5 shadow-[0_6px_24px_rgba(15,23,42,.16)]"
                onMouseDown={(event) => event.stopPropagation()}
                onMouseMove={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <div className="mb-[7px] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground">{t('official.dashboard.heatmapSettings')}</span>
                  <button
                    onClick={handleResetHeatmapTuning}
                    className="rounded-md border border-border bg-card px-1.5 py-[3px] text-[9px] font-bold text-muted-foreground cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="mb-2">
                  <div className="mb-[3px] flex justify-between">
                    <span className="text-[9px] font-semibold text-muted-foreground">{t('official.dashboard.radius')}</span>
                    <span className="text-[9px] font-bold text-foreground">{heatRadiusPercent}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('official.dashboard.radius')}
                    min={50}
                    max={100}
                    step={1}
                    value={heatRadiusPercent}
                    onChange={(event) => setHeatRadiusPercent(Number(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                    onMouseMove={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerMove={(event) => event.stopPropagation()}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-[3px] flex justify-between">
                    <span className="text-[9px] font-semibold text-muted-foreground">{t('official.dashboard.opacity')}</span>
                    <span className="text-[9px] font-bold text-foreground">{heatOpacityPercent}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('official.dashboard.opacity')}
                    min={50}
                    max={120}
                    step={1}
                    value={heatOpacityPercent}
                    onChange={(event) => setHeatOpacityPercent(Number(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                    onMouseMove={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerMove={(event) => event.stopPropagation()}
                    className="w-full"
                  />
                </div>
              </div>
            ) : null}

            <div ref={mapContainerRef}>
              {mapInView ? (
                <IncidentMap
                  incidents={mapIncidents}
                  height={280}
                  selectedId={selectedIncident?.id}
                  onSelectIncident={setSelectedIncident}
                  compact={false}
                  zoom={14}
                  heatmapClusters={heatmapOverlays}
                  renderMode={mapRenderMode}
                  heatmapRadiusPercent={heatRadiusPercent}
                  heatmapOpacityPercent={heatOpacityPercent}
                  interactive={!showHeatmapTuning}
                />
              ) : (
                <div className="h-[280px] bg-muted/30 animate-pulse" />
              )}
            </div>
          </div>
          {selectedIncident && (
            <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 bg-muted/50 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-foreground">{selectedIncident.id} — {selectedIncident.barangay}</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">{selectedIncident.description}</div>
                <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                  <Navigation2 size={9} color="#9CA3AF" />
                  {selectedIncident.lat.toFixed(5)}°N, {selectedIncident.lng.toFixed(5)}°E
                </div>
              </div>
              <div className="flex gap-1.5">
                <TypeBadge type={selectedIncident.type} size="sm" />
                <SeverityBadge severity={selectedIncident.severity} size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="flex flex-[2_1_260px] flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-foreground">{t('official.dashboard.liveIncidentFeed')}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#16A34A]">
                <span className="inline-block size-[6px] rounded-full bg-[#16A34A]" />
                Live
              </span>
            </div>
            <RefreshCw size={12} className="text-muted-foreground cursor-pointer" />
          </div>
          <div className="flex-1">
            {incidentsLoading ? (
              <div className="px-3.5 py-2.5">
                <TableSkeleton rows={LIVE_FEED_LIMIT} columns={3} showHeader={false} className="border-0 shadow-none" />
              </div>
            ) : (
              incidents.slice(0, LIVE_FEED_LIMIT).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate('/app/incidents')}
                  className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-foreground">{inc.id}</span>
                      <StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} />
                    </div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">{inc.barangay}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(inc.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border/60 px-4 py-2.5">
            <button
              onClick={() => navigate('/app/incidents')}
              className="flex items-center gap-1 border-none bg-transparent text-xs font-semibold text-primary cursor-pointer"
            >
              {t('official.dashboard.viewAllIncidents')} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row — stacks on mobile */}
      <div className="mb-[18px] flex flex-wrap gap-3.5">
        {/* Trend Chart */}
        <div className="flex-[3_1_300px] bg-card px-4 py-3.5">
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-foreground">{t('official.dashboard.dayTrend', { count: trendData.length })}</div>
              <div className="text-[11px] text-muted-foreground">{trendWindowLabel}</div>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-2.5 rounded-sm bg-primary" />
                <span className="text-muted-foreground">{t('official.dashboard.reported')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-2.5 rounded-sm bg-emerald-600" />
                <span className="text-muted-foreground">{t('official.dashboard.resolved')}</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Line key="line-incidents" type="monotone" dataKey="incidents" name="Reported" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
              <Line key="line-resolved" type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Type Distribution */}
        <div className="flex-[2_1_220px] bg-card px-4 py-3.5">
          <div className="mb-1 text-[13px] font-bold text-foreground">{t('official.dashboard.incidentByCategory')}</div>
          <div className="mb-2.5 text-[11px] text-muted-foreground">{t('official.dashboard.categoryDistribution')}</div>
          <div className="flex items-center gap-3">
            <PieChart className="shrink-0" width={156} height={156}>
              <Pie data={typeDist} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                {typeDist.map((entry, index) => (
                  <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="min-w-0 flex-1">
              {typeDist.map(item => (
                <div key={item.name} className="mb-1.5 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${legendDotClass(item.color)}`} />
                    <span className="truncate text-[13px] text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-[13px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="mb-2 overflow-hidden bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <span className="text-[13px] font-bold text-foreground">Incident Queue</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-[var(--surface-container-low)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--on-surface-variant)]"
            >
              <SlidersHorizontal size={12} /> Filter
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-[var(--surface-container-low)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--on-surface-variant)]"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => navigate('/app/incidents')}
              className="flex min-h-[40px] cursor-pointer items-center gap-1 rounded-lg border-none bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-primary"
            >
              {t('official.dashboard.viewAll')} <ChevronRight size={13} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--surface-container-low)]">
                {[t('official.dashboard.incidentId'), t('official.dashboard.type'), t('official.dashboard.location'), t('official.dashboard.severity'), t('official.dashboard.status'), t('official.dashboard.reportedCol'), t('official.dashboard.responders')].map(col => (
                  <th key={col} className="whitespace-nowrap border-b border-[var(--outline-variant)]/30 px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 8).map((inc) => (
                <tr
                  key={inc.id}
                  className="cursor-pointer border-b border-[var(--outline-variant)]/20 transition-colors odd:bg-[var(--surface-container-lowest)] even:bg-[var(--surface-container-low)]/45 hover:bg-[var(--surface-container-low)]"
                  onClick={() => navigate('/app/incidents')}
                >
                  <td className="whitespace-nowrap px-3.5 py-2.5 font-mono font-semibold text-primary">{inc.id}</td>
                  <td className="px-3.5 py-2.5"><TypeBadge type={inc.type} size="sm" /></td>
                  <td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap px-3.5 py-2.5 text-[var(--on-surface-variant)]">{inc.barangay}</td>
                  <td className="px-3.5 py-2.5"><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td className="px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--on-surface)]">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          inc.status === 'active'
                            ? 'bg-red-500'
                            : inc.status === 'responding'
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                        }`}
                      />
                      {inc.status === 'active' ? 'New' : inc.status === 'responding' ? 'Acting' : 'Resolved'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-[var(--outline)]">
                    {new Date(inc.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                  <td className="px-3.5 py-2.5 font-medium text-[var(--on-surface)]">{t('official.dashboard.responderUnits', { count: inc.responders })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
