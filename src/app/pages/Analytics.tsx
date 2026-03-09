import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle2, Users, Calendar, Download } from 'lucide-react';

const DAILY_TREND = [
  { day: 'Feb 22', total: 7, fire: 1, flood: 2, accident: 2, medical: 1, crime: 1, infrastructure: 0, typhoon: 0 },
  { day: 'Feb 23', total: 9, fire: 2, flood: 1, accident: 2, medical: 2, crime: 1, infrastructure: 1, typhoon: 0 },
  { day: 'Feb 24', total: 6, fire: 0, flood: 1, accident: 3, medical: 1, crime: 1, infrastructure: 0, typhoon: 0 },
  { day: 'Feb 25', total: 12, fire: 2, flood: 3, accident: 2, medical: 2, crime: 2, infrastructure: 1, typhoon: 0 },
  { day: 'Feb 26', total: 8, fire: 1, flood: 2, accident: 1, medical: 2, crime: 1, infrastructure: 1, typhoon: 0 },
  { day: 'Feb 27', total: 11, fire: 3, flood: 2, accident: 2, medical: 1, crime: 2, infrastructure: 1, typhoon: 0 },
  { day: 'Feb 28', total: 8, fire: 1, flood: 1, accident: 2, medical: 2, crime: 1, infrastructure: 1, typhoon: 0 },
  { day: 'Mar 1', total: 14, fire: 3, flood: 3, accident: 3, medical: 2, crime: 2, infrastructure: 1, typhoon: 0 },
  { day: 'Mar 2', total: 11, fire: 2, flood: 2, accident: 3, medical: 2, crime: 1, infrastructure: 1, typhoon: 0 },
  { day: 'Mar 3', total: 19, fire: 3, flood: 5, accident: 3, medical: 3, crime: 2, infrastructure: 2, typhoon: 1 },
  { day: 'Mar 4', total: 16, fire: 4, flood: 3, accident: 3, medical: 3, crime: 2, infrastructure: 1, typhoon: 0 },
  { day: 'Mar 5', total: 22, fire: 4, flood: 5, accident: 4, medical: 3, crime: 3, infrastructure: 2, typhoon: 1 },
  { day: 'Mar 6', total: 15, fire: 2, flood: 3, accident: 2, medical: 3, crime: 2, infrastructure: 2, typhoon: 1 },
];

const RESPONSE_TIME = [
  { type: 'Fire', avgMin: 7.2, target: 8 },
  { type: 'Flood', avgMin: 12.5, target: 15 },
  { type: 'Accident', avgMin: 8.1, target: 10 },
  { type: 'Medical', avgMin: 6.4, target: 8 },
  { type: 'Crime', avgMin: 9.3, target: 10 },
  { type: 'Infra.', avgMin: 18.7, target: 20 },
  { type: 'Typhoon', avgMin: 22.4, target: 25 },
];

const SEVERITY_DATA = [
  { name: 'Critical', value: 5, color: '#B91C1C' },
  { name: 'High', value: 28, color: '#EA580C' },
  { name: 'Medium', value: 41, color: '#B4730A' },
  { name: 'Low', value: 26, color: '#059669' },
];

const BARANGAY_DATA = [
  { name: 'Brgy. Riverside', incidents: 18, resolved: 14, active: 4 },
  { name: 'Brgy. Poblacion', incidents: 15, resolved: 12, active: 3 },
  { name: 'Brgy. San Antonio', incidents: 14, resolved: 11, active: 3 },
  { name: 'Brgy. Makiling', incidents: 12, resolved: 10, active: 2 },
  { name: 'Brgy. Santo Niño', incidents: 10, resolved: 8, active: 2 },
  { name: 'Brgy. Longos', incidents: 9, resolved: 8, active: 1 },
  { name: 'Brgy. Tumana', incidents: 8, resolved: 7, active: 1 },
  { name: 'Brgy. Caloocan', incidents: 7, resolved: 7, active: 0 },
];

const RESOURCE_DATA = [
  { name: 'BFP (Fire)', deployed: 22, available: 18, total: 40 },
  { name: 'PNP', deployed: 35, available: 65, total: 100 },
  { name: 'MDRRMO', deployed: 12, available: 8, total: 20 },
  { name: 'EMS', deployed: 8, available: 7, total: 15 },
  { name: 'DSWD', deployed: 6, available: 14, total: 20 },
];

