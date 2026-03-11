import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
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

interface MetricCardProps { title: string; value: string; change: string; up: boolean; sub: string; color: string; }
function MetricCard({ title, value, change, up, sub, color }: MetricCardProps) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
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

export default function Analytics() {
  const [period, setPeriod] = useState('This Week');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await officialReportsApi.getReports();
        setIncidents(payload.reports.map((report) => reportToIncident(report)));
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load analytics data.';
        setError(message);
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
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
        key: date.toISOString().slice(0, 10),
        day: formatTrendDayLabel(date, period),
        total: 0,
        fire: 0,
        flood: 0,
        accident: 0,
        medical: 0,
        crime: 0,
        infrastructure: 0,
      };
    });

    const byDay = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const incident of filteredIncidents) {
      const key = incident.reportedAt.slice(0, 10);
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
        typeLabel: ANALYTICS_TYPE_LABELS[type],
        avgMin,
        target: ANALYTICS_RESPONSE_TARGETS[type],
      };
    });
  }, [filteredIncidents]);

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
  const avgResponse = RESPONSE_TIME.filter((row) => row.avgMin > 0).reduce((sum, row, _index, arr) => {
    return sum + row.avgMin / (arr.length || 1);
  }, 0);
  const deployedUnits = RESOURCE_DATA.reduce((sum, row) => sum + row.deployed, 0);
  const totalSeverityCount = SEVERITY_DATA.reduce((sum, row) => sum + row.value, 0);

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
          {error}
        </div>
      ) : null}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Analytics & Insights</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>Incident data analysis — TUGON Decision Support System</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
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
      <div className="analytics-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <MetricCard title="Total Incidents" value={totalIncidents.toString()} change={loading ? 'Loading' : 'Live'} up={true} sub={`${period} dataset`} color="#B91C1C" />
        <MetricCard title="Resolution Rate" value={`${resolutionRate.toFixed(1)}%`} change={loading ? 'Loading' : 'Live'} up={true} sub={`${period} dataset`} color="#059669" />
        <MetricCard title="Avg. Response" value={`${avgResponse.toFixed(1)} min`} change={loading ? 'Loading' : 'Live'} up={true} sub={`${period} dataset`} color="#B4730A" />
        <MetricCard title="Deployed Units" value={deployedUnits.toString()} change={loading ? 'Loading' : 'Live'} up={true} sub="reported assignment load" color="#1E3A8A" />
      </div>

      {/* Trend Chart */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 14 }}>Incident Trend by Category</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{period} — daily incident count by category</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['area', 'bar'] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderColor: chartType === t ? '#1E3A8A' : '#E2E8F0',
                background: chartType === t ? '#1E3A8A' : 'white',
                color: chartType === t ? 'white' : '#64748B',
              }}>
                {t === 'area' ? 'Area' : 'Bar'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          {chartType === 'area' ? (
            <AreaChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                {ANALYTICS_TREND_SERIES.map(({ key, color }) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {ANALYTICS_TREND_SERIES.map((series) => (
                <Area
                  key={`area-${series.key}`}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  fill={`url(#grad-${series.key})`}
                  strokeWidth={1.5}
                  name={series.label}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {ANALYTICS_TREND_SERIES.map((series) => (
                <Bar
                  key={`bar-${series.key}`}
                  dataKey={series.key}
                  stackId="a"
                  fill={series.color}
                  name={series.label}
                  radius={series.key === 'infrastructure' ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Middle row charts */}
      <div className="analytics-middle-row" style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Response time */}
        <div style={{ flex: '2 1 280px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Average Response Time by Category</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 12 }}>Minutes from report to first response (target overlay)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={RESPONSE_TIME} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit="m" />
              <YAxis
                dataKey="typeKey"
                type="category"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(value) => ANALYTICS_TYPE_LABELS[value as keyof typeof ANALYTICS_TYPE_LABELS] ?? String(value)}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value} min`,
                  name === 'avgMin' ? 'Avg. Response' : 'Target',
                ]}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }}
              />
              <Bar dataKey="target" key="bar-target" fill="#F1F5F9" name="Target" barSize={14} />
              <Bar dataKey="avgMin" key="bar-avgmin" fill="#1E3A8A" name="Avg. Response" barSize={10} radius={[0, 3, 3, 0]}>
                {RESPONSE_TIME.map((entry, index) => (
                  <Cell key={`cell-rt-${index}-${entry.typeKey}`} fill={entry.avgMin <= entry.target ? '#059669' : '#B91C1C'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669', display: 'inline-block' }} /> Within target</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#B91C1C', display: 'inline-block' }} /> Exceeds target</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'inline-block' }} /> Target</span>
          </div>
        </div>

        {/* Severity Distribution */}
        <div style={{ flex: '1 1 200px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Severity Distribution</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 10 }}>{period} incidents by severity</div>
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
        <div style={{ flex: '2 1 260px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Hourly Incident Pattern</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 12 }}>Average incidents per hour ({period})</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={HOUR_DATA} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(value) => [`${value} incidents`]} />
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
        <div style={{ flex: '3 1 300px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Barangay Incident Comparison</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 14 }}>Incidents reported vs. resolved by barangay ({period})</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={BARANGAY_DATA} margin={{ top: 0, right: 5, left: -15, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="incidents" key="bar-incidents" fill={ANALYTICS_BARANGAY_BAR_COLORS.incidents} name="Reported" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="resolved" key="bar-resolved" fill={ANALYTICS_BARANGAY_BAR_COLORS.resolved} name="Resolved" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="active" key="bar-active" fill={ANALYTICS_BARANGAY_BAR_COLORS.active} name="Active" radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource utilization */}
        <div style={{ flex: '2 1 240px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Resource Utilization</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 14 }}>Reported responders by incident type</div>
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
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{r.name}</span>
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
    </div>
  );
}