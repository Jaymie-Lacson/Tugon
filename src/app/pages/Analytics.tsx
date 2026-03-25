import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import { officialReportsApi } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import type { Incident } from '../data/incidents';
import {
  ANALYTICS_PERIODS,
  ANALYTICS_BARANGAY_BAR_COLORS,
  ANALYTICS_HOURLY_BANDS,
  ANALYTICS_PERIOD_DAYS,
  ANALYTICS_RESPONSE_TARGETS,
  ANALYTICS_SEVERITY_SERIES,
  ANALYTICS_TREND_SERIES,
  ANALYTICS_TYPE_LABELS,
  ANALYTICS_TYPE_ORDER,
  ANALYTICS_UTILIZATION_BANDS,
} from '../data/analyticsConfig';

const PERIODS = [...ANALYTICS_PERIODS];

function toSeriesLegendName(seriesKey: string): string {
  if (seriesKey === 'flood') return 'Pollution';
  if (seriesKey === 'accident') return 'Road Hazard';
  if (seriesKey === 'medical') return 'Noise';
  if (seriesKey === 'crime') return 'Crime';
  if (seriesKey === 'infrastructure') return 'Other';
  return seriesKey;
}

function getResponseAxisLabel(type: Incident['type'], mobile = false): string {
  if (type === 'flood') return mobile ? 'Pollution' : 'Pollution';
  if (type === 'accident') return mobile ? 'Road Hazard' : 'Road Hazard';
  if (type === 'medical') return 'Noise';
  if (type === 'crime') return 'Crime';
  return 'Other';
}

function toLocalDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDurationFromMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '0m';
  }

  const roundedMinutes = Math.round(totalMinutes);
  const weeks = Math.floor(roundedMinutes / (7 * 24 * 60));
  let remainder = roundedMinutes % (7 * 24 * 60);
  const days = Math.floor(remainder / (24 * 60));
  remainder %= 24 * 60;
  const hours = Math.floor(remainder / 60);
  const minutes = remainder % 60;

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) {
    return '0m';
  }

  return parts.slice(0, 3).join(' ');
}

interface MetricCardProps { title: string; value: string; change: string; up: boolean; sub: string; color: string; }
function MetricCard({ title, value, change, up, sub, color }: MetricCardProps) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 5px rgba(15, 23, 42, 0.06)', border: '1px solid #E2E8F0' }}>
      <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: up ? '#059669' : '#B91C1C' }}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {change}
        </span>
        <span style={{ color: '#94A3B8', fontSize: 11 }}>{sub}</span>
      </div>
    </div>
  );
}

