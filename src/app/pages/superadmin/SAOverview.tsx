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

const PRIMARY = '#1E3A8A';

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

const incidentTypeIcons: Record<string, React.ReactNode> = {
  flood: <Droplets size={12} />, accident: <Car size={12} />,
  medical: <Heart size={12} />, crime: <Shield size={12} />, infrastructure: <Zap size={12} />,
};

interface KPIProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number; trendLabel?: string;
}

function KPICard({ label, value, sub, icon, color, trend, trendLabel }: KPIProps) {
  const isUp = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
      flex: '1 1 220px', minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {React.cloneElement(icon as React.ReactElement, { color, size: 18 })}
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            color: isUp ? '#B91C1C' : '#059669', fontSize: 11, fontWeight: 600,
          }}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ color: '#0F172A', fontSize: 26, fontWeight: 700, lineHeight: 1.1, marginBottom: 3 }}>{value}</div>
      <div style={{ color: '#6B7280', fontSize: 12 }}>{label}</div>
      {sub && <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>{sub}</div>}
      {trendLabel && (
        <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 4 }}>{trendLabel}</div>
      )}
    </div>
  );
}

const alertLevelConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: 'NORMAL',   color: '#059669', bg: '#D1FAE5' },
  elevated: { label: 'ELEVATED', color: '#B4730A', bg: '#FEF3C7' },
  critical: { label: 'CRITICAL', color: '#B91C1C', bg: '#FEE2E2' },
};

const logTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  incident: { icon: <AlertTriangle size={13} />, color: '#B91C1C' },
  user:     { icon: <Users size={13} />,         color: '#1D4ED8' },
  alert:    { icon: <Bell size={13} />,           color: '#B4730A' },
  system:   { icon: <Server size={13} />,         color: '#0F766E' },
};

