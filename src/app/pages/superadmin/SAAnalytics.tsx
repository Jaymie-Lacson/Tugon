import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
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

const TYPE_COLORS: Record<string, string> = {
  flood: '#1D4ED8',
  accident: '#B4730A',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-[10px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-gray-200">
      <div className="flex items-center justify-between gap-2">
        <div className="text-slate-950 text-[22px] font-bold leading-none">{value}</div>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      </div>
      <div className="text-gray-500 text-[11px] mt-1">{label}</div>
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
    <div className="p-5 bg-[#F0F4FF] min-h-full">
      <div className="sa-analytics-header flex items-center justify-between mb-4 gap-2.5">
        <div>
          <h1 className="text-slate-950 text-[22px] font-bold m-0">System-Wide Analytics</h1>
          <p className="text-gray-500 text-xs m-0 mt-0.5">
            Database-backed incident reporting metrics
          </p>
        </div>
        <button
          onClick={() => {
            void loadIncidents();
          }}
          className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3.5 py-2 cursor-pointer text-gray-700 text-xs font-semibold"
        >
          <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs px-2.5 py-2">
          {error}
        </div>
      ) : null}

      <div className="sa-analytics-stats grid mb-4" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard label="Total Reports" value={kpis.total} color="#1E3A8A" />
        <StatCard label="Open Reports" value={kpis.active} color="#B91C1C" />
        <StatCard label="Resolved Reports" value={kpis.resolved} color="#059669" />
        <StatCard label="Avg Response" value={kpis.avgResponseLabel} color="#B4730A" />
      </div>

      <div className="sa-analytics-grid grid" style={{ gridTemplateColumns: '1fr 340px', gap: 14 }}>
        <div className="bg-white rounded-[14px] px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-gray-200">
          <div className="text-slate-950 text-[15px] font-bold mb-2.5">Reports by Barangay</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barangayData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="reports" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-[14px] px-5 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-gray-200">
          <div className="text-slate-950 text-[15px] font-bold mb-2.5">Report Category Mix</div>
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

      <div className="mt-3.5 bg-white rounded-[14px] px-[18px] py-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] border border-gray-200">
        <div className="flex items-center gap-2 text-slate-900 text-[13px] font-bold mb-2">
          <AlertTriangle size={14} color="#B4730A" />
          Reporting Health
        </div>
        <div className="text-slate-500 text-xs leading-[1.5]">
          <Clock size={12} style={{ verticalAlign: 'middle' }} /> Average response time is based on report submission to first official action.
          {' '}
          <CheckCircle2 size={12} style={{ verticalAlign: 'middle' }} /> All metrics in this page are sourced from live API report data.
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .sa-analytics-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .sa-analytics-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .sa-analytics-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .sa-analytics-header button {
            width: 100%;
            justify-content: center;
            min-height: 40px;
          }

          .sa-analytics-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
