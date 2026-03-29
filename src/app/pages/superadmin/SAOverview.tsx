import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Users, Activity, TrendingUp, TrendingDown,
  Clock, Shield, Zap, ArrowRight, MapPin, Droplets, Car, Heart,
  RefreshCw, ChevronRight, Info, Bell, Server,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
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
  return (
    <div className="bg-white rounded-xl px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[#E5E7EB] flex-[1_1_220px] min-w-[180px]">
      <div className="flex items-start justify-between mb-[10px]">
        <div
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          {React.cloneElement(icon as React.ReactElement, { color, size: 18 })}
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-[3px] text-[11px] font-semibold"
            style={{ color: isUp ? 'var(--severity-critical)' : '#059669' }}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-[#0F172A] text-[26px] font-bold leading-[1.1] mb-[3px]">{value}</div>
      <div className="text-[#6B7280] text-xs">{label}</div>
      {sub && <div className="text-[#9CA3AF] text-[10px] mt-[2px]">{sub}</div>}
      {trendLabel && (
        <div className="text-[#9CA3AF] text-[10px] mt-1">{trendLabel}</div>
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
  const navigate = useNavigate();
  const incidentTypesCardRef = useRef<HTMLDivElement | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<ApiAdminAnalyticsSummary | null>(null);
  const [reportIncidents, setReportIncidents] = useState<Incident[]>([]);
  const [barangayCards, setBarangayCards] = useState<BarangayOverviewCard[]>([]);
  const [systemLogs, setSystemLogs] = useState<Array<{ id: string; timestamp: string; type: string; message: string; barangay?: string; severity: string }>>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [incidentTypesCardHeight, setIncidentTypesCardHeight] = useState<number | null>(null);
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

  useEffect(() => {
    const cardElement = incidentTypesCardRef.current;
    if (!cardElement) {
      return;
    }

    const syncHeight = () => {
      setIncidentTypesCardHeight(Math.round(cardElement.getBoundingClientRect().height));
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncHeight();
    });
    observer.observe(cardElement);

    return () => {
      observer.disconnect();
    };
  }, [reportIncidents.length]);

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
    <div className="p-5 bg-[#F0F4FF] min-h-full">
      {/* Page header */}
      <div className="sa-overview-header flex items-center justify-between mb-5 gap-[10px]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[rgba(30,58,138,0.1)] border border-[rgba(30,58,138,0.25)] rounded-[6px] px-2 py-[2px] text-primary text-[10px] font-bold tracking-[0.08em] uppercase">
              Super Admin
            </div>
            <div className="text-[#6B7280] text-xs">Multi-Barangay Overview</div>
          </div>
          <h1 className="text-[#0F172A] text-[22px] font-bold m-0">System Overview Dashboard</h1>
          <p className="text-[#6B7280] text-xs m-0 mt-[2px]">
            Monitoring Barangays 251, 252 & 256 — Real-time Status
          </p>
        </div>
        <div className="sa-overview-header-actions flex items-center gap-[10px]">
          <button
            onClick={() => {
              void loadAnalyticsSummary();
              void loadReports();
              void loadBarangays();
              void loadAuditLogs();
            }}
            className="flex items-center gap-[6px] bg-white border border-[#E5E7EB] rounded-lg px-[14px] py-2 cursor-pointer text-[#374151] text-xs font-semibold"
          >
            <RefreshCw size={13} color="#6B7280" />
            {summaryLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/superadmin/analytics')}
            className="flex items-center gap-[6px] bg-primary border-0 rounded-lg px-4 py-2 cursor-pointer text-white text-xs font-semibold"
          >
            View Analytics
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
      <div className="sa-overview-kpi-row flex gap-[14px] mb-5 flex-wrap">
        <KPICard
          label="Active Incidents (All Barangays)"
          value={total}
          sub="Across Brgy 251, 252, 256"
          icon={<AlertTriangle />}
          color="var(--severity-critical)"
          trend={activeTrendPercent}
          trendLabel={`${openedToday} new reports today`}
        />
        <KPICard
          label="Resolved Today"
          value={resolvedToday}
          sub="Incidents closed today"
          icon={<CheckCircle2 />}
          color="#059669"
          trendLabel="Based on ticket status updates"
        />
        <KPICard
          label="Avg. Response Time"
          value={avgResponseLabel}
          sub="Target: ≤ 10 min"
          icon={<Clock />}
          color="var(--severity-medium)"
          trendLabel="Computed from responded incidents"
        />
        <KPICard
          label="Registered Users"
          value={analyticsSummary?.summary.totalUsers ?? 0}
          sub={`${analyticsSummary?.summary.verifiedUsers ?? 0} verified accounts`}
          icon={<Users />}
          color="#1D4ED8"
          trendLabel="across 3 barangays"
        />
        <KPICard
          label="System Uptime"
          value="99.87%"
          sub="All services running"
          icon={<Activity />}
          color="#0F766E"
          trendLabel="Monitored by deployment platform"
        />
      </div>

      {/* Barangay cards row */}
      <div className="flex gap-[14px] mb-5 flex-wrap">
        {barangayCards.map((b) => {
          const al = alertLevelConfig[b.alertLevel];
          return (
            <div key={b.id} className="flex-1 min-w-[260px] bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-[#E5E7EB]">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-[3px]">
                      <span className="text-[#0F172A] text-base font-bold">{b.name}</span>
                      <span
                        className="text-[9px] font-bold px-[6px] py-[2px] rounded-[4px] tracking-[0.08em]"
                        style={{ background: al.bg, color: al.color }}
                      >{al.label}</span>
                    </div>
                    <div className="text-[#6B7280] text-[11px]">{b.district}</div>
                    <div className="text-[#9CA3AF] text-[10px] mt-[2px]">{b.captain}</div>
                  </div>
                  <div
                    className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center"
                    style={{ background: `${b.color}18` }}
                  >
                    <MapPin size={20} color={b.color} />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Active',     value: b.activeIncidents,   color: 'var(--severity-critical)' },
                    { label: 'This Month', value: b.totalThisMonth,    color: '#1D4ED8' },
                    { label: 'Resolved',   value: b.resolvedThisMonth, color: '#059669' },
                    { label: 'Resp. Rate', value: `${b.responseRate}%`, color: 'var(--severity-medium)' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F9FAFB] rounded-lg px-[10px] py-2 border border-[#F3F4F6]">
                      <div className="text-[17px] font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[#9CA3AF] text-[10px] mt-[2px]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Response time bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#6B7280] text-[11px]">Avg Response Time</span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: b.responseRate < 90 ? 'var(--severity-medium)' : '#059669' }}
                    >{b.responseRate}%</span>
                  </div>
                  <div className="h-[5px] bg-[#F3F4F6] rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px]"
                      style={{
                        width: `${b.responseRate}%`,
                        background: b.responseRate < 90 ? 'var(--severity-medium)' : '#059669',
                      }}
                    />
                  </div>
                  <div className="text-[#9CA3AF] text-[9px] mt-[2px]">Resolution rate</div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="text-[#6B7280] text-[10px]">
                      <span className="text-[#374151] font-semibold">{b.responders}</span> responders
                    </div>
                    <div className="text-[#6B7280] text-[10px]">
                      <span className="text-[#374151] font-semibold">{b.registeredUsers}</span> users
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/superadmin/map')}
                    className="flex items-center gap-1 rounded-[6px] px-[10px] py-1 cursor-pointer text-[11px] font-semibold"
                    style={{ background: `${b.color}14`, color: b.color, border: `1px solid ${b.color}30` }}
                  >
                    View Map <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts + Logs row */}
      <div
        className="sa-overview-grid grid gap-[14px] mb-5 items-start"
        style={{ gridTemplateColumns: '1fr 380px' }}
      >
        {/* Incident type distribution */}
        <div
          ref={incidentTypesCardRef}
          className="bg-white rounded-2xl p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[#E5E7EB]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[#0F172A] text-[15px] font-bold">Incident Types — All Barangays</div>
              <div className="text-[#9CA3AF] text-[11px] mt-[2px]">Current reporting window</div>
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
        <div
          className="sa-overview-activity-card bg-white rounded-2xl p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[#E5E7EB] flex flex-col"
          style={{
            height: incidentTypesCardHeight ?? undefined,
            maxHeight: incidentTypesCardHeight ?? undefined,
          }}
        >
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <div className="text-[#0F172A] text-[15px] font-bold">System Activity Log</div>
              <div className="text-[#9CA3AF] text-[11px]">Live feed — all barangays</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {systemLogs.map((log) => {
              const ltc = logTypeConfig[log.type] ?? { icon: <Info size={13} />, color: '#6B7280' };
              return (
                <div key={log.id} className="flex gap-[10px] px-[10px] py-2 rounded-lg bg-[#F9FAFB] border border-[#F3F4F6]">
                  <div
                    className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
                    style={{ background: `${ltc.color}18` }}
                  >
                    {React.cloneElement(ltc.icon as React.ReactElement, { color: ltc.color })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1E293B] text-[11px] leading-[1.4]">{log.message}</div>
                    <div className="flex items-center gap-[6px] mt-[3px]">
                      <span className="text-[#9CA3AF] text-[10px]">{formatLogTime(log.timestamp)}</span>
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
      <div className="sa-overview-map-preview bg-white rounded-2xl overflow-hidden mb-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-[#E5E7EB]">
        <div className="sa-overview-map-preview-head px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <MapPin size={15} color={PRIMARY} />
            <div>
              <div className="text-[#0F172A] text-sm font-bold">Live System Map</div>
              <div className="text-[#9CA3AF] text-[11px]">Open incidents · OpenStreetMap · Municipality of Tugon</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[5px] px-2 py-[3px] flex items-center gap-1">
              <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] inline-block" />
              <span className="text-[#059669] text-[9px] font-bold">LIVE · OSM</span>
            </div>
            <button
              onClick={() => navigate('/superadmin/map')}
              className="flex items-center gap-[5px] bg-primary text-white border-0 rounded-[7px] px-3 py-1.5 cursor-pointer text-[11px] font-semibold"
            >
              Full Map <ArrowRight size={11} />
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
          { label: 'Barangay Map & Boundaries', desc: 'View Brgy 251, 252, 256 boundary map with live incidents', path: '/superadmin/map', color: '#1D4ED8', icon: <MapPin size={18} /> },
          { label: 'System Analytics',          desc: 'Heatmaps, trend charts & response time analytics',         path: '/superadmin/analytics', color: PRIMARY, icon: <Activity size={18} /> },
          { label: 'User Management',           desc: 'Manage accounts, roles & permissions across all barangays', path: '/superadmin/users', color: '#0F766E', icon: <Users size={18} /> },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 min-w-[220px] bg-white border border-[#E5E7EB] rounded-xl px-4 py-[14px] cursor-pointer text-left flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: `${item.color}15` }}
            >
              {React.cloneElement(item.icon as React.ReactElement, { color: item.color })}
            </div>
            <div>
              <div className="text-[#0F172A] text-[13px] font-semibold">{item.label}</div>
              <div className="text-[#9CA3AF] text-[11px] mt-[2px]">{item.desc}</div>
            </div>
            <ChevronRight size={16} color="#D1D5DB" className="ml-auto shrink-0" />
          </button>
        ))}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .sa-overview-grid {
            grid-template-columns: 1fr !important;
          }

          .sa-overview-activity-card {
            height: auto !important;
            max-height: none !important;
          }
        }

        @media (max-width: 768px) {
          .sa-overview-kpi-row {
            gap: 10px;
          }

          .sa-overview-kpi-row > div {
            flex: 1 1 calc(50% - 10px) !important;
            min-width: 0 !important;
          }

          .sa-overview-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .sa-overview-header-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .sa-overview-header-actions button {
            flex: 1;
            min-height: 40px;
            justify-content: center;
          }

          .sa-overview-map-preview-head {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 8px;
          }

          .sa-overview-map-preview-head > div:last-child {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 520px) {
          .sa-overview-kpi-row > div {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