function formatTrendDayLabel(date: Date, period: string): string {
  if (period === 'This Quarter') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function getCompactCategoryLabel(label: string): string {
  if (label === 'Road Hazard') return 'Road Haz';
  return label;
}

function formatBarangayTick(label: string): string {
  return label.replace('Barangay ', 'Brgy ');
}

export default function Analytics() {
  const [period, setPeriod] = useState('This Week');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      setIncidents(payload.reports.map((report) => reportToIncident(report)));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load analytics data.';
      setError(message);
      if (!silent) {
        setIncidents([]);
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

    const handleFocusRefresh = () => {
      void loadReports(true);
    };

    window.addEventListener('focus', handleFocusRefresh);
    return () => {
      disconnect();
      window.removeEventListener('focus', handleFocusRefresh);
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
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filteredIncidents = useMemo(() => {
    const days = ANALYTICS_PERIOD_DAYS[period as keyof typeof ANALYTICS_PERIOD_DAYS] ?? 7;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    return incidents.filter((incident) => new Date(incident.reportedAt) >= since);
  }, [incidents, period]);

  const DAILY_TREND = useMemo(() => {
    const days = ANALYTICS_PERIOD_DAYS[period as keyof typeof ANALYTICS_PERIOD_DAYS] ?? 7;
    const buckets = Array.from({ length: days }).map((_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        key: toLocalDateKey(date),
        day: formatTrendDayLabel(date, period),
        total: 0,
        flood: 0,
        accident: 0,
        medical: 0,
        crime: 0,
        infrastructure: 0,
      };
    });

    const byDay = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const incident of filteredIncidents) {
      const key = toLocalDateKey(incident.reportedAt);
      const row = byDay.get(key);
      if (!row) {
        continue;
      }
      row.total += 1;
      const bucket = incident.type === 'typhoon' ? 'infrastructure' : incident.type;
      row[bucket] += 1;
    }

    return buckets;
  }, [filteredIncidents, period]);

  const RESPONSE_TIME = useMemo(() => {
    return ANALYTICS_TYPE_ORDER.map((type) => {
      const withResponse = filteredIncidents.filter((incident) => incident.type === type && incident.respondedAt);
      const avgMin = withResponse.length === 0
        ? 0
        : Number((withResponse.reduce((sum, incident) => {
            const diff = new Date(incident.respondedAt ?? incident.reportedAt).getTime() - new Date(incident.reportedAt).getTime();
            return sum + Math.max(0, Math.round(diff / 60000));
          }, 0) / withResponse.length).toFixed(1));

      return {
        typeKey: type,
        type: ANALYTICS_TYPE_LABELS[type],
        axisLabel: getResponseAxisLabel(type, false),
        mobileAxisLabel: getResponseAxisLabel(type, true),
        respondedCount: withResponse.length,
        avgMin,
        target: ANALYTICS_RESPONSE_TARGETS[type],
      };
    });
  }, [filteredIncidents]);

  const RESPONSE_TIME_VISIBLE = useMemo(
    () => RESPONSE_TIME.filter((row) => row.respondedCount > 0),
    [RESPONSE_TIME],
  );

  const SEVERITY_DATA = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const incident of filteredIncidents) {
      counts[incident.severity] += 1;
    }
    return ANALYTICS_SEVERITY_SERIES.map((series) => ({
      name: series.name,
      value: counts[series.name.toLowerCase() as keyof typeof counts],
      color: series.color,
    }));
  }, [filteredIncidents]);

  const BARANGAY_DATA = useMemo(() => {
    const byBarangay = new Map<string, { name: string; incidents: number; resolved: number; active: number }>();
    for (const incident of filteredIncidents) {
      const key = incident.barangay || 'Unspecified';
      const current = byBarangay.get(key) ?? { name: key, incidents: 0, resolved: 0, active: 0 };
      current.incidents += 1;
      if (incident.status === 'resolved') {
        current.resolved += 1;
      } else {
        current.active += 1;
      }
      byBarangay.set(key, current);
    }
    return [...byBarangay.values()].sort((a, b) => b.incidents - a.incidents).slice(0, 8);
  }, [filteredIncidents]);

  const RESOURCE_DATA = useMemo(() => {
    return ANALYTICS_TYPE_ORDER.map((type) => {
      const subset = filteredIncidents.filter((incident) => incident.type === type);
      const deployed = subset.reduce((sum, incident) => sum + Math.max(incident.responders || 0, 0), 0);
      const total = Math.max(subset.length, deployed, 1);
      return {
        type,
        name: ANALYTICS_TYPE_LABELS[type],
        mobileName: getCompactCategoryLabel(ANALYTICS_TYPE_LABELS[type]),
        deployed,
        available: Math.max(total - deployed, 0),
        total,
      };
    });
  }, [filteredIncidents]);

  const HOUR_DATA = useMemo(() => {
    const counts = Array.from({ length: 24 }).map(() => 0);
    for (const incident of filteredIncidents) {
      const hour = new Date(incident.reportedAt).getHours();
      if (hour >= 0 && hour <= 23) {
        counts[hour] += 1;
      }
    }
    return counts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }));
  }, [filteredIncidents]);

  const totalIncidents = filteredIncidents.length;
  const resolvedIncidents = filteredIncidents.filter((incident) => incident.status === 'resolved').length;
  const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;
  const chartTitleSize = isMobile ? 18 : 13;
  const chartSubtitleSize = isMobile ? 14 : 11;
  const trendChartHeight = isMobile ? 250 : 240;
  const responseChartHeight = isMobile ? 230 : 200;
  const hourlyChartHeight = isMobile ? 230 : 200;
  const barangayChartHeight = isMobile ? 260 : 220;
  const TREND_SERIES_FOR_CHART = React.useMemo(() => {
    const labelCounts = ANALYTICS_TREND_SERIES.reduce<Record<string, number>>((acc, series) => {
      acc[series.label] = (acc[series.label] ?? 0) + 1;
      return acc;
    }, {});

    return ANALYTICS_TREND_SERIES.map((series) => ({
      ...series,
      chartName: (labelCounts[series.label] ?? 0) > 1 ? toSeriesLegendName(series.key) : series.label,
    }));
  }, []);
  const avgResponse = React.useMemo(() => {
    const values = RESPONSE_TIME.filter((row) => row.avgMin > 0).map((row) => row.avgMin);
    if (values.length === 0) {
      return null;
    }
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  }, [RESPONSE_TIME]);
  const deployedUnits = RESOURCE_DATA.reduce((sum, row) => sum + row.deployed, 0);
  const totalSeverityCount = SEVERITY_DATA.reduce((sum, row) => sum + row.value, 0);

  if (initialLoadPending) {
    return (
      <div style={{ padding: '16px 20px', minHeight: '100%' }}>
        <CardSkeleton
          count={4}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        />
        <div style={{ marginTop: 16 }}>
          <TextSkeleton rows={6} title={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page" style={{ padding: isMobile ? '14px 12px 20px' : '16px 20px', minHeight: '100%' }}>
      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
          {error}
        </div>
      ) : null}

      {/* Header */}
      <div className="analytics-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Analytics & Insights</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>Incident data analysis — TUGON Decision Support System</p>
        </div>
        <div className="analytics-header-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="analytics-period-tabs" style={{ display: 'flex', background: 'white', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="analytics-period-tab-btn"
                style={{
                  padding: '7px 13px',
                  border: 'none',
                  background: period === p ? '#1E3A8A' : 'transparent',
                  color: period === p ? 'white' : '#64748B',
                  fontSize: 11,
                  fontWeight: period === p ? 700 : 400,
                  cursor: 'pointer',
                  borderRight: '1px solid #F1F5F9',
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="analytics-metrics" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 14 : 12, marginBottom: isMobile ? 22 : 18 }}>
        {loading ? (
          <CardSkeleton
            count={4}
            lines={2}
            showImage={false}
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          />
        ) : (
          <>
            <MetricCard title="Total Incidents" value={totalIncidents.toString()} change="Live" up={true} sub={`${period} dataset`} color="#B91C1C" />
            <MetricCard title="Resolution Rate" value={`${resolutionRate.toFixed(1)}%`} change="Live" up={true} sub={`${period} dataset`} color="#059669" />
            <MetricCard title="Avg. Response" value={avgResponse !== null ? formatDurationFromMinutes(avgResponse) : 'N/A'} change="Live" up={true} sub={avgResponse !== null ? `${period} dataset` : 'No responded incidents yet'} color="#B4730A" />
            <MetricCard title="Deployed Units" value={deployedUnits.toString()} change="Live" up={true} sub="reported assignment load" color="#1E3A8A" />
          </>
        )}
      </div>

      {/* Trend Chart */}
      <div className="analytics-card analytics-trend-card" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px', marginBottom: isMobile ? 18 : 14 }}>
        <div className="analytics-trend-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize }}>Incident Trend by Category</div>
            <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginTop: 2 }}>{period} — daily incident count by category</div>
          </div>
          <div className="analytics-chart-toggle" style={{ display: 'flex', gap: 6 }}>
            {(['area', 'bar'] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)} style={{
                padding: isMobile ? '8px 14px' : '5px 12px', borderRadius: 6, border: '1px solid', fontSize: isMobile ? 13 : 11, fontWeight: 600, cursor: 'pointer',
                borderColor: chartType === t ? '#1E3A8A' : '#E2E8F0',
                background: chartType === t ? '#1E3A8A' : 'white',
                color: chartType === t ? 'white' : '#64748B',
              }}>
                {t === 'area' ? 'Area' : 'Bar'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={trendChartHeight}>
          {chartType === 'area' ? (
            <AreaChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: isMobile ? 10 : 8 }}>
              <defs>
                {TREND_SERIES_FOR_CHART.map(({ key, color }) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tickMargin={8} minTickGap={isMobile ? 14 : 8} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: isMobile ? 12 : 11 }} />
              {TREND_SERIES_FOR_CHART.map((series) => (
                <Area
                  key={`area-${series.key}`}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  fill={`url(#grad-${series.key})`}
                  strokeWidth={1.5}
                  name={series.chartName}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: isMobile ? 10 : 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tickMargin={8} minTickGap={isMobile ? 14 : 8} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: isMobile ? 12 : 11 }} />
              {TREND_SERIES_FOR_CHART.map((series) => (
                <Bar
                  key={`bar-${series.key}`}
                  dataKey={series.key}
                  stackId="a"
                  fill={series.color}
                  name={series.chartName}
                  radius={series.key === 'infrastructure' ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
        <div className="analytics-trend-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px 12px' : '6px 10px', marginTop: 10 }}>
          {TREND_SERIES_FOR_CHART.map((series) => (
            <span
              key={`legend-${series.key}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#475569',
                fontSize: isMobile ? 11 : 10,
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  width: isMobile ? 9 : 8,
                  height: isMobile ? 9 : 8,
                  borderRadius: '50%',
                  background: series.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {series.chartName}
            </span>
          ))}
        </div>
      </div>

      {/* Middle row charts */}
      <div className="analytics-middle-row" style={{ display: 'flex', gap: 14, marginBottom: isMobile ? 18 : 14, flexWrap: 'wrap' }}>
        {/* Response time */}
        <div className="analytics-card" style={{ flex: '2 1 280px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize, marginBottom: 4 }}>Average Response Time by Category</div>
          <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginBottom: 12 }}>Minutes from report to first response (target overlay)</div>
          {RESPONSE_TIME_VISIBLE.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 12, padding: '10px 2px' }}>
              No responded incidents yet for the selected period.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={responseChartHeight}>
                <BarChart data={RESPONSE_TIME_VISIBLE} layout="vertical" margin={{ top: 0, right: isMobile ? 14 : 40, left: isMobile ? -6 : 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} unit="m" />
                  <YAxis dataKey={isMobile ? 'mobileAxisLabel' : 'axisLabel'} type="category" tick={{ fontSize: isMobile ? 12 : 11, fill: '#334155' }} axisLine={false} tickLine={false} width={isMobile ? 82 : 170} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatDurationFromMinutes(Number(value)),
                      name === 'avgMin' ? 'Avg. Response' : 'Target',
                    ]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: isMobile ? 12 : 11 }}
                  />
                  <Bar dataKey="target" key="bar-target" fill="#F1F5F9" name="Target" barSize={14} />
                  <Bar dataKey="avgMin" key="bar-avgmin" fill="#1E3A8A" name="Avg. Response" barSize={10} radius={[0, 3, 3, 0]}>
                    {RESPONSE_TIME_VISIBLE.map((entry, index) => (
                      <Cell key={`cell-rt-${index}-${entry.typeKey}`} fill={entry.avgMin <= entry.target ? '#059669' : '#B91C1C'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 12, fontSize: isMobile ? 12 : 11, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669', display: 'inline-block' }} /> Within target</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#B91C1C', display: 'inline-block' }} /> Exceeds target</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'inline-block' }} /> Target</span>
              </div>
            </>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="analytics-card" style={{ flex: '1 1 200px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize, marginBottom: 4 }}>Severity Distribution</div>
            <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginBottom: 10 }}>{period} incidents by severity</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={SEVERITY_DATA} cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={3} dataKey="value">
                {SEVERITY_DATA.map((e, index) => <Cell key={`cell-sev-${index}-${e.name}`} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} incidents`]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {SEVERITY_DATA.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#475569' }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{s.value}</span>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>{totalSeverityCount > 0 ? Math.round((s.value / totalSeverityCount) * 100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hourly pattern */}
        <div className="analytics-card" style={{ flex: '2 1 260px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize, marginBottom: 4 }}>Hourly Incident Pattern</div>
          <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginBottom: 12 }}>Average incidents per hour ({period})</div>
          <ResponsiveContainer width="100%" height={hourlyChartHeight}>
            <BarChart data={HOUR_DATA} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: isMobile ? 11 : 8, fill: '#64748B' }} axisLine={false} tickLine={false} interval={isMobile ? 5 : 3} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: isMobile ? 12 : 11 }} formatter={(value) => [`${value} incidents`]} />
              <Bar dataKey="count" key="bar-count" fill="#1E3A8A" radius={[3, 3, 0, 0]}>
                {HOUR_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-hr-${index}-${entry.hour}`}
                    fill={
                      entry.count >= ANALYTICS_HOURLY_BANDS.high
                        ? ANALYTICS_HOURLY_BANDS.highColor
                        : entry.count >= ANALYTICS_HOURLY_BANDS.medium
                          ? ANALYTICS_HOURLY_BANDS.mediumColor
                          : ANALYTICS_HOURLY_BANDS.baseColor
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barangay Performance & Resource */}
      <div className="analytics-bottom-row" style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
        {/* Barangay comparison */}
        <div className="analytics-card" style={{ flex: '3 1 300px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize, marginBottom: 4 }}>Barangay Incident Comparison</div>
          <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginBottom: 14 }}>Incidents reported vs. resolved by barangay ({period})</div>
          <ResponsiveContainer width="100%" height={barangayChartHeight}>
            <BarChart data={BARANGAY_DATA} margin={{ top: 0, right: 5, left: -15, bottom: isMobile ? 42 : 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: isMobile ? 11 : 9, fill: '#64748B' }} axisLine={false} tickLine={false} angle={isMobile ? -16 : -30} textAnchor="end" interval={0} tickFormatter={formatBarangayTick} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: isMobile ? 12 : 11 }} />
              <Legend iconType="square" iconSize={isMobile ? 10 : 8} wrapperStyle={{ fontSize: isMobile ? 12 : 11 }} />
              <Bar dataKey="incidents" key="bar-incidents" fill={ANALYTICS_BARANGAY_BAR_COLORS.incidents} name="Reported" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="resolved" key="bar-resolved" fill={ANALYTICS_BARANGAY_BAR_COLORS.resolved} name="Resolved" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="active" key="bar-active" fill={ANALYTICS_BARANGAY_BAR_COLORS.active} name="Active" radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource utilization */}
        <div className="analytics-card" style={{ flex: '2 1 240px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? '18px 16px' : '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: chartTitleSize, marginBottom: 4 }}>Resource Utilization</div>
          <div style={{ color: '#94A3B8', fontSize: chartSubtitleSize, marginBottom: 14 }}>Reported responders by incident type</div>
          {RESOURCE_DATA.map(r => {
            const pct = Math.round((r.deployed / r.total) * 100);
            const color = pct >= ANALYTICS_UTILIZATION_BANDS.high
              ? ANALYTICS_UTILIZATION_BANDS.highColor
              : pct >= ANALYTICS_UTILIZATION_BANDS.medium
                ? ANALYTICS_UTILIZATION_BANDS.mediumColor
                : ANALYTICS_UTILIZATION_BANDS.baseColor;
            return (
              <div key={r.type} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: isMobile ? 13 : 12, color: '#475569', fontWeight: 500 }}>{isMobile ? r.mobileName : r.name}</span>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#64748B' }}>
                    <span style={{ color, fontWeight: 700 }}>{r.deployed}</span>
                    <span>/</span>
                    <span>{r.total}</span>
                    <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Operational Note</div>
            <div style={{ fontSize: 11, color: '#92400E' }}>Responder load is computed from assigned reports only. Unassigned incidents are excluded from deployed counts.</div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .analytics-header-controls {
            width: 100%;
            align-items: stretch !important;
          }

          .analytics-period-tabs {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr 1fr;
          }

          .analytics-period-tab-btn {
            width: 100%;
            border-right: none !important;
            border-bottom: 1px solid #F1F5F9;
            min-height: 44px;
          }

          .analytics-header-controls > button {
            width: 100%;
            justify-content: center;
          }

          .analytics-page {
            padding: 14px 12px 22px !important;
          }

          .analytics-metrics {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .analytics-middle-row,
          .analytics-bottom-row {
            flex-direction: column;
            gap: 12px !important;
          }

          .analytics-middle-row > div,
          .analytics-bottom-row > div {
            width: 100%;
            flex: 1 1 auto !important;
          }

          .analytics-card,
          .analytics-trend-card {
            border-radius: 14px !important;
            padding: 16px 14px !important;
          }

          .analytics-trend-header {
            align-items: stretch !important;
          }

          .analytics-chart-toggle {
            width: 100%;
          }

          .analytics-chart-toggle > button {
            flex: 1;
            min-height: 42px;
          }

          .analytics-trend-legend {
            justify-content: flex-start;
          }
        }

        @media (max-width: 420px) {
          .analytics-page {
            padding: 12px 10px 20px !important;
          }

          .analytics-header h1 {
            font-size: 18px !important;
          }

          .analytics-header p {
            font-size: 11px !important;
          }

          .analytics-trend-legend {
            gap: 6px 10px !important;
          }
        }
      `}</style>
    </div>
  );
}