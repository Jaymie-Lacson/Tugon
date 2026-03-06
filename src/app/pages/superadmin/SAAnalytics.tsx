import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Target, Activity, BarChart2,
  Layers, AlertTriangle, CheckCircle2, Flame, Droplets, Car, Heart,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area,
} from 'recharts';
import {
  weeklyTrend, monthlyTrend, responseTimeData, incidentTypeDist,
  heatmapCells, barangays,
} from '../../data/superAdminData';

const PRIMARY = '#1E3A8A';

type Period = 'weekly' | 'monthly';

const BRGY_COLORS = { brgy251: '#1D4ED8', brgy252: '#0F766E', brgy256: '#B4730A' };

const INCIDENT_COLORS = [
  '#B91C1C', '#1D4ED8', '#B4730A', '#0F766E', '#1E3A8A', '#374151',
];

interface StatChipProps { label: string; value: string | number; color: string; trend?: number; }
function StatChip({ label, value, color, trend }: StatChipProps) {
  const isUp = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>{label}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: isUp ? '#B91C1C' : '#059669', fontSize: 11, fontWeight: 600 }}>
          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}% vs prior period
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: 'none', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#94A3B8', fontSize: 11 }}>{p.name}:</span>
          <span style={{ color: '#E2E8F0', fontSize: 11, fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// Pie chart for incident type distribution (all barangays combined)
const pieData = incidentTypeDist.map((d, i) => ({
  name: d.type, value: d.brgy251 + d.brgy252 + d.brgy256, color: INCIDENT_COLORS[i],
}));

// Radar data per barangay
const radarData = [
  { metric: 'Response Rate', brgy251: 87, brgy252: 91, brgy256: 94 },
  { metric: 'Coverage', brgy251: 78, brgy252: 88, brgy256: 72 },
  { metric: 'Resolution', brgy251: 76, brgy252: 74, brgy256: 82 },
  { metric: 'Uptime', brgy251: 95, brgy252: 99, brgy256: 97 },
  { metric: 'User Activity', brgy251: 82, brgy252: 90, brgy256: 75 },
  { metric: 'Satisfaction', brgy251: 84, brgy252: 88, brgy256: 91 },
];

export default function SAAnalytics() {
  const [period, setPeriod] = useState<Period>('weekly');
  const trendData = period === 'weekly' ? weeklyTrend : monthlyTrend;
  const trendKey = period === 'weekly' ? 'day' : 'month';

  // Heatmap intensity grid (14×10 cells)
  const COLS = 14; const ROWS = 10;
  const cellW = 32; const cellH = 26;

  // Build a density grid from heatmapCells
  const densityGrid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  heatmapCells.forEach(cell => {
    const col = Math.floor((cell.x / 480) * COLS);
    const row = Math.floor((cell.y / 360) * ROWS);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      densityGrid[row][col] += cell.opacity * 3;
    }
  });
  const maxDensity = Math.max(...densityGrid.flat(), 0.01);

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>System-Wide Analytics</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            Incident trends, heatmaps & performance metrics across all barangays
          </p>
        </div>
        {/* Period toggle */}
        <div style={{ display: 'flex', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          {(['weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: period === p ? PRIMARY : 'transparent',
                color: period === p ? 'white' : '#6B7280',
                textTransform: 'capitalize',
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatChip label="Total Incidents (All Brgy)" value={109} color="#B91C1C" trend={12.5} />
        <StatChip label="System Avg Response Time" value="8.7 min" color="#B4730A" trend={-4.2} />
        <StatChip label="Overall Resolution Rate" value="84%" color="#059669" trend={3.1} />
        <StatChip label="Peak Incident Hour" value="06:00–08:00" color="#1D4ED8" />
      </div>

      {/* Trend chart + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>
        {/* Trend line chart */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>Incident Trends by Barangay</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{period === 'weekly' ? 'Last 7 days' : 'Last 6 months'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(BRGY_COLORS).map(([k, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 24, height: 3, background: c, borderRadius: 2 }} />
                  <span style={{ color: '#6B7280', fontSize: 10 }}>{k.replace('brgy', 'Brgy ')}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={trendData}>
              <defs>
                {Object.entries(BRGY_COLORS).map(([k, c]) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={c} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey={trendKey} tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(BRGY_COLORS).map(([k, c]) => (
                <Area
                  key={k} type="monotone" dataKey={k}
                  name={k.replace('brgy', 'Brgy ')}
                  stroke={c} strokeWidth={2.5}
                  fill={`url(#grad-${k})`} dot={{ r: 3.5, fill: c, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Incident Type Mix</div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 14 }}>All barangays combined</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                dataKey="value" paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11 }}
                itemStyle={{ color: '#E2E8F0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ color: '#374151', fontSize: 11, flex: 1 }}>{d.name}</span>
                <span style={{ color: '#0F172A', fontSize: 11, fontWeight: 700 }}>{d.value}</span>
                <span style={{ color: '#9CA3AF', fontSize: 10 }}>
                  ({Math.round((d.value / pieData.reduce((s, x) => s + x.value, 0)) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Response time chart + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
        {/* Response time bar chart */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>Average Response Time (min)</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>Per barangay — past 7 days vs. 10-min target</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: '#B91C1C', borderStyle: 'dashed' }} />
              <span style={{ color: '#9CA3AF', fontSize: 10 }}>10-min target</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={responseTimeData} barSize={14} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 16]} unit=" m" />
              <ReferenceLine y={10} stroke="#B91C1C" strokeDasharray="5 3" strokeWidth={1.5} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
              <Bar dataKey="brgy251" name="Brgy 251" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy252" name="Brgy 252" fill="#0F766E" radius={[3, 3, 0, 0]} />
              <Bar dataKey="brgy256" name="Brgy 256" fill="#B4730A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Performance Radar</div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 8 }}>Multi-metric comparison</div>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} outerRadius={75}>
              <PolarGrid stroke="#F3F4F6" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B7280', fontSize: 9.5 }} />
              <Radar name="Brgy 251" dataKey="brgy251" stroke="#1D4ED8" fill="#1D4ED8" fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name="Brgy 252" dataKey="brgy252" stroke="#0F766E" fill="#0F766E" fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name="Brgy 256" dataKey="brgy256" stroke="#B4730A" fill="#B4730A" fillOpacity={0.12} strokeWidth={1.5} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap grid + Incident type bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Heatmap grid */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Layers size={16} color="#1D4ED8" />
            <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>Incident Density Heatmap</div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 14 }}>
            Grid overlay: darker = higher incident concentration
          </div>

          {/* Color scale legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: '#9CA3AF', fontSize: 10 }}>Low</span>
            <div style={{
              flex: 1, height: 8, borderRadius: 4,
              background: 'linear-gradient(to right, #FEF9C3, #FDE68A, #FCA5A5, #EF4444, #991B1B)',
            }} />
            <span style={{ color: '#9CA3AF', fontSize: 10 }}>High</span>
          </div>

          {/* Heatmap grid */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${cellW}px)`, gap: 2 }}>
              {densityGrid.map((row, ri) =>
                row.map((val, ci) => {
                  const intensity = val / maxDensity;
                  const r = Math.round(255 * Math.min(intensity * 2, 1));
                  const g = Math.round(255 * Math.max(1 - intensity * 1.5, 0));
                  const b = 0;
                  const bg = intensity < 0.05
                    ? '#F9FAFB'
                    : `rgba(${r},${g},${b},${0.15 + intensity * 0.7})`;
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      title={`Zone [${ri},${ci}]: intensity ${(intensity * 100).toFixed(0)}%`}
                      style={{
                        width: cellW, height: cellH, borderRadius: 3,
                        background: bg,
                        border: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {intensity > 0.6 && (
                        <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>
                          {Math.round(intensity * 10)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Brgy labels below grid */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {barangays.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                <span style={{ color: '#6B7280', fontSize: 10 }}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident type per barangay stacked */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Incident Breakdown by Type</div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 14 }}>Stacked per barangay — March 2026</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barangays.map(b => {
              const typeMap: Record<string, number> = {};
              incidentTypeDist.forEach(d => {
                typeMap[d.type] = (d as any)[b.id];
              });
              return { name: b.name, ...typeMap };
            })} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
              {incidentTypeDist.map((d, i) => (
                <Bar key={d.type} dataKey={d.type} stackId="a" fill={INCIDENT_COLORS[i]} radius={i === incidentTypeDist.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}