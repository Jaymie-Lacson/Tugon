import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Users, CheckCircle2, Clock, TrendingUp,
  TrendingDown, Minus, Radio, MapPin, ArrowRight, Flame,
  Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind,
  ChevronRight, RefreshCw, Navigation2, Bell,
  SlidersHorizontal,
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
import { useNavigate } from 'react-router';
import { officialReportsApi, type ApiCrossBorderAlert, type ApiHeatmapCluster } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

const CATEGORY_DIST_CONFIG = [
  { name: 'Fire', color: '#B91C1C' },
  { name: 'Pollution', color: '#0F766E' },
  { name: 'Noise', color: '#7C3AED' },
  { name: 'Crime', color: '#1E3A8A' },
  { name: 'Road Hazard', color: '#B4730A' },
  { name: 'Other', color: '#475569' },
];

const typeIcons: Record<string, React.ReactNode> = {
  fire: <Flame size={14} />, flood: <Droplets size={14} />, accident: <Car size={14} />,
  medical: <Heart size={14} />, crime: <ShieldIcon size={14} />, infrastructure: <Zap size={14} />, typhoon: <Wind size={14} />,
};

interface KPICardProps {
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; accent: string; trend?: { dir: 'up' | 'down' | 'flat'; val: string };
  bgLight: string;
}

