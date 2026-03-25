import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { OfficialPageInitialLoader } from '../../components/OfficialPageInitialLoader';
import { officialReportsApi } from '../../services/officialReportsApi';
import { reportToIncident } from '../../utils/incidentAdapters';
import type { Incident } from '../../data/incidents';

const TYPE_COLORS: Record<string, string> = {
  fire: '#B91C1C',
  flood: '#1D4ED8',
  accident: '#B4730A',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 10,
        padding: '14px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid #E5E7EB',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      </div>
      <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>{label}</div>
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
    return <OfficialPageInitialLoader label="Loading super admin analytics" />;
  }

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      <div className="sa-analytics-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>System-Wide Analytics</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            Database-backed incident reporting metrics
          </p>
        </div>
        <button
          onClick={() => {
            void loadIncidents();
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'white', border: '1px solid #E5E7EB', borderRadius: 8,
            padding: '8px 14px', cursor: 'pointer', color: '#374151', fontSize: 12, fontWeight: 600,
          }}
        >
          <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, padding: '8px 10px' }}>
          {error}
        </div>
      ) : null}

      <div className="sa-analytics-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Total Reports" value={kpis.total} color="#1E3A8A" />
        <StatCard label="Open Reports" value={kpis.active} color="#B91C1C" />
        <StatCard label="Resolved Reports" value={kpis.resolved} color="#059669" />
        <StatCard label="Avg Response" value={kpis.avgResponseLabel} color="#B4730A" />
      </div>

      <div className="sa-analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
          <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Reports by Barangay</div>
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

        <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
          <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Report Category Mix</div>
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

      <div style={{ marginTop: 14, background: '#FFFFFF', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E293B', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          <AlertTriangle size={14} color="#B4730A" />
          Reporting Health
        </div>
        <div style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>
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