const logSeverityColors: Record<string, string> = {
  error: '#B91C1C', warning: '#B4730A', info: '#1D4ED8', success: '#059669',
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
        '256': '#B4730A',
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
            color: colorByCode[barangay.code] ?? '#1E3A8A',
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
      <div style={{ padding: '20px', minHeight: '100%' }}>
        <TextSkeleton rows={2} title={false} />
        <div style={{ marginTop: 12 }}>
          <CardSkeleton
            count={4}
            lines={2}
            showImage={false}
            gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <TableSkeleton rows={7} columns={4} showHeader />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      {/* Page header */}
      <div className="sa-overview-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              background: 'rgba(30,58,138,0.1)', border: '1px solid rgba(30,58,138,0.25)',
              borderRadius: 6, padding: '2px 8px',
              color: PRIMARY, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Super Admin</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>Multi-Barangay Overview</div>
          </div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>System Overview Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            Monitoring Barangays 251, 252 & 256 — Real-time Status
          </p>
        </div>
        <div className="sa-overview-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              void loadAnalyticsSummary();
              void loadReports();
              void loadBarangays();
              void loadAuditLogs();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', color: '#374151', fontSize: 12, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} color="#6B7280" />
            {summaryLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/superadmin/analytics')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: PRIMARY, border: 'none', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 600,
            }}
          >
            View Analytics
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {summaryError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#B91C1C', fontSize: 12, padding: '10px 12px' }}>
          {summaryError}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="sa-overview-kpi-row" style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard
          label="Active Incidents (All Barangays)"
          value={total}
          sub="Across Brgy 251, 252, 256"
          icon={<AlertTriangle />}
          color="#B91C1C"
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
          color="#B4730A"
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
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {barangayCards.map((b) => {
          const al = alertLevelConfig[b.alertLevel];
          return (
            <div key={b.id} style={{
              flex: 1, minWidth: 260,
              background: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
            }}>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ color: '#0F172A', fontSize: 16, fontWeight: 700 }}>{b.name}</span>
                      <span style={{
                        background: al.bg, color: al.color,
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em',
                      }}>{al.label}</span>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 11 }}>{b.district}</div>
                    <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>{b.captain}</div>
                  </div>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: `${b.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MapPin size={20} color={b.color} />
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Active',     value: b.activeIncidents, color: '#B91C1C' },
                    { label: 'This Month', value: b.totalThisMonth,   color: '#1D4ED8' },
                    { label: 'Resolved',   value: b.resolvedThisMonth, color: '#059669' },
                    { label: 'Resp. Rate', value: `${b.responseRate}%`, color: '#B4730A' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#F9FAFB', borderRadius: 8, padding: '8px 10px',
                      border: '1px solid #F3F4F6',
                    }}>
                      <div style={{ color: s.color, fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Response time bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#6B7280', fontSize: 11 }}>Avg Response Time</span>
                    <span style={{
                      color: b.responseRate < 90 ? '#B4730A' : '#059669',
                      fontSize: 11, fontWeight: 600,
                    }}>{b.responseRate}%</span>
                  </div>
                  <div style={{ height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${b.responseRate}%`,
                      background: b.responseRate < 90 ? '#B4730A' : '#059669',
                      borderRadius: 3,
                    }} />
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 2 }}>Resolution rate</div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ color: '#6B7280', fontSize: 10 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{b.responders}</span> responders
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 10 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{b.registeredUsers}</span> users
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/superadmin/map')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: `${b.color}14`, color: b.color,
                      border: `1px solid ${b.color}30`, borderRadius: 6,
                      padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
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
      <div className="sa-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, marginBottom: 20, alignItems: 'start' }}>
        {/* Incident type distribution */}
        <div
          ref={incidentTypesCardRef}
          style={{
          background: '#FFFFFF', borderRadius: 14, padding: '20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>Incident Types — All Barangays</div>
              <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Current reporting window</div>
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
              <Bar dataKey="brgy256" name="Brgy 256" fill="#B4730A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System activity log */}
        <div
          className="sa-overview-activity-card"
          style={{
          background: '#FFFFFF', borderRadius: 14, padding: '20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column',
          height: incidentTypesCardHeight ?? undefined,
          maxHeight: incidentTypesCardHeight ?? undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>System Activity Log</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>Live feed — all barangays</div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
            }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {systemLogs.map((log) => {
              const ltc = logTypeConfig[log.type] ?? { icon: <Info size={13} />, color: '#6B7280' };
              const sev = logSeverityColors[log.severity] ?? '#6B7280';
              return (
                <div key={log.id} style={{
                  display: 'flex', gap: 10, padding: '8px 10px',
                  borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `${ltc.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {React.cloneElement(ltc.icon as React.ReactElement, { color: ltc.color })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#1E293B', fontSize: 11, lineHeight: 1.4 }}>{log.message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ color: '#9CA3AF', fontSize: 10 }}>{formatLogTime(log.timestamp)}</span>
                      {log.barangay && (
                        <span style={{
                          background: '#EEF2FF', color: '#4338CA',
                          fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                        }}>{log.barangay}</span>
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
      <div className="sa-overview-map-preview" style={{
        background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
      }}>
        <div className="sa-overview-map-preview-head" style={{
          padding: '12px 16px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={15} color={PRIMARY} />
            <div>
              <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>Live System Map</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>Open incidents · OpenStreetMap · Municipality of Tugon</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <span style={{ color: '#059669', fontSize: 9, fontWeight: 700 }}>LIVE · OSM</span>
            </div>
            <button
              onClick={() => navigate('/superadmin/map')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: PRIMARY, color: 'white', border: 'none',
                borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              }}
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
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Barangay Map & Boundaries', desc: 'View Brgy 251, 252, 256 boundary map with live incidents', path: '/superadmin/map', color: '#1D4ED8', icon: <MapPin size={18} /> },
          { label: 'System Analytics',          desc: 'Heatmaps, trend charts & response time analytics',         path: '/superadmin/analytics', color: PRIMARY, icon: <Activity size={18} /> },
          { label: 'User Management',           desc: 'Manage accounts, roles & permissions across all barangays', path: '/superadmin/users', color: '#0F766E', icon: <Users size={18} /> },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, minWidth: 220,
              background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12,
              padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {React.cloneElement(item.icon as React.ReactElement, { color: item.color })}
            </div>
            <div>
              <div style={{ color: '#0F172A', fontSize: 13, fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>{item.desc}</div>
            </div>
            <ChevronRight size={16} color="#D1D5DB" style={{ marginLeft: 'auto', flexShrink: 0 }} />
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