function KPICard({ title, value, subtitle, icon, accent, trend, bgLight }: KPICardProps) {
  const TrendIcon = trend?.dir === 'up' ? TrendingUp : trend?.dir === 'down' ? TrendingDown : Minus;
  const trendColor = accent === '#B91C1C' ? '#B91C1C' : accent === '#059669' ? '#059669' : '#B4730A';
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: '0 1px 5px rgba(15, 23, 42, 0.06)',
      border: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#94A3B8', fontSize: 11 }}>{subtitle}</span>
        {trend && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: trendColor }}>
            <TrendIcon size={12} />
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
  const critical = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved');
  if (critical.length === 0) return null;
  return (
    <div style={{
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      borderLeft: '4px solid #B91C1C',
      borderRadius: 8,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    }}>
      <Radio size={16} color="#B91C1C" style={{ flexShrink: 0, animation: 'pulse 2s infinite' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: '#B91C1C', fontWeight: 700, fontSize: 12 }}>ACTIVE ALERT: </span>
        <span style={{ color: '#7F1D1D', fontSize: 12 }}>
          {critical.length} critical incident{critical.length > 1 ? 's' : ''} requiring immediate response —{' '}
          {critical.map((incident, index) => (
            <React.Fragment key={incident.id}>
              <button
                type="button"
                onClick={() => onOpenIncident(incident.id)}
                style={{
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  background: 'transparent',
                  color: '#7F1D1D',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {incident.id}
              </button>
              {index < critical.length - 1 ? ' · ' : null}
            </React.Fragment>
          ))}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpenIncident(critical[0].id)}
        style={{
        background: '#B91C1C', color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 8px',
        borderRadius: 4, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
        border: 'none',
        cursor: 'pointer',
      }}
      >
        CRITICAL
      </button>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [alerts, setAlerts] = useState<ApiCrossBorderAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [markingReadAlertId, setMarkingReadAlertId] = useState<string | null>(null);
  const [heatmapClusters, setHeatmapClusters] = useState<ApiHeatmapCluster[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [mapRenderMode, setMapRenderMode] = useState<'hotspot' | 'standard'>('hotspot');
  const [showHeatmapTuning, setShowHeatmapTuning] = useState(false);
  const [heatRadiusPercent, setHeatRadiusPercent] = useState(85);
  const [heatOpacityPercent, setHeatOpacityPercent] = useState(100);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const mapIncidents = React.useMemo(() => incidents.filter((incident) => isIncidentVisibleOnMap(incident)), [incidents]);
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'responding');
  const todayIso = new Date().toISOString().slice(0, 10);
  const resolvedToday = incidents.filter(i => i.resolvedAt?.startsWith(todayIso));
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

  const loadReports = async () => {
    setIncidentsLoading(true);
    setIncidentsError(null);
    try {
      const payload = await officialReportsApi.getReports();
      const mapped = payload.reports.map((report) => reportToIncident(report));
      const mappedMapIncidents = mapped.filter((incident) => isIncidentVisibleOnMap(incident));
      setIncidents(mapped);
      setSelectedIncident((current) => {
        if (!current) {
          return mappedMapIncidents[0] ?? null;
        }
        return mappedMapIncidents.find((item) => item.id === current.id) ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load incidents.';
      setIncidentsError(message);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const loadAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const payload = await officialReportsApi.getAlerts();
      setAlerts(payload.alerts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load cross-border alerts.';
      setAlertsError(message);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadHeatmap = async () => {
    setHeatmapLoading(true);
    setHeatmapError(null);
    try {
      const payload = await officialReportsApi.getHeatmap({
        days: 14,
        threshold: 3,
      });
      setHeatmapClusters(payload.clusters);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load heatmap hotspots.';
      setHeatmapError(message);
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    void loadAlerts();
    void loadHeatmap();
  }, []);

  useEffect(() => {
    if (!initialLoadPending) {
      return;
    }

    if (!incidentsLoading && !alertsLoading && !heatmapLoading) {
      setInitialLoadPending(false);
    }
  }, [initialLoadPending, incidentsLoading, alertsLoading, heatmapLoading]);

  useEffect(() => {
    if (heatmapLoading) {
      return;
    }

    // Fallback to pin mode when there are no qualifying hotspot clusters.
    if (heatmapClusters.length === 0 && mapRenderMode === 'hotspot') {
      setMapRenderMode('standard');
    }
  }, [heatmapClusters.length, heatmapLoading, mapRenderMode]);

  const handleMarkAlertRead = async (alertId: string) => {
    setMarkingReadAlertId(alertId);
    setAlertsError(null);
    try {
      const payload = await officialReportsApi.markAlertRead(alertId);
      setAlerts((current) => current.map((item) => (item.id === alertId ? payload.alert : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update alert.';
      setAlertsError(message);
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
      <div style={{ padding: '14px 16px', minHeight: '100%' }}>
        <CardSkeleton
          count={4}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        />
        <div style={{ marginTop: 16 }}>
          <TextSkeleton rows={3} title={false} />
        </div>
        <div style={{ marginTop: 16 }}>
          <TableSkeleton rows={8} columns={3} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px', minHeight: '100%' }}>
      {/* Alert banner */}
      <AlertBanner
        incidents={incidents}
        onOpenIncident={(incidentId) => {
          navigate(`/app/incidents?incident=${encodeURIComponent(incidentId)}`);
        }}
      />

      {incidentsError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
          {incidentsError}
        </div>
      ) : null}

      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} color="#B4730A" />
            <span style={{ color: '#1E293B', fontWeight: 700, fontSize: 13 }}>Cross-Border Alerts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: unreadAlerts > 0 ? '#B91C1C' : '#64748B', fontWeight: 700 }}>
              {unreadAlerts} unread
            </span>
            <button
              onClick={() => {
                void loadAlerts();
              }}
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {alertsError ? (
          <div style={{ margin: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
            {alertsError}
          </div>
        ) : null}

        <div style={{ padding: '8px 16px 14px' }}>
          {alertsLoading ? (
            <TextSkeleton
              rows={2}
              title={false}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          ) : alerts.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 12, padding: '8px 0' }}>No nearby cross-border alerts for your barangay right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 10px', background: alert.readAt ? '#F8FAFC' : '#FFFBEB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>
                      Incident {alert.report.id} near Barangay {alert.sourceBarangayCode}
                    </div>
                    <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                      {alert.alertReason}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 4 }}>
                      {new Date(alert.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} · {alert.report.location}
                    </div>
                  </div>
                  {alert.readAt ? (
                    <span style={{ color: '#059669', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>Read</span>
                  ) : (
                    <button
                      onClick={() => {
                        void handleMarkAlertRead(alert.id);
                      }}
                      disabled={markingReadAlertId === alert.id}
                      style={{ border: '1px solid #E2E8F0', background: 'white', color: '#1E3A8A', borderRadius: 6, padding: '6px 8px', fontSize: 10, fontWeight: 700, cursor: markingReadAlertId === alert.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {markingReadAlertId === alert.id ? 'Saving...' : 'Mark Read'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={15} color="#1E3A8A" />
            <span style={{ color: '#1E293B', fontWeight: 700, fontSize: 13 }}>Heatmap Hotspots</span>
          </div>
          <button
            onClick={() => {
              void loadHeatmap();
            }}
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div style={{ padding: '10px 16px 14px' }}>
          {heatmapError ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
              {heatmapError}
            </div>
          ) : heatmapLoading ? (
            <TextSkeleton
              rows={2}
              title={false}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          ) : heatmapClusters.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 12, padding: '8px 0' }}>
              No hotspot cluster reached the current threshold.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 700 }}>
                  {heatmapClusters.length} hotspot cluster{heatmapClusters.length > 1 ? 's' : ''} detected
                </div>
                {strongestHeatCluster ? (
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                    Strongest: {strongestHeatCluster.category} ({strongestHeatCluster.incidentCount} incidents)
                  </div>
                ) : null}
              </div>
              <div style={{ color: '#94A3B8', fontSize: 11 }}>
                {heatmapClusters.length > 0 ? 'Hotspot focus available on map panel' : 'Switches to incident pins automatically'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards — 2-col grid on mobile */}
      <div className="kpi-grid" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KPICard
          title="Active Incidents"
          value={activeIncidents.length}
          subtitle={`${criticalCount} critical · ${activeIncidents.filter(i => i.status === 'responding').length} responding`}
          icon={<AlertTriangle size={20} />}
          accent="#B91C1C"
          bgLight="#FEE2E2"
          trend={{ dir: 'flat', val: 'Live total' }}
        />
        <KPICard
          title="Deployed Units"
          value={deployedUnits}
          subtitle={staffedActiveIncidents > 0 ? `${staffedActiveIncidents} cases with assigned responders` : 'No assigned responders yet'}
          icon={<Users size={20} />}
          accent="#1E3A8A"
          bgLight="#DBEAFE"
          trend={{ dir: 'flat', val: `${activeIncidents.length} active cases` }}
        />
        <KPICard
          title="Resolved Today"
          value={resolvedToday.length}
          subtitle="Since 00:00 PHT"
          icon={<CheckCircle2 size={20} />}
          accent="#059669"
          bgLight="#D1FAE5"
          trend={{ dir: 'flat', val: 'Live total' }}
        />
        <KPICard
          title="Avg. Response"
          value={avgResponseMinutes !== null ? `${avgResponseMinutes} min` : 'N/A'}
          subtitle={avgResponseMinutes !== null ? 'Based on responded reports' : 'Waiting for response timestamps'}
          icon={<Clock size={20} />}
          accent="#B4730A"
          bgLight="#FEF3C7"
          trend={{ dir: 'flat', val: 'Live metric' }}
        />
      </div>

      {/* Map + Live Feed Row — stacks on mobile */}
      <div className="dashboard-row" style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Map Preview */}
        <div style={{
          flex: '3 1 340px',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color="#1E3A8A" />
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Incident Overview Map</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden', background: '#F8FAFC' }}>
                <button
                  onClick={() => setMapRenderMode('hotspot')}
                  disabled={heatmapLoading || heatmapClusters.length === 0}
                  style={{
                    border: 'none',
                    borderRight: '1px solid #CBD5E1',
                    background: mapRenderMode === 'hotspot' ? '#1E3A8A' : '#F8FAFC',
                    color: mapRenderMode === 'hotspot' ? '#FFFFFF' : '#334155',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '5px 9px',
                    cursor: heatmapLoading || heatmapClusters.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: heatmapLoading || heatmapClusters.length === 0 ? 0.5 : 1,
                  }}
                  title={heatmapClusters.length === 0 ? 'No hotspot cluster reached the threshold' : 'Show hotspot-focused analytics view'}
                >
                  Hotspot Focus
                </button>
                <button
                  onClick={() => setMapRenderMode('standard')}
                  style={{
                    border: 'none',
                    background: mapRenderMode === 'standard' ? '#1E3A8A' : '#F8FAFC',
                    color: mapRenderMode === 'standard' ? '#FFFFFF' : '#334155',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '5px 9px',
                    cursor: 'pointer',
                  }}
                  title="Show incident-level marker view"
                >
                  Incident Pins
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0FDF4', borderRadius: 5, padding: '3px 7px', border: '1px solid #BBF7D0' }}>
                <Navigation2 size={9} color="#059669" />
                <span style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>OpenStreetMap</span>
              </div>
              <button
                onClick={() => navigate('/app/map')}
                style={{
                  background: '#EFF6FF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: '#1E3A8A',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Full Map <ArrowRight size={11} />
              </button>
              <button
                onClick={() => {
                  setShowHeatmapTuning((current) => !current);
                  setMapRenderMode('hotspot');
                }}
                style={{
                  background: showHeatmapTuning ? '#1E3A8A' : '#EFF6FF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: showHeatmapTuning ? '#FFFFFF' : '#1E3A8A',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <SlidersHorizontal size={11} /> Tune
              </button>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {showHeatmapTuning ? (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1200,
                  width: 220,
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid #DBEAFE',
                  borderRadius: 12,
                  boxShadow: '0 6px 24px rgba(15,23,42,.16)',
                  padding: 10,
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onMouseMove={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ color: '#1E293B', fontSize: 11, fontWeight: 700 }}>Heatmap Settings</span>
                  <button
                    onClick={handleResetHeatmapTuning}
                    style={{
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      borderRadius: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '3px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#64748B', fontSize: 9, fontWeight: 600 }}>Radius</span>
                    <span style={{ color: '#1E293B', fontSize: 9, fontWeight: 700 }}>{heatRadiusPercent}%</span>
                  </div>
                  <input
                    type="range"
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
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#64748B', fontSize: 9, fontWeight: 600 }}>Opacity</span>
                    <span style={{ color: '#1E293B', fontSize: 9, fontWeight: 700 }}>{heatOpacityPercent}%</span>
                  </div>
                  <input
                    type="range"
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
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : null}

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
          </div>
          {selectedIncident && (
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{selectedIncident.id} — {selectedIncident.barangay}</div>
                <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedIncident.description}</div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Navigation2 size={9} color="#9CA3AF" />
                  {selectedIncident.lat.toFixed(5)}°N, {selectedIncident.lng.toFixed(5)}°E
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <TypeBadge type={selectedIncident.type} size="sm" />
                <SeverityBadge severity={selectedIncident.severity} size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div style={{
          flex: '2 1 260px',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#22C55E', display: 'inline-block',
                boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
              }} />
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Live Incident Feed</span>
            </div>
            <RefreshCw size={13} color="#94A3B8" style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
            {incidentsLoading ? (
              <div style={{ padding: '10px 14px' }}>
                <TableSkeleton rows={6} columns={3} showHeader={false} className="border-0 shadow-none" />
              </div>
            ) : (
              incidents.slice(0, 10).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate('/app/incidents')}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #F8FAFC',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: incidentTypeConfig[inc.type].bgColor,
                    color: incidentTypeConfig[inc.type].color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {typeIcons[inc.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{inc.id}</span>
                      <StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} />
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.barangay}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                      {new Date(inc.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <SeverityBadge severity={inc.severity} size="sm" />
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
            <button
              onClick={() => navigate('/app/incidents')}
              style={{
                background: 'none', border: 'none', color: '#1E3A8A', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto',
              }}
            >
              View All Incidents <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row — stacks on mobile */}
      <div className="charts-row" style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Trend Chart */}
        <div style={{ flex: '3 1 300px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>{trendData.length}-Day Incident Trend</div>
              <div style={{ color: '#94A3B8', fontSize: 11 }}>{trendWindowLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#1E3A8A', display: 'inline-block', borderRadius: 2 }} />
                <span style={{ color: '#64748B' }}>Reported</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#059669', display: 'inline-block', borderRadius: 2 }} />
                <span style={{ color: '#64748B' }}>Resolved</span>
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
              <Line key="line-incidents" type="monotone" dataKey="incidents" name="Reported" stroke="#1E3A8A" strokeWidth={2.5} dot={{ r: 3, fill: '#1E3A8A' }} activeDot={{ r: 5 }} isAnimationActive={false} />
              <Line key="line-resolved" type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Type Distribution */}
        <div style={{ flex: '2 1 220px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Incident by Category</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 10 }}>Current category distribution</div>
          <div className="type-dist-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PieChart className="type-dist-pie" width={120} height={120}>
              <Pie data={typeDist} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                {typeDist.map((entry, index) => (
                  <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="type-dist-list" style={{ flex: 1 }}>
              {typeDist.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#475569' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .type-dist-wrap {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .type-dist-pie {
            align-self: center;
          }

          .type-dist-list {
            width: 100%;
          }
        }
      `}</style>

      {/* Recent Incidents Table */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Recent Incidents - Live Data</span>
          <button
            onClick={() => navigate('/app/incidents')}
            style={{ background: '#EFF6FF', border: 'none', borderRadius: 8, color: '#1E3A8A', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', minHeight: 40 }}
          >
            View All <ChevronRight size={13} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 580 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Incident ID', 'Type', 'Location', 'Severity', 'Status', 'Reported', 'Responders'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 8).map((inc) => (
                <tr
                  key={inc.id}
                  style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  onClick={() => navigate('/app/incidents')}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{inc.id}</td>
                  <td style={{ padding: '10px 14px' }}><TypeBadge type={inc.type} size="sm" /></td>
                  <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.barangay}</td>
                  <td style={{ padding: '10px 14px' }}><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                    {new Date(inc.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#1E293B', fontWeight: 500 }}>{inc.responders} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
