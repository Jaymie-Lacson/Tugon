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
import { superAdminApi, type ApiAdminAnalyticsSummary } from '../../services/superAdminApi';
import { officialReportsApi } from '../../services/officialReportsApi';
import { isIncidentVisibleOnMap, type Incident } from '../../data/incidents';
import { reportToIncident } from '../../utils/incidentAdapters';

const PRIMARY = 'var(--primary)';

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


interface KPIProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number; trendLabel?: string;
}

function KPICard({ label, value, sub, icon, color, trend, trendLabel }: KPIProps) {
  const isUp = (trend ?? 0) >= 0;
  const iconToneClass = getColorToneBackgroundClass(color);
  return (
    <div className="bg-[var(--surface-container-lowest)] rounded-xl px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[var(--outline-variant)]/30 flex-[1_1_220px] min-w-[180px] max-md:flex-[1_1_calc(50%-10px)] max-md:min-w-0 max-[520px]:flex-[1_1_100%]">
      <div className="flex items-start justify-between mb-[10px]">
        <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${iconToneClass}`}>
          {React.cloneElement(icon as React.ReactElement, { color, size: 18 })}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-[3px] text-[11px] font-semibold ${isUp ? 'text-severity-critical' : 'text-[#059669]'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-[var(--on-surface)] text-[26px] font-bold leading-[1.1] mb-[3px]">{value}</div>
      <div className="text-[var(--outline)] text-xs">{label}</div>
      {sub && <div className="text-[var(--outline-variant)] text-[10px] mt-[2px]">{sub}</div>}
      {trendLabel && (
        <div className="text-[var(--outline-variant)] text-[10px] mt-1">{trendLabel}</div>
      )}
    </div>
  );
}

const alertLevelConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: 'NORMAL',   color: '#059669', bg: '#D1FAE5' },
  elevated: { label: 'ELEVATED', color: 'var(--severity-medium)', bg: '#FEF3C7' },
  critical: { label: 'CRITICAL', color: 'var(--severity-critical)', bg: '#FEE2E2' },
};

const logTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  incident: { icon: <AlertTriangle size={13} />, color: 'var(--severity-critical)' },
  user:     { icon: <Users size={13} />,         color: '#1D4ED8' },
  alert:    { icon: <Bell size={13} />,           color: 'var(--severity-medium)' },
  system:   { icon: <Server size={13} />,         color: '#0F766E' },
};

function getColorToneBackgroundClass(color: string) {
  switch (color) {
    case 'var(--severity-critical)':
      return 'bg-[rgba(220,38,38,0.1)]';
    case 'var(--severity-medium)':
      return 'bg-[rgba(180,115,10,0.14)]';
    case '#059669':
      return 'bg-[rgba(5,150,105,0.1)]';
    case '#1D4ED8':
      return 'bg-[rgba(29,78,216,0.1)]';
    case '#0F766E':
      return 'bg-[rgba(15,118,110,0.1)]';
    case 'var(--primary)':
      return 'bg-[rgba(30,58,138,0.1)]';
    default:
      return 'bg-[rgba(107,114,128,0.1)]';
  }
}

function getAlertLevelClass(level: 'normal' | 'elevated' | 'critical') {
  switch (level) {
    case 'normal':
      return 'bg-[#D1FAE5] text-[#059669]';
    case 'elevated':
      return 'bg-[#FEF3C7] text-severity-medium';
    case 'critical':
      return 'bg-[#FEE2E2] text-severity-critical';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function getStatValueClass(color: string) {
  switch (color) {
    case 'var(--severity-critical)':
      return 'text-severity-critical';
    case 'var(--severity-medium)':
      return 'text-severity-medium';
    case '#1D4ED8':
      return 'text-[#1D4ED8]';
    case '#059669':
      return 'text-[#059669]';
    default:
      return 'text-[#0F172A]';
  }
}

function getMapButtonClass(color: string) {
  switch (color) {
    case '#1D4ED8':
      return 'bg-[rgba(29,78,216,0.08)] text-[#1D4ED8] border border-[rgba(29,78,216,0.18)]';
    case '#0F766E':
      return 'bg-[rgba(15,118,110,0.08)] text-[#0F766E] border border-[rgba(15,118,110,0.18)]';
    case 'var(--severity-medium)':
      return 'bg-[rgba(180,115,10,0.08)] text-severity-medium border border-[rgba(180,115,10,0.2)]';
    default:
      return 'bg-[rgba(30,58,138,0.08)] text-primary border border-[rgba(30,58,138,0.18)]';
  }
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

  const loadAnalyticsSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const payload = await superAdminApi.getAnalyticsSummary();
      setAnalyticsSummary(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load analytics summary.';
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const payload = await officialReportsApi.getReports();
      setReportIncidents(payload.reports.map((report) => reportToIncident(report)));
    } catch {
      setReportIncidents([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadBarangays = async () => {
    try {
      const payload = await superAdminApi.getBarangays();
      const colorByCode: Record<string, string> = {
        '251': '#1D4ED8',
        '252': '#0F766E',
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
    } catch {
      setBarangayCards([]);
    }
  };

  const loadAuditLogs = async () => {
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
    } catch {
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
    <div className="p-5 bg-[var(--surface-container-lowest)] min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5 gap-[10px] max-md:flex-col max-md:items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[rgba(30,58,138,0.1)] border border-[rgba(30,58,138,0.25)] rounded-[6px] px-2 py-[2px] text-primary text-[10px] font-bold tracking-[0.08em] uppercase">
              {t('role.superAdmin')}
            </div>
            <div className="text-[var(--outline)] text-xs">{t('superadmin.overview.multiBarangayOverview')}</div>
          </div>
          <h1 className="text-[var(--on-surface)] text-[22px] font-bold m-0">{t('superadmin.overview.dashboardTitle')}</h1>
          <p className="text-[var(--outline)] text-xs m-0 mt-[2px]">
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
            className="flex items-center gap-[6px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)]/30 rounded-lg px-[14px] py-2 cursor-pointer text-[var(--on-surface-variant)] text-xs font-semibold max-md:flex-1 max-md:min-h-10 max-md:justify-center"
          >
            <RefreshCw size={13} color="#6B7280" />
            {summaryLoading ? t('common.refreshing') : t('common.refresh')}
          </button>
          <button
            onClick={() => navigate('/superadmin/analytics')}
            className="flex items-center gap-[6px] bg-primary border-0 rounded-lg px-4 py-2 cursor-pointer text-white text-xs font-semibold max-md:flex-1 max-md:min-h-10 max-md:justify-center"
          >
            {t('superadmin.overview.viewAnalytics')}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {summaryError ? (
        <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] text-severity-critical text-xs px-3 py-[10px]">
          {summaryError}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="flex gap-[14px] mb-5 flex-wrap max-md:gap-[10px]">
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
          icon={<CheckCircle2 />}
          color="#059669"
          trendLabel={t('superadmin.overview.kpiBasedOnTickets')}
        />
        <KPICard
          label={t('superadmin.overview.kpiAvgResponseTime')}
          value={avgResponseLabel}
          sub={t('superadmin.overview.kpiResponseTarget')}
          icon={<Clock />}
          color="var(--severity-medium)"
          trendLabel={t('superadmin.overview.kpiComputedFromIncidents')}
        />
        <KPICard
          label={t('superadmin.overview.kpiRegisteredUsers')}
          value={analyticsSummary?.summary.totalUsers ?? 0}
          sub={t('superadmin.overview.kpiVerifiedAccounts', { count: analyticsSummary?.summary.verifiedUsers ?? 0 })}
          icon={<Users />}
          color="#1D4ED8"
          trendLabel={t('superadmin.overview.kpiAcrossThreeBarangays')}
        />
        <KPICard
          label={t('superadmin.overview.kpiSystemUptime')}
          value="99.87%"
          sub={t('superadmin.overview.kpiAllServicesRunning')}
          icon={<Activity />}
          color="#0F766E"
          trendLabel={t('superadmin.overview.kpiMonitoredByPlatform')}
        />
      </div>

      {/* Barangay cards row */}
      <div className="flex gap-[14px] mb-5 flex-wrap">
        {barangayCards.map((b) => {
          const al = alertLevelConfig[b.alertLevel];
          const alertLevelClass = getAlertLevelClass(b.alertLevel);
          const pinToneClass = getColorToneBackgroundClass(b.color);
          const mapButtonClass = getMapButtonClass(b.color);
          return (
            <div key={b.id} className="flex-1 min-w-[260px] bg-[var(--surface-container-lowest)] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-[var(--outline-variant)]/30">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-[3px]">
                      <span className="text-[var(--on-surface)] text-base font-bold">{b.name}</span>
                      <span
                        className={`text-[9px] font-bold px-[6px] py-[2px] rounded-[4px] tracking-[0.08em] ${alertLevelClass}`}
                      >{al.label}</span>
                    </div>
                    <div className="text-[var(--outline)] text-[11px]">{b.district}</div>
                    <div className="text-[var(--outline-variant)] text-[10px] mt-[2px]">{b.captain}</div>
                  </div>
                  <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center ${pinToneClass}`}>
                    <MapPin size={20} color={b.color} />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: t('superadmin.overview.statActive'),     value: b.activeIncidents,   color: 'var(--severity-critical)' },
                    { label: t('superadmin.overview.statThisMonth'), value: b.totalThisMonth,    color: '#1D4ED8' },
                    { label: t('superadmin.overview.statResolved'),   value: b.resolvedThisMonth, color: '#059669' },
                    { label: t('superadmin.overview.statRespRate'), value: `${b.responseRate}%`, color: 'var(--severity-medium)' },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--surface-container-low)] rounded-lg px-[10px] py-2 border border-[var(--outline-variant)]/20">
                      <div className={`text-[17px] font-bold leading-none ${getStatValueClass(s.color)}`}>{s.value}</div>
                      <div className="text-[var(--outline-variant)] text-[10px] mt-[2px]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Response time bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--outline)] text-[11px]">{t('superadmin.overview.statAvgResponseTime')}</span>
                    <span className={`text-[11px] font-semibold ${b.responseRate < 90 ? 'text-severity-medium' : 'text-[#059669]'}`}>{b.responseRate}%</span>
                  </div>
                  <div className="h-[5px] bg-[#F3F4F6] rounded-[3px] overflow-hidden">
                    <progress
                      value={b.responseRate}
                      max={100}
                      className={`h-[5px] w-full overflow-hidden rounded-[3px] align-top ${
                        b.responseRate < 90
                          ? '[&::-webkit-progress-value]:bg-[var(--severity-medium)] [&::-moz-progress-bar]:bg-[var(--severity-medium)]'
                          : '[&::-webkit-progress-value]:bg-[#059669] [&::-moz-progress-bar]:bg-[#059669]'
                      } [&::-webkit-progress-bar]:bg-[#F3F4F6]`}
                    />
                  </div>
                  <div className="text-[var(--outline-variant)] text-[9px] mt-[2px]">{t('superadmin.overview.statResolutionRate')}</div>
                </div>

                {/* Footer */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex gap-3 flex-wrap">
                    <div className="text-[var(--outline)] text-[10px]">
                      <span className="text-[var(--on-surface-variant)] font-semibold">{b.responders}</span> {t('superadmin.overview.responders')}
                    </div>
                    <div className="text-[var(--outline)] text-[10px]">
                      <span className="text-[var(--on-surface-variant)] font-semibold">{b.registeredUsers}</span> {t('superadmin.overview.usersLabel')}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/superadmin/map')}
                    className={`flex items-center gap-1 rounded-[6px] px-[10px] py-1 cursor-pointer text-[11px] font-semibold shrink-0 ${mapButtonClass}`}
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
        <div
          className="bg-[var(--surface-container-lowest)] rounded-2xl p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[var(--outline-variant)]/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[var(--on-surface)] text-[15px] font-bold">{t('superadmin.overview.incidentTypesTitle')}</div>
              <div className="text-[var(--outline-variant)] text-[11px] mt-[2px]">{t('superadmin.overview.currentReportingWindow')}</div>
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
              <Bar dataKey="brgy251" name="Brgy 251" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy252" name="Brgy 252" fill="#0F766E" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy256" name="Brgy 256" fill="var(--severity-medium)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System activity log */}
        <div className="bg-[var(--surface-container-lowest)] rounded-2xl p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[var(--outline-variant)]/30 flex flex-col">
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <div className="text-[var(--on-surface)] text-[15px] font-bold">{t('superadmin.overview.activityLogTitle')}</div>
              <div className="text-[var(--outline-variant)] text-[11px]">{t('superadmin.overview.activityLogSubtitle')}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {systemLogs.map((log) => {
              const ltc = logTypeConfig[log.type] ?? { icon: <Info size={13} />, color: '#6B7280' };
              return (
                <div key={log.id} className="flex gap-[10px] px-[10px] py-2 rounded-lg bg-[var(--surface-container-low)] border border-[var(--outline-variant)]/20">
                  <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 ${getColorToneBackgroundClass(ltc.color)}`}>
                    {React.cloneElement(ltc.icon as React.ReactElement, { color: ltc.color })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--on-surface)] text-[11px] leading-[1.4]">{log.message}</div>
                    <div className="flex items-center gap-[6px] mt-[3px]">
                      <span className="text-[var(--outline-variant)] text-[10px]">{formatLogTime(log.timestamp)}</span>
                      {log.barangay && (
                        <span className="bg-[#EEF2FF] text-[#4338CA] text-[9px] font-semibold px-[5px] py-[1px] rounded-[3px]">
                          {log.barangay}
                        </span>
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
      <div className="sa-overview-map-preview bg-[var(--surface-container-lowest)] rounded-2xl overflow-hidden mb-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[var(--outline-variant)]/30">
        <div className="px-4 py-3 border-b border-[var(--outline-variant)]/20 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2">
          <div className="flex items-center gap-[10px]">
            <MapPin size={15} color={PRIMARY} />
            <div>
              <div className="text-[var(--on-surface)] text-sm font-bold">{t('superadmin.overview.liveSystemMap')}</div>
              <div className="text-[var(--outline-variant)] text-[11px]">{t('superadmin.overview.liveMapSubtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[5px] px-2 py-[3px] flex items-center gap-1">
              <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] inline-block" />
              <span className="text-[#059669] text-[9px] font-bold">{t('superadmin.overview.liveOsm')}</span>
            </div>
            <button
              onClick={() => navigate('/superadmin/map')}
              className="flex items-center gap-[5px] bg-primary text-white border-0 rounded-[7px] px-3 py-1.5 cursor-pointer text-[11px] font-semibold"
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
          { label: t('superadmin.overview.quickNavMap'),          desc: t('superadmin.overview.quickNavMapDesc'),          path: '/superadmin/map',       color: '#1D4ED8',             icon: <MapPin size={18} /> },
          { label: t('superadmin.analytics.title'),              desc: t('superadmin.overview.quickNavAnalyticsDesc'),    path: '/superadmin/analytics', color: PRIMARY,               icon: <Activity size={18} /> },
          { label: t('superadmin.users.title'),                  desc: t('superadmin.overview.quickNavUsersDesc'),        path: '/superadmin/users',     color: '#0F766E',             icon: <Users size={18} /> },
        ].map((item) => {
          const quickNavToneClass = getColorToneBackgroundClass(item.color);
          return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 min-w-[220px] max-[420px]:min-w-full bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)]/30 rounded-xl px-4 py-[14px] cursor-pointer text-left flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${quickNavToneClass}`}>
              {React.cloneElement(item.icon as React.ReactElement, { color: item.color })}
            </div>
            <div className="min-w-0">
              <div className="text-[var(--on-surface)] text-[13px] font-semibold">{item.label}</div>
              <div className="text-[var(--outline-variant)] text-[11px] mt-[2px]">{item.desc}</div>
            </div>
            <ChevronRight size={16} color="#D1D5DB" className="ml-auto shrink-0" />
          </button>
          );
        })}
      </div>

    </div>
  );
}
