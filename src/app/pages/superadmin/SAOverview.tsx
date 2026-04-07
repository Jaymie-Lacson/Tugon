import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Users, Activity, TrendingUp, TrendingDown,
  Clock, ArrowRight, MapPin,
  RefreshCw, ChevronRight, Info, Bell, Server,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useNavigate } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IncidentMap } from '../../components/IncidentMap';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { isAuthExpiredError, superAdminApi, type ApiAdminAnalyticsSummary } from '../../services/superAdminApi';
import { officialReportsApi } from '../../services/officialReportsApi';
import { isIncidentVisibleOnMap, type Incident } from '../../data/incidents';
import { reportToIncident } from '../../utils/incidentAdapters';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';

type BarangayOverviewCard = {
  id: string;
  code: string;
  name: string;
  district: string;
  captain: string;
  activeIncidents: number;
  totalThisMonth: number;
  resolvedThisMonth: number;
  responseRate: number;
  avgResponseMin: number;
  responders: number;
  registeredUsers: number;
  color: string;
  alertLevel: 'normal' | 'elevated' | 'critical';
};


const KPI_ACCENT: Record<string, string> = {
  'var(--severity-critical)': '#DC2626',
  'var(--severity-medium)':   '#D97706',
  'var(--severity-low)':      '#16A34A',
  'var(--primary)':           '#2563EB',
};

interface KPIProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number; trendLabel?: string;
}

function KPICard({ label, value, sub, color, trend, trendLabel }: KPIProps) {
  const isUp = (trend ?? 0) >= 0;
  const accent = KPI_ACCENT[color] ?? '#2563EB';
  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 bg-white px-4 py-4 border-r border-b border-slate-200"
    >
      {trend !== undefined && (
        <div className={`flex items-center gap-[3px] font-mono text-[10px] font-bold ${isUp ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}%
        </div>
      )}
      <div className="text-[#0F172A] text-[26px] font-bold font-mono leading-[1.1] mb-[3px]">{value}</div>
      <div className="text-[#6B7280] text-xs">{label}</div>
      {sub && <div className="text-[#9CA3AF] text-[10px]">{sub}</div>}
      {trendLabel && (
        <div className="font-mono text-[10px] text-[#9CA3AF]">{trendLabel}</div>
      )}
    </div>
  );
}

const alertLevelConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: 'NORMAL',   color: 'var(--severity-low)', bg: 'var(--severity-low-bg)' },
  elevated: { label: 'ELEVATED', color: 'var(--secondary)', bg: 'var(--secondary-fixed)' },
  critical: { label: 'CRITICAL', color: 'var(--error)', bg: 'var(--error-container)' },
};

const logTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  incident: { icon: <AlertTriangle size={13} />, color: 'var(--severity-critical)' },
  user:     { icon: <Users size={13} />,         color: 'var(--primary)' },
  alert:    { icon: <Bell size={13} />,           color: 'var(--severity-medium)' },
  system:   { icon: <Server size={13} />,         color: 'var(--severity-low)' },
};

function getAlertLevelClass(level: 'normal' | 'elevated' | 'critical') {
  switch (level) {
    case 'normal':
      return 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]';
    case 'elevated':
      return 'bg-[var(--secondary-fixed)] text-[var(--secondary)]';
    case 'critical':
      return 'bg-[var(--error-container)] text-[var(--error)]';
    default:
      return 'bg-surface-container-high text-[var(--outline)]';
  }
}

function getBarangayAccentClass(code: string) {
  if (code === '251') return 'text-[#2563EB]';
  if (code === '252') return 'text-[#16A34A]';
  return 'text-[#D97706]';
}

function getBarangayBorderTopClass(code: string) {
  if (code === '251') return 'border-t-[#2563EB]';
  if (code === '252') return 'border-t-[#16A34A]';
  return 'border-t-[#D97706]';
}

function getStatValueClass(color: string) {
  if (color === 'var(--severity-critical)') return 'text-[#DC2626]';
  if (color === 'var(--severity-medium)') return 'text-[#D97706]';
  if (color === 'var(--primary)') return 'text-[#2563EB]';
  return 'text-[#16A34A]';
}

function getQuickNavAccentClass(path: string) {
  if (path === '/superadmin/users') return 'text-[#16A34A]';
  return 'text-[#2563EB]';
}

function formatLogTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDurationFromMinutes(totalMinutes: number) {
  const safeMinutes = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;

  if (safeMinutes < 60) {
    return `${safeMinutes.toFixed(1)} minutes`;
  }

  const hours = safeMinutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)} hours`;
  }

  const days = hours / 24;
  if (days < 7) {
    return `${days.toFixed(1)} days`;
  }

  const weeks = days / 7;
  return `${weeks.toFixed(1)} weeks`;
}

export default function SAOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [analyticsSummary, setAnalyticsSummary] = useState<ApiAdminAnalyticsSummary | null>(null);
  const [reportIncidents, setReportIncidents] = useState<Incident[]>([]);
  const [barangayCards, setBarangayCards] = useState<BarangayOverviewCard[]>([]);
  const [systemLogs, setSystemLogs] = useState<Array<{ id: string; timestamp: string; type: string; message: string; barangay?: string; severity: string }>>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const mapIncidents = React.useMemo(() => reportIncidents.filter((incident) => isIncidentVisibleOnMap(incident)), [reportIncidents]);
  const total = analyticsSummary?.summary.openReports ?? reportIncidents.filter((item) => item.status !== 'resolved').length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);
  const resolvedToday = reportIncidents.filter((item) => item.resolvedAt?.startsWith(todayIso)).length;
  const openedToday = reportIncidents.filter((item) => item.reportedAt.startsWith(todayIso)).length;
  const openedYesterday = reportIncidents.filter((item) => item.reportedAt.startsWith(yesterdayIso)).length;
  const activeTrendPercent = openedYesterday === 0
    ? (openedToday > 0 ? 100 : 0)
    : Number((((openedToday - openedYesterday) / openedYesterday) * 100).toFixed(0));
  const avgResponseMinutes = (() => {
    const withResponse = reportIncidents.filter((item) => item.respondedAt);
    if (withResponse.length === 0) {
      return 0;
    }

    const totalMinutes = withResponse.reduce((sum, item) => {
      const diff = new Date(item.respondedAt ?? item.reportedAt).getTime() - new Date(item.reportedAt).getTime();
      return sum + Math.max(0, Math.round(diff / 60000));
    }, 0);

    return Number((totalMinutes / withResponse.length).toFixed(1));
  })();
  const avgResponseLabel = formatDurationFromMinutes(avgResponseMinutes);
  const incidentTypeDist = [
    { type: 'Flood', brgy251: 0, brgy252: 0, brgy256: 0 },
    { type: 'Accident', brgy251: 0, brgy252: 0, brgy256: 0 },
    { type: 'Medical', brgy251: 0, brgy252: 0, brgy256: 0 },
    { type: 'Crime', brgy251: 0, brgy252: 0, brgy256: 0 },
    { type: 'Infra.', brgy251: 0, brgy252: 0, brgy256: 0 },
  ];

  for (const item of reportIncidents) {
    const barangayKey = item.barangay.includes('251') ? 'brgy251' : item.barangay.includes('252') ? 'brgy252' : 'brgy256';
    const row =
      item.type === 'flood' ? incidentTypeDist[0] :
      item.type === 'accident' ? incidentTypeDist[1] :
      item.type === 'medical' ? incidentTypeDist[2] :
      item.type === 'crime' ? incidentTypeDist[3] :
      incidentTypeDist[4];
    row[barangayKey] += 1;
  }

  const handleAuthFailure = React.useCallback((error: unknown) => {
    if (!isAuthExpiredError(error)) {
      return false;
    }

    clearAuthSession();
    setAuthRedirecting(true);
    navigate('/auth/login', { replace: true });
    return true;
  }, [navigate]);

  useEffect(() => {
    if (getAuthSession()?.user.role === 'SUPER_ADMIN') {
      return;
    }

    setAuthRedirecting(true);
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const loadAnalyticsSummary = async () => {
    if (authRedirecting) {
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const payload = await superAdminApi.getAnalyticsSummary();
      setAnalyticsSummary(payload);
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to load analytics summary.';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadReports = async () => {
    if (authRedirecting) {
      return;
    }

    setReportsLoading(true);
    try {
      const payload = await officialReportsApi.getReports();
      setReportIncidents(payload.reports.map((report) => reportToIncident(report)));
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

      setReportIncidents([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadBarangays = async () => {
    if (authRedirecting) {
      return;
    }

    try {
      const payload = await superAdminApi.getBarangays();
      const colorByCode: Record<string, string> = {
        '251': 'var(--primary)',
        '252': 'var(--severity-low)',
        '256': 'var(--severity-medium)',
      };

      const nextCards = payload.barangays
        .filter((barangay) => ['251', '252', '256'].includes(barangay.code))
        .sort((a, b) => Number(a.code) - Number(b.code))
        .map((barangay) => {
          const activeIncidents = barangay.activeReports;
          const totalThisMonth = barangay.totalReports;
          const resolvedThisMonth = Math.max(totalThisMonth - activeIncidents, 0);
          const responseRate = totalThisMonth > 0
            ? Math.max(0, Math.min(100, Math.round((resolvedThisMonth / totalThisMonth) * 100)))
            : 100;

          return {
            id: barangay.id,
            code: barangay.code,
            name: `Barangay ${barangay.code}`,
            district: 'Tondo, Manila',
            captain: 'Assigned Barangay Captain',
            activeIncidents,
            totalThisMonth,
            resolvedThisMonth,
            responseRate,
            avgResponseMin: 0,
            responders: barangay.officialCount,
            registeredUsers: barangay.citizenCount,
            color: colorByCode[barangay.code] ?? 'var(--primary)',
            alertLevel: activeIncidents >= 10 ? 'critical' : activeIncidents >= 5 ? 'elevated' : 'normal',
          } as BarangayOverviewCard;
        });

      setBarangayCards(nextCards);
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

      setBarangayCards([]);
    }
  };

  const loadAuditLogs = async () => {
    if (authRedirecting) {
      return;
    }

    setLogsLoading(true);
    try {
      const payload = await superAdminApi.getAuditLogs({ limit: 8, offset: 0 });
      setSystemLogs(
        payload.logs.map((log) => ({
          id: log.id,
          timestamp: log.createdAt,
          type: log.targetType === 'USER' ? 'user' : 'system',
          message: `${log.action} ${log.targetLabel ?? log.targetId ?? ''}`.trim(),
          severity: 'info',
        })),
      );
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalyticsSummary();
    void loadReports();
    void loadBarangays();
    void loadAuditLogs();
  }, []);

  const initialLoadPending = summaryLoading || reportsLoading || logsLoading;

  if (initialLoadPending) {
    return (
      <div className="p-5 min-h-full">
        <TextSkeleton rows={2} title={false} />
        <div className="mt-3">
          <CardSkeleton
            count={4}
            lines={2}
            showImage={false}
            gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          />
        </div>
        <div className="mt-3">
          <TableSkeleton rows={7} columns={4} showHeader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-[var(--surface)] min-h-full">
      {/* Page header */}
      <div className="border-b border-slate-200 pb-4 mb-5">
      <div className="flex items-center justify-between gap-[10px] max-md:flex-col max-md:items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold uppercase text-[#2563EB]">
              {t('role.superAdmin')}
            </span>
            <div className="text-[#6B7280] text-xs">{t('superadmin.overview.multiBarangayOverview')}</div>
          </div>
          <h1 className="text-[#0F172A] text-[22px] font-bold m-0">{t('superadmin.overview.dashboardTitle')}</h1>
          <p className="text-[#6B7280] text-xs m-0 mt-[2px]">
            {t('superadmin.overview.monitoringSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-[10px] max-md:w-full max-md:flex-wrap">
          <button
            onClick={() => {
              void loadAnalyticsSummary();
              void loadReports();
              void loadBarangays();
              void loadAuditLogs();
            }}
            className="flex min-h-11 items-center gap-[6px] bg-white border border-[#E5E7EB] rounded-lg px-[14px] py-2 cursor-pointer text-[#374151] text-xs font-semibold max-md:flex-1 max-md:justify-center"
          >
            <RefreshCw size={13} className="text-[var(--outline)]" />
            {summaryLoading ? t('common.refreshing') : t('common.refresh')}
          </button>
          <button
            onClick={() => navigate('/superadmin/analytics')}
            className="flex min-h-11 items-center gap-[6px] bg-primary border-0 rounded-lg px-4 py-2 cursor-pointer text-white text-xs font-semibold max-md:flex-1 max-md:justify-center"
          >
            {t('superadmin.overview.viewAnalytics')}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
      </div>

      {summaryError ? (
        <div className="mb-3 border-l-4 border-[#DC2626] bg-white px-3 py-2.5 text-[#DC2626] text-xs font-semibold">
          {summaryError}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 border-l border-t border-slate-200 mb-4">
        <KPICard
          label={t('superadmin.overview.kpiActiveIncidents')}
          value={total}
          sub={t('superadmin.overview.kpiAcrossBarangays')}
          icon={<AlertTriangle />}
          color="var(--severity-critical)"
          trend={activeTrendPercent}
          trendLabel={t('superadmin.overview.kpiNewReportsToday', { count: openedToday })}
        />
        <KPICard
          label={t('superadmin.overview.kpiResolvedToday')}
          value={resolvedToday}
          sub={t('superadmin.overview.kpiIncidentsClosedToday')}
          icon={null}
          color="var(--severity-low)"
          trendLabel={t('superadmin.overview.kpiBasedOnTickets')}
        />
        <KPICard
          label={t('superadmin.overview.kpiAvgResponseTime')}
          value={avgResponseLabel}
          sub={t('superadmin.overview.kpiResponseTarget')}
          icon={null}
          color="var(--severity-medium)"
          trendLabel={t('superadmin.overview.kpiComputedFromIncidents')}
        />
        <KPICard
          label={t('superadmin.overview.kpiRegisteredUsers')}
          value={analyticsSummary?.summary.totalUsers ?? 0}
          sub={t('superadmin.overview.kpiVerifiedAccounts', { count: analyticsSummary?.summary.verifiedUsers ?? 0 })}
          icon={null}
          color="var(--primary)"
          trendLabel={t('superadmin.overview.kpiAcrossThreeBarangays')}
        />
        <KPICard
          label={t('superadmin.overview.kpiSystemUptime')}
          value="99.87%"
          sub={t('superadmin.overview.kpiAllServicesRunning')}
          icon={null}
          color="var(--severity-low)"
          trendLabel={t('superadmin.overview.kpiMonitoredByPlatform')}
        />
      </div>

      {/* Barangay cards row */}
      <div className="flex gap-[14px] mb-5 flex-wrap">
        {barangayCards.map((b) => {
          const al = alertLevelConfig[b.alertLevel];
          return (
            <div key={b.id} className={`flex-1 min-w-[260px] bg-white rounded-xl overflow-hidden border border-slate-200 border-t-2 ${getBarangayBorderTopClass(b.code)}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-[3px]">
                      <span className="text-[#0F172A] text-base font-bold">{b.name}</span>
                      <span className={`font-mono text-[9px] font-bold uppercase ${getAlertLevelClass(b.alertLevel).split(' ')[1]}`}>{al.label}</span>
                    </div>
                    <div className="text-[#6B7280] text-[11px]">{b.district}</div>
                    <div className="text-[#9CA3AF] text-[10px] mt-[2px]">{b.captain}</div>
                  </div>
                  <MapPin size={16} className={`shrink-0 mt-1 ${getBarangayAccentClass(b.code)}`} />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: t('superadmin.overview.statActive'),     value: b.activeIncidents,   color: 'var(--severity-critical)' },
                    { label: t('superadmin.overview.statThisMonth'), value: b.totalThisMonth,    color: 'var(--primary)' },
                    { label: t('superadmin.overview.statResolved'),   value: b.resolvedThisMonth, color: 'var(--severity-low)' },
                    { label: t('superadmin.overview.statRespRate'), value: `${b.responseRate}%`, color: 'var(--severity-medium)' },
                  ].map(s => (
                    <div key={s.label} className="border border-slate-100 bg-white px-[10px] py-2">
                      <div className={`text-[17px] font-bold font-mono leading-none ${getStatValueClass(s.color)}`}>{s.value}</div>
                      <div className="text-[#9CA3AF] text-[10px] mt-[2px]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Response time bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#6B7280] text-[11px]">{t('superadmin.overview.statAvgResponseTime')}</span>
                    <span className={`text-[11px] font-semibold ${b.responseRate < 90 ? 'text-severity-medium' : 'text-[var(--severity-low)]'}`}>{b.responseRate}%</span>
                  </div>
                  <div className="h-[5px] bg-[#F3F4F6] rounded-[3px] overflow-hidden">
                    <progress
                      value={b.responseRate}
                      max={100}
                      className={`h-[5px] w-full overflow-hidden rounded-[3px] align-top ${
                        b.responseRate < 90
                          ? '[&::-webkit-progress-value]:bg-[var(--severity-medium)] [&::-moz-progress-bar]:bg-[var(--severity-medium)]'
                          : '[&::-webkit-progress-value]:bg-[var(--severity-low)] [&::-moz-progress-bar]:bg-[var(--severity-low)]'
                      } [&::-webkit-progress-bar]:bg-[#F3F4F6]`}
                    />
                  </div>
                  <div className="text-[#9CA3AF] text-[9px] mt-[2px]">{t('superadmin.overview.statResolutionRate')}</div>
                </div>

                {/* Footer */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex gap-3 flex-wrap">
                    <div className="text-[#6B7280] text-[10px]">
                      <span className="text-[#374151] font-semibold">{b.responders}</span> {t('superadmin.overview.responders')}
                    </div>
                    <div className="text-[#6B7280] text-[10px]">
                      <span className="text-[#374151] font-semibold">{b.registeredUsers}</span> {t('superadmin.overview.usersLabel')}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/superadmin/map')}
                    className="flex items-center gap-1 border border-slate-200 bg-white px-[10px] py-1 cursor-pointer text-[11px] font-semibold shrink-0 text-[#2563EB]"
                  >
                    {t('superadmin.overview.viewMap')} <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts + Logs row */}
      <div className="grid gap-[14px] mb-5 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Incident type distribution */}
        <div className="bg-white p-5 border border-slate-200 border-t-2 border-t-[#2563EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[#0F172A] text-[15px] font-bold">{t('superadmin.overview.incidentTypesTitle')}</div>
              <div className="text-[#9CA3AF] text-[11px] mt-[2px]">{t('superadmin.overview.currentReportingWindow')}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incidentTypeDist} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="type" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#E2E8F0', fontWeight: 600 }}
                itemStyle={{ color: '#CBD5E1' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
              <Bar dataKey="brgy251" name="Brgy 251" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy252" name="Brgy 252" fill="var(--severity-low)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy256" name="Brgy 256" fill="var(--severity-medium)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System activity log */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-2 border-t-[#0F172A] flex flex-col">
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <div className="text-[#0F172A] text-[15px] font-bold">{t('superadmin.overview.activityLogTitle')}</div>
              <div className="text-[#9CA3AF] text-[11px]">{t('superadmin.overview.activityLogSubtitle')}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {systemLogs.map((log) => {
              const ltc = logTypeConfig[log.type] ?? { icon: <Info size={13} />, color: 'var(--outline)' };
              return (
                <div key={log.id} className="flex gap-[10px] px-[10px] py-2 border-b border-slate-100 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1E293B] text-[11px] leading-[1.4]">{log.message}</div>
                    <div className="flex items-center gap-[6px] mt-[3px]">
                      <span className="text-[#9CA3AF] text-[10px]">{formatLogTime(log.timestamp)}</span>
                      {log.barangay && (
                        <span className="font-mono text-[#2563EB] text-[9px] font-bold">{log.barangay}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live OSM Map preview */}
      <div className="sa-overview-map-preview bg-white rounded-xl overflow-hidden mb-5 border border-slate-200 border-t-2 border-t-[#2563EB]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2">
          <div className="flex items-center gap-[10px]">
            <MapPin size={15} className="text-[#2563EB]" />
            <div>
              <div className="text-[#0F172A] text-sm font-bold">{t('superadmin.overview.liveSystemMap')}</div>
              <div className="text-[#9CA3AF] text-[11px]">{t('superadmin.overview.liveMapSubtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
            <div className="flex items-center gap-1">
              <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] inline-block" />
              <span className="font-mono text-[#16A34A] text-[9px] font-bold">{t('superadmin.overview.liveOsm')}</span>
            </div>
            <button
              onClick={() => navigate('/superadmin/map')}
              className="flex items-center gap-[5px] bg-[#2563EB] text-white border-0 px-3 py-1.5 cursor-pointer text-[11px] font-semibold"
            >
              {t('superadmin.overview.fullMap')} <ArrowRight size={11} />
            </button>
          </div>
        </div>
        <IncidentMap
          incidents={mapIncidents}
          height={300}
          compact={false}
          zoom={14}
        />
      </div>

      {/* Bottom quick nav */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: t('superadmin.overview.quickNavMap'),       desc: t('superadmin.overview.quickNavMapDesc'),       path: '/superadmin/map',       accent: '#2563EB' },
          { label: t('superadmin.analytics.title'),            desc: t('superadmin.overview.quickNavAnalyticsDesc'), path: '/superadmin/analytics', accent: '#2563EB' },
          { label: t('superadmin.users.title'),                desc: t('superadmin.overview.quickNavUsersDesc'),     path: '/superadmin/users',     accent: '#16A34A' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 min-w-[220px] max-[420px]:min-w-full bg-white border border-slate-200 px-4 py-[14px] cursor-pointer text-left flex items-center gap-3"
          >
            <div className="min-w-0">
              <div className={`text-[13px] font-semibold ${getQuickNavAccentClass(item.path)}`}>{item.label}</div>
              <div className="text-[#9CA3AF] text-[11px] mt-[2px]">{item.desc}</div>
            </div>
            <ChevronRight size={16} className="ml-auto shrink-0 text-slate-400" />
          </button>
        ))}
      </div>

    </div>
  );
}
