import React, { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { useOfficialReports } from '../../hooks/useOfficialReportsQueries';
import { reportToIncident } from '../../utils/incidentAdapters';
import type { Incident } from '../../data/incidents';

const TYPE_COLORS: Record<string, string> = {
  flood: '#1D4ED8',
  accident: 'var(--severity-medium)',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};


const STAT_ACCENT: Record<string, string> = {
  'var(--primary)': '#2563EB',
  'var(--severity-critical)': '#DC2626',
  '#059669': '#16A34A',
  'var(--severity-medium)': '#D97706',
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const accent = STAT_ACCENT[color] ?? '#2563EB';
  return (
    <div className="bg-card px-4 py-3.5 border-r border-b border-[var(--outline-variant)]">
      <div className="text-[var(--on-surface)] text-[22px] font-bold font-mono leading-none">{value}</div>
      <div className="text-[var(--on-surface-variant)] text-[11px] mt-1">{label}</div>
    </div>
  );
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

export default function SAAnalytics() {
  const { t } = useTranslation();
  const { data: reportsData, isLoading: loading, error: queryError } = useOfficialReports();
  const incidents = reportsData?.reports.map((report) => reportToIncident(report)) ?? [];
  const error = queryError?.message ?? null;
  const showInitialLoader = loading && !reportsData;

  const kpis = useMemo(() => {
    const active = incidents.filter((item) => item.status === 'active' || item.status === 'responding').length;
    const resolved = incidents.filter((item) => item.status === 'resolved').length;

    const withResponse = incidents.filter((item) => item.respondedAt);
    const avgResponse = withResponse.length === 0
      ? 0
      : Number((withResponse.reduce((sum, item) => {
          const diff = new Date(item.respondedAt ?? item.reportedAt).getTime() - new Date(item.reportedAt).getTime();
          return sum + Math.max(0, Math.round(diff / 60000));
        }, 0) / withResponse.length).toFixed(1));

    return {
      total: incidents.length,
      active,
      resolved,
      avgResponse,
      avgResponseLabel: formatDurationFromMinutes(avgResponse),
    };
  }, [incidents]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of incidents) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }

    return Object.entries(TYPE_COLORS).map(([type, color]) => ({
      type,
      value: counts[type] ?? 0,
      color,
    }));
  }, [incidents]);

  const barangayData = useMemo(() => {
    const counts = { 'Barangay 251': 0, 'Barangay 252': 0, 'Barangay 256': 0 };
    for (const item of incidents) {
      if (item.barangay.includes('251')) counts['Barangay 251'] += 1;
      else if (item.barangay.includes('252')) counts['Barangay 252'] += 1;
      else if (item.barangay.includes('256')) counts['Barangay 256'] += 1;
    }

    return Object.entries(counts).map(([name, reports]) => ({ name, reports }));
  }, [incidents]);

  if (showInitialLoader) {
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
          <TableSkeleton rows={6} columns={3} showHeader />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content p-5 bg-[var(--surface)] min-h-full">
      <div className="border-b border-[var(--outline-variant)] pb-4 mb-4">
      <div className="flex items-center justify-between gap-2.5 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[var(--on-surface)] text-[22px] font-bold m-0">{t('superadmin.analytics.pageTitle')}</h1>
          <p className="text-[var(--on-surface-variant)] text-xs m-0 mt-0.5">
            {t('superadmin.analytics.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            void loadIncidents();
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-lg bg-card border border-[var(--outline-variant)] px-3.5 py-2 cursor-pointer text-[var(--on-surface-variant)] text-xs font-semibold max-md:w-full max-md:justify-center"
        >
          <RefreshCw size={13} /> {loading ? t('common.refreshing') : t('common.refresh')}
        </button>
      </div>
      </div>

      {error ? (
        <div role="alert" className="mb-3 border-l-4 border-[var(--error)] bg-card px-3 py-2.5 text-[var(--error)] text-xs font-semibold">
          {error}
        </div>
      ) : null}

      <div className="grid mb-4 gap-0 grid-cols-2 xl:grid-cols-4 border-l border-t border-[var(--outline-variant)]">
        <StatCard label={t('superadmin.analytics.totalReports')} value={kpis.total} color="var(--primary)" />
        <StatCard label={t('superadmin.analytics.openReports')} value={kpis.active} color="var(--severity-critical)" />
        <StatCard label={t('superadmin.analytics.resolvedReports')} value={kpis.resolved} color="#059669" />
        <StatCard label={t('superadmin.analytics.avgResponse')} value={kpis.avgResponseLabel} color="var(--severity-medium)" />
      </div>

      <div className="grid gap-[14px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-card px-5 py-[18px] border border-[var(--outline-variant)]">
          <div className="text-[var(--on-surface)] text-[15px] font-bold mb-2.5">{t('superadmin.analytics.reportsByBarangay')}</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barangayData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="reports" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card px-5 py-[18px] border border-[var(--outline-variant)]">
          <div className="text-[var(--on-surface)] text-[15px] font-bold mb-2.5">{t('superadmin.analytics.reportCategoryMix')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={75}>
                {typeData.map((entry) => (
                  <Cell key={entry.type} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3.5 bg-card px-[18px] py-3.5 border border-[var(--outline-variant)]">
        <div className="flex items-center gap-2 text-[var(--on-surface)] text-[13px] font-bold mb-2">
          <AlertTriangle size={14} color="#D97706" />
          {t('superadmin.analytics.reportingHealth')}
        </div>
        <div className="text-[var(--on-surface-variant)] text-xs leading-[1.5]">
          {t('superadmin.analytics.reportingHealthDesc')}
        </div>
      </div>
    </div>
  );
}
