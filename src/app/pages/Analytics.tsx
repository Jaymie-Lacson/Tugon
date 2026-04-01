import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
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
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0m';

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

  return parts.length === 0 ? '0m' : parts.slice(0, 3).join(' ');
}

interface MetricCardProps { title: string; value: string; change: string; up: boolean; sub: string; color: string; }
function MetricCard({ title, value, change, up, sub }: MetricCardProps) {
  return (
    <div className="rounded-xl px-[18px] py-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)] border border-[var(--outline-variant)]/35">
      <div className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2 text-[var(--outline)]">{title}</div>
      <div className="text-[28px] font-bold mb-1.5 text-[var(--on-surface)]">{value}</div>
      <div className="flex items-center gap-1.5">
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-destructive'}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {change}
        </span>
        <span className="text-[11px] text-[var(--outline-variant)]">{sub}</span>
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
  const { t } = useTranslation();
  const [period, setPeriod] = useState('This Week');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      setIncidents(payload.reports.map((report) => reportToIncident(report)));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load analytics data.';
      setError(message);
      if (!silent) setIncidents([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  useEffect(() => {
    const disconnect = officialReportsApi.connectReportsStream(() => { void loadReports(true); });
    const handleFocusRefresh = () => { void loadReports(true); };
    window.addEventListener('focus', handleFocusRefresh);
    return () => { disconnect(); window.removeEventListener('focus', handleFocusRefresh); };
  }, [loadReports]);

  useEffect(() => {
    if (!initialLoadPending) return;
    if (!loading) setInitialLoadPending(false);
  }, [initialLoadPending, loading]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
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
      return { key: toLocalDateKey(date), day: formatTrendDayLabel(date, period), total: 0, flood: 0, accident: 0, medical: 0, crime: 0, infrastructure: 0 };
    });
    const byDay = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const incident of filteredIncidents) {
      const key = toLocalDateKey(incident.reportedAt);
      const row = byDay.get(key);
      if (!row) continue;
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
    for (const incident of filteredIncidents) counts[incident.severity] += 1;
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
      if (incident.status === 'resolved') current.resolved += 1;
      else current.active += 1;
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
      if (hour >= 0 && hour <= 23) counts[hour] += 1;
    }
    return counts.map((count, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, count }));
  }, [filteredIncidents]);

  const totalIncidents = filteredIncidents.length;
  const resolvedIncidents = filteredIncidents.filter((incident) => incident.status === 'resolved').length;
  const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;
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
    if (values.length === 0) return null;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  }, [RESPONSE_TIME]);
  const deployedUnits = RESOURCE_DATA.reduce((sum, row) => sum + row.deployed, 0);
  const totalSeverityCount = SEVERITY_DATA.reduce((sum, row) => sum + row.value, 0);

  if (initialLoadPending) {
    return (
      <div className="p-4 px-5 min-h-full">
        <CardSkeleton count={4} lines={2} showImage={false} gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        <div className="mt-4">
          <TextSkeleton rows={6} title={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page p-3.5 px-3 pb-5 md:p-4 md:px-5 min-h-full">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg text-destructive text-xs px-2.5 py-2">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="analytics-header flex items-start justify-between mb-4 flex-wrap gap-2.5">
        <div>
          <h1 className="text-xl font-bold mb-0.5 text-[var(--on-surface)]">{t('official.analytics.pageTitle')}</h1>
          <p className="text-xs text-[var(--outline)]">{t('official.analytics.pageSubtitle')}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg sm:flex bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)]/40 shadow-[0_1px_4px_rgba(13,28,46,0.06)]">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`min-h-[44px] border-none px-[13px] py-[7px] text-[11px] sm:min-h-0 cursor-pointer transition-all duration-150 ${
                  period === p ? 'bg-primary text-white font-bold' : 'bg-transparent text-[var(--outline)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="flex w-full items-center justify-center gap-[5px] rounded-lg px-3.5 py-[7px] text-xs font-semibold sm:w-auto cursor-pointer bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)]/40 shadow-[0_1px_4px_rgba(13,28,46,0.06)] text-[var(--primary-container)]">
            <Download size={13} /> {t('official.analytics.export')}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="analytics-metrics grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 md:gap-3 mb-5 md:mb-[18px]">
        {loading ? (
          <CardSkeleton count={4} lines={2} showImage={false} gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        ) : (
          <>
            <MetricCard title={t('official.analytics.totalIncidents')} value={totalIncidents.toString()} change={t('official.analytics.liveChange')} up={true} sub={t('official.analytics.periodDataset', { period })} color="var(--severity-critical)" />
            <MetricCard title={t('official.analytics.resolutionRate')} value={`${resolutionRate.toFixed(1)}%`} change={t('official.analytics.liveChange')} up={true} sub={t('official.analytics.periodDataset', { period })} color="#059669" />
            <MetricCard title={t('official.analytics.avgResponse')} value={avgResponse !== null ? formatDurationFromMinutes(avgResponse) : 'N/A'} change={t('official.analytics.liveChange')} up={true} sub={avgResponse !== null ? t('official.analytics.periodDataset', { period }) : t('official.analytics.noRespondedYet')} color="var(--severity-medium)" />
            <MetricCard title={t('official.analytics.deployedUnits')} value={deployedUnits.toString()} change={t('official.analytics.liveChange')} up={true} sub={t('official.analytics.reportedAssignmentLoad')} color="var(--primary)" />
          </>
        )}
      </div>

      {/* Trend Chart */}
      <div className="analytics-card analytics-trend-card rounded-xl p-3.5 px-4 mb-3.5 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
        <div className="analytics-trend-header flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div>
            <div className="font-bold text-lg md:text-[13px] text-[var(--on-surface)]">{t('official.analytics.incidentTrendByCategory')}</div>
            <div className="text-sm md:text-[11px] mt-0.5 text-[var(--outline-variant)]">{t('official.analytics.dailyCount', { period })}</div>
          </div>
          <div className="flex w-full gap-1.5 sm:w-auto">
            {(['area', 'bar'] as const).map(chartTypeBtn => (
              <button
                key={chartTypeBtn}
                onClick={() => setChartType(chartTypeBtn)}
                className={`min-h-[42px] flex-1 rounded-md border px-3 py-[5px] text-[11px] font-semibold sm:min-h-0 sm:flex-none cursor-pointer ${
                  chartType === chartTypeBtn
                    ? 'border-primary bg-primary text-white'
                    : 'border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)] text-[var(--outline)]'
                }`}
              >
                {chartTypeBtn === 'area' ? t('official.analytics.areaChart') : t('official.analytics.barChart')}
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
                <Area key={`area-${series.key}`} type="monotone" dataKey={series.key} stroke={series.color} fill={`url(#grad-${series.key})`} strokeWidth={1.5} name={series.chartName} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: isMobile ? 10 : 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tickMargin={8} minTickGap={isMobile ? 14 : 8} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: isMobile ? 12 : 11 }} />
              {TREND_SERIES_FOR_CHART.map((series) => (
                <Bar key={`bar-${series.key}`} dataKey={series.key} stackId="a" fill={series.color} name={series.chartName} radius={series.key === 'infrastructure' ? [3, 3, 0, 0] : undefined} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
        <div className="analytics-trend-legend flex flex-wrap gap-1.5 gap-x-2.5 mt-2.5">
          {TREND_SERIES_FOR_CHART.map((series) => (
            <span key={`legend-${series.key}`} className="inline-flex items-center gap-1.5 text-slate-600 text-[10px] leading-tight">
              <span className="size-2 rounded-full inline-block shrink-0" style={{ background: series.color }} />
              {series.chartName}
            </span>
          ))}
        </div>
      </div>

      {/* Middle row charts */}
      <div className="analytics-middle-row flex flex-col md:flex-row gap-3 md:gap-3.5 mb-3.5">
        {/* Response time */}
        <div className="analytics-card flex-[2_1_280px] rounded-xl p-3.5 px-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
          <div className="font-bold text-lg md:text-[13px] mb-1 text-[var(--on-surface)]">{t('official.analytics.avgResponseByCategory')}</div>
          <div className="text-sm md:text-[11px] mb-3 text-[var(--outline-variant)]">{t('official.analytics.responseFromReport')}</div>
          {RESPONSE_TIME_VISIBLE.length === 0 ? (
            <div className="text-slate-500 text-xs px-0.5 py-2.5">
              {t('official.analytics.noRespondedPeriod')}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={responseChartHeight}>
                <BarChart data={RESPONSE_TIME_VISIBLE} layout="vertical" margin={{ top: 0, right: isMobile ? 14 : 40, left: isMobile ? -6 : 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} unit="m" />
                  <YAxis dataKey={isMobile ? 'mobileAxisLabel' : 'axisLabel'} type="category" tick={{ fontSize: isMobile ? 12 : 11, fill: '#334155' }} axisLine={false} tickLine={false} width={isMobile ? 82 : 170} />
                  <Tooltip formatter={(value, name) => [formatDurationFromMinutes(Number(value)), name === 'avgMin' ? 'Avg. Response' : 'Target']} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: isMobile ? 12 : 11 }} />
                  <Bar dataKey="target" key="bar-target" fill="#F1F5F9" name="Target" barSize={14} />
                  <Bar dataKey="avgMin" key="bar-avgmin" fill="var(--primary)" name="Avg. Response" barSize={10} radius={[0, 3, 3, 0]}>
                    {RESPONSE_TIME_VISIBLE.map((entry, index) => (
                      <Cell key={`cell-rt-${index}-${entry.typeKey}`} fill={entry.avgMin <= entry.target ? '#059669' : 'var(--severity-critical)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 text-[11px] mt-2 flex-wrap">
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-600" /> {t('official.analytics.withinTarget')}</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-destructive" /> {t('official.analytics.exceedsTarget')}</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-slate-100 border border-slate-200" /> {t('official.analytics.targetLabel')}</span>
              </div>
            </>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="analytics-card flex-[1_1_200px] rounded-xl p-3.5 px-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
          <div className="font-bold text-lg md:text-[13px] mb-1 text-[var(--on-surface)]">{t('official.analytics.severityDistribution')}</div>
          <div className="text-sm md:text-[11px] mb-2.5 text-[var(--outline-variant)]">{t('official.analytics.severityByPeriod', { period })}</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={SEVERITY_DATA} cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={3} dataKey="value">
                {SEVERITY_DATA.map((e, index) => <Cell key={`cell-sev-${index}-${e.name}`} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} incidents`]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {SEVERITY_DATA.map(s => (
            <div key={s.name} className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full inline-block shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-[var(--on-surface-variant)]">{s.name}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-[var(--on-surface)]">{s.value}</span>
                <span className="text-[10px] text-[var(--outline-variant)]">{totalSeverityCount > 0 ? Math.round((s.value / totalSeverityCount) * 100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hourly pattern */}
        <div className="analytics-card flex-[2_1_260px] rounded-xl p-3.5 px-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
          <div className="font-bold text-lg md:text-[13px] mb-1 text-[var(--on-surface)]">{t('official.analytics.hourlyPattern')}</div>
          <div className="text-sm md:text-[11px] mb-3 text-[var(--outline-variant)]">{t('official.analytics.avgIncidentsPerHour', { period })}</div>
          <ResponsiveContainer width="100%" height={hourlyChartHeight}>
            <BarChart data={HOUR_DATA} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: isMobile ? 11 : 8, fill: '#64748B' }} axisLine={false} tickLine={false} interval={isMobile ? 5 : 3} />
              <YAxis tick={{ fontSize: isMobile ? 12 : 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: isMobile ? 12 : 11 }} formatter={(value) => [`${value} incidents`]} />
              <Bar dataKey="count" key="bar-count" fill="var(--primary)" radius={[3, 3, 0, 0]}>
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
      <div className="analytics-bottom-row flex flex-col md:flex-row gap-3 md:gap-3.5 mb-2">
        {/* Barangay comparison */}
        <div className="analytics-card flex-[3_1_300px] rounded-xl p-3.5 px-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
          <div className="font-bold text-lg md:text-[13px] mb-1 text-[var(--on-surface)]">{t('official.analytics.barangayComparison')}</div>
          <div className="text-sm md:text-[11px] mb-3.5 text-[var(--outline-variant)]">{t('official.analytics.barangayReportedVsResolved', { period })}</div>
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
        <div className="analytics-card flex-[2_1_240px] rounded-xl p-3.5 px-4 bg-[var(--surface-container-lowest)] shadow-[0_2px_8px_rgba(13,28,46,0.07)]">
          <div className="font-bold text-lg md:text-[13px] mb-1 text-[var(--on-surface)]">{t('official.analytics.resourceUtilization')}</div>
          <div className="text-sm md:text-[11px] mb-3.5 text-[var(--outline-variant)]">{t('official.analytics.respondersByType')}</div>
          {RESOURCE_DATA.map(r => {
            const pct = Math.round((r.deployed / r.total) * 100);
            const color = pct >= ANALYTICS_UTILIZATION_BANDS.high
              ? ANALYTICS_UTILIZATION_BANDS.highColor
              : pct >= ANALYTICS_UTILIZATION_BANDS.medium
                ? ANALYTICS_UTILIZATION_BANDS.mediumColor
                : ANALYTICS_UTILIZATION_BANDS.baseColor;
            return (
              <div key={r.type} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--on-surface-variant)]">{isMobile ? r.mobileName : r.name}</span>
                  <div className="flex gap-2 text-[11px] text-[var(--outline)]">
                    <span style={{ color }} className="font-bold">{r.deployed}</span>
                    <span>/</span>
                    <span>{r.total}</span>
                    <span style={{ color }} className="font-bold">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded overflow-hidden bg-[var(--surface-container-low)]">
                  <div className="h-full rounded transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
          <div className="mt-3.5 px-3 py-2.5 rounded-lg bg-[#fffbeb] border border-amber-200/50">
            <div className="text-[11px] font-bold mb-0.5 text-amber-900">{t('official.analytics.operationalNote')}</div>
            <div className="text-[11px] text-amber-800">{t('official.analytics.operationalNoteText')}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
