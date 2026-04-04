import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { officialReportsApi } from '../../services/officialReportsApi';
import { reportToIncident } from '../../utils/incidentAdapters';
import type { Incident } from '../../data/incidents';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const TYPE_COLORS: Record<string, string> = {
  flood: '#1D4ED8',
  accident: 'var(--severity-medium)',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};

function getStatDotClass(color: string) {
  switch (color) {
    case 'var(--primary)':
      return 'bg-primary';
    case 'var(--severity-critical)':
      return 'bg-severity-critical';
    case 'var(--severity-medium)':
      return 'bg-severity-medium';
    case '#059669':
      return 'bg-[#059669]';
    default:
      return 'bg-slate-400';
  }
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-foreground text-[22px] font-bold leading-none">{value}</div>
          <span className={`w-2 h-2 rounded-full shrink-0 ${getStatDotClass(color)}`} />
        </div>
        <div className="text-muted-foreground text-[11px] mt-1">{label}</div>
      </CardContent>
    </Card>
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      setIncidents(payload.reports.map((report) => reportToIncident(report)));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load analytics data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidents();
  }, []);

  const showInitialLoader = loading && incidents.length === 0;

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
    <div className="p-5 bg-background min-h-full">
      <div className="flex items-center justify-between mb-4 gap-2.5 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-foreground text-[22px] font-bold m-0">{t('superadmin.analytics.pageTitle')}</h1>
          <p className="text-muted-foreground text-xs m-0 mt-0.5">
            {t('superadmin.analytics.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadIncidents();
          }}
          className="gap-1.5 text-xs font-semibold max-md:w-full max-md:min-h-10"
        >
          <RefreshCw size={13} /> {loading ? t('common.refreshing') : t('common.refresh')}
        </Button>
      </div>

      {error ? (
        <div className="mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs px-2.5 py-2">
          {error}
        </div>
      ) : null}

      <div className="grid mb-4 gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('superadmin.analytics.totalReports')} value={kpis.total} color="var(--primary)" />
        <StatCard label={t('superadmin.analytics.openReports')} value={kpis.active} color="var(--severity-critical)" />
        <StatCard label={t('superadmin.analytics.resolvedReports')} value={kpis.resolved} color="#059669" />
        <StatCard label={t('superadmin.analytics.avgResponse')} value={kpis.avgResponseLabel} color="var(--severity-medium)" />
      </div>

      <div className="grid gap-[14px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-[15px] font-bold">{t('superadmin.analytics.reportsByBarangay')}</CardTitle>
          </CardHeader>
          <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barangayData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="reports" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-[15px] font-bold">{t('superadmin.analytics.reportCategoryMix')}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3.5">
        <CardContent className="px-[18px] py-3.5">
          <div className="flex items-center gap-2 text-foreground text-[13px] font-bold mb-2">
            <AlertTriangle size={14} color="var(--severity-medium)" />
            {t('superadmin.analytics.reportingHealth')}
          </div>
          <div className="text-muted-foreground text-xs leading-[1.5]">
            {t('superadmin.analytics.reportingHealthDesc')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