const HOUR_DATA = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h.toString().padStart(2, '0')}:00`,
  count: [2,1,3,2,4,5,3,8,12,10,9,11,8,7,9,10,11,9,8,7,5,4,3,2][h],
}));

const RADAR_DATA = [
  { subject: 'Fire', A: 80, B: 60 },
  { subject: 'Flood', A: 90, B: 75 },
  { subject: 'Accident', A: 70, B: 65 },
  { subject: 'Medical', A: 95, B: 85 },
  { subject: 'Crime', A: 65, B: 70 },
  { subject: 'Infra.', A: 55, B: 60 },
  { subject: 'Typhoon', A: 45, B: 55 },
];

const PERIODS = ['Today', 'This Week', 'This Month', 'This Quarter'];

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

export default function Analytics() {
  const [period, setPeriod] = useState('This Week');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
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
        <MetricCard title="Total Incidents" value="105" change="+12%" up={false} sub="vs. last week" color="#B91C1C" />
        <MetricCard title="Resolution Rate" value="84.8%" change="+3.2%" up={true} sub="vs. last week" color="#059669" />
        <MetricCard title="Avg. Response" value="8.3 min" change="-1.2 min" up={true} sub="vs. last week" color="#B4730A" />
        <MetricCard title="Deployed Units" value="83" change="+8" up={false} sub="vs. last week" color="#1E3A8A" />
      </div>

      {/* Trend Chart */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 14 }}>Incident Trend by Type</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Last 13 days — daily incident count by category</div>
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
                {[
                  { key: 'fire', color: '#B91C1C' }, { key: 'flood', color: '#1D4ED8' },
                  { key: 'accident', color: '#B4730A' }, { key: 'medical', color: '#0F766E' },
                  { key: 'crime', color: '#7C3AED' }, { key: 'infrastructure', color: '#374151' },
                ].map(({ key, color }) => (
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
              <Area type="monotone" dataKey="fire" key="area-fire" stroke="#B91C1C" fill="url(#grad-fire)" strokeWidth={1.5} name="Fire" />
              <Area type="monotone" dataKey="flood" key="area-flood" stroke="#1D4ED8" fill="url(#grad-flood)" strokeWidth={1.5} name="Flood" />
              <Area type="monotone" dataKey="accident" key="area-accident" stroke="#B4730A" fill="url(#grad-accident)" strokeWidth={1.5} name="Accident" />
              <Area type="monotone" dataKey="medical" key="area-medical" stroke="#0F766E" fill="url(#grad-medical)" strokeWidth={1.5} name="Medical" />
              <Area type="monotone" dataKey="crime" key="area-crime" stroke="#7C3AED" fill="url(#grad-crime)" strokeWidth={1.5} name="Crime" />
              <Area type="monotone" dataKey="infrastructure" key="area-infrastructure" stroke="#374151" fill="url(#grad-infrastructure)" strokeWidth={1.5} name="Infra." />
            </AreaChart>
          ) : (
            <BarChart data={DAILY_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="fire" key="bar-fire" stackId="a" fill="#B91C1C" name="Fire" />
              <Bar dataKey="flood" key="bar-flood" stackId="a" fill="#1D4ED8" name="Flood" />
              <Bar dataKey="accident" key="bar-accident" stackId="a" fill="#B4730A" name="Accident" />
              <Bar dataKey="medical" key="bar-medical" stackId="a" fill="#0F766E" name="Medical" />
              <Bar dataKey="crime" key="bar-crime" stackId="a" fill="#7C3AED" name="Crime" />
              <Bar dataKey="infrastructure" key="bar-infrastructure" stackId="a" fill="#374151" name="Infra." radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Middle row charts */}
      <div className="analytics-middle-row" style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Response time */}
        <div style={{ flex: '2 1 280px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Average Response Time by Type</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 12 }}>Minutes from report to first response (target overlay)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={RESPONSE_TIME} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit="m" />
              <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={55} />
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
                  <Cell key={`cell-rt-${index}-${entry.type}`} fill={entry.avgMin <= entry.target ? '#059669' : '#B91C1C'} />
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
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 10 }}>All incidents this week</div>
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
                <span style={{ fontSize: 10, color: '#94A3B8' }}>{Math.round(s.value / 100 * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hourly pattern */}
        <div style={{ flex: '2 1 260px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Hourly Incident Pattern</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 12 }}>Average incidents per hour (7-day period)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={HOUR_DATA} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(value) => [`${value} incidents`]} />
              <Bar dataKey="count" key="bar-count" fill="#1E3A8A" radius={[3, 3, 0, 0]}>
                {HOUR_DATA.map((entry, index) => (
                  <Cell key={`cell-hr-${index}-${entry.hour}`} fill={entry.count >= 10 ? '#B91C1C' : entry.count >= 7 ? '#B4730A' : '#1E3A8A'} />
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
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 14 }}>Incidents reported vs. resolved by barangay</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={BARANGAY_DATA} margin={{ top: 0, right: 5, left: -15, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="incidents" key="bar-incidents" fill="#1E3A8A" name="Reported" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="resolved" key="bar-resolved" fill="#059669" name="Resolved" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="active" key="bar-active" fill="#B91C1C" name="Active" radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource utilization */}
        <div style={{ flex: '2 1 240px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13, marginBottom: 4 }}>Resource Utilization</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginBottom: 14 }}>Deployed vs. available units</div>
          {RESOURCE_DATA.map(r => {
            const pct = Math.round((r.deployed / r.total) * 100);
            const color = pct >= 80 ? '#B91C1C' : pct >= 60 ? '#B4730A' : '#059669';
            return (
              <div key={r.name} style={{ marginBottom: 12 }}>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Resource Alert</div>
            <div style={{ fontSize: 11, color: '#92400E' }}>BFP units at 55% capacity. Consider requesting mutual aid from neighboring municipalities.</div>
          </div>
        </div>
      </div>
    </div>
  );
}