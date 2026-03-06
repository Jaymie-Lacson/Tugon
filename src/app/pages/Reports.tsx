import React, { useState } from 'react';
import {
  FileText, Download, Printer, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Brain, ShieldAlert,
  CloudRain, Users, MapPin, Calendar, ArrowRight, Sparkles,
  FileBarChart, FilePieChart, FileSearch, FileClock, RefreshCw,
  Lightbulb, Info, ChevronDown,
} from 'lucide-react';
import { incidents } from '../data/incidents';

const REPORT_TEMPLATES = [
  {
    id: 'daily-ops',
    icon: <FileClock size={20} />,
    title: 'Daily Operations Report',
    description: 'Comprehensive summary of all incidents, responses, and resolutions for the operational day.',
    category: 'Operations',
    color: '#1E3A8A',
    bg: '#EFF6FF',
    lastGen: '2026-03-06 06:00',
    frequency: 'Daily',
  },
  {
    id: 'incident-summary',
    icon: <FileBarChart size={20} />,
    title: 'Incident Summary Report',
    description: 'Statistical breakdown of incidents by type, severity, barangay, and resolution status.',
    category: 'Statistical',
    color: '#B4730A',
    bg: '#FEF3C7',
    lastGen: '2026-03-05 23:59',
    frequency: 'Weekly',
  },
  {
    id: 'resource-deployment',
    icon: <Users size={20} />,
    title: 'Resource Deployment Report',
    description: 'Analysis of unit deployments, response times, and personnel utilization metrics.',
    category: 'Resources',
    color: '#059669',
    bg: '#D1FAE5',
    lastGen: '2026-03-05 23:00',
    frequency: 'Weekly',
  },
  {
    id: 'critical-incidents',
    icon: <ShieldAlert size={20} />,
    title: 'Critical Incident Report',
    description: 'Detailed after-action reports for critical severity incidents requiring executive review.',
    category: 'Executive',
    color: '#B91C1C',
    bg: '#FEE2E2',
    lastGen: '2026-03-05 18:00',
    frequency: 'Per incident',
  },
  {
    id: 'barangay-profile',
    icon: <MapPin size={20} />,
    title: 'Barangay Vulnerability Profile',
    description: 'Geographic risk analysis and incident density mapping per barangay area.',
    category: 'Geospatial',
    color: '#0369A1',
    bg: '#E0F2FE',
    lastGen: '2026-03-01 08:00',
    frequency: 'Monthly',
  },
  {
    id: 'trend-analysis',
    icon: <FilePieChart size={20} />,
    title: 'Trend Analysis Report',
    description: 'Month-over-month and year-over-year incident trend analysis with forecasting data.',
    category: 'Analytics',
    color: '#7C3AED',
    bg: '#EDE9FE',
    lastGen: '2026-03-01 09:00',
    frequency: 'Monthly',
  },
];

const RECENT_REPORTS = [
  { name: 'Daily Ops Report — Mar 5, 2026', type: 'Operations', time: '2026-03-05 06:01', by: 'J. Reyes', size: '2.4 MB' },
  { name: 'Critical Incident INC-2026-0237 — After Action', type: 'Executive', time: '2026-03-05 23:45', by: 'M. Santos', size: '1.1 MB' },
  { name: 'Resource Deployment — Week 9', type: 'Resources', time: '2026-03-03 23:59', by: 'System', size: '3.2 MB' },
  { name: 'Incident Summary — Week 9', type: 'Statistical', time: '2026-03-03 23:58', by: 'System', size: '1.8 MB' },
  { name: 'Brgy. Riverside Vulnerability Profile', type: 'Geospatial', time: '2026-03-01 09:30', by: 'J. Cruz', size: '5.6 MB' },
];

const DSS_RECOMMENDATIONS = [
  {
    id: 1,
    priority: 'critical',
    icon: <CloudRain size={16} />,
    title: 'Flood Pre-Positioning Alert',
    description: 'Based on PAGASA weather data and historical incident patterns, Brgy. Riverside and Brgy. Bagbaguin show a 78% likelihood of flooding in the next 48 hours. Pre-deploy water rescue teams and open evacuation centers.',
    actions: ['Activate Evacuation Center 1 & 2', 'Deploy 2 water rescue units to Riverside', 'Issue community flood advisory'],
    confidence: 78,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    source: 'Weather API + Historical Data',
  },
  {
    id: 2,
    priority: 'high',
    icon: <ShieldAlert size={16} />,
    title: 'Crime Hotspot Pattern Detected',
    description: 'Incident clustering analysis shows elevated crime activity in the Market Area of Brgy. Santo Niño over the past 7 days. Recommend increased PNP patrol presence during market hours (06:00–20:00).',
    actions: ['Assign 2 additional patrol units to Santo Niño Market', 'Coordinate with Barangay Tanod for perimeter monitoring', 'Install temporary CCTV coverage'],
    confidence: 65,
    color: '#7C3AED',
    bg: '#EDE9FE',
    source: 'Incident Pattern Analysis',
  },
  {
    id: 3,
    priority: 'medium',
    icon: <Users size={16} />,
    title: 'BFP Capacity Optimization',
    description: 'Current BFP deployment rate is at 55% with 22 units deployed from 40 available. Response time for fire incidents averages 7.2 minutes, below the 8-minute target. Consider rotating 4 units for maintenance.',
    actions: ['Schedule maintenance for 4 BFP units', 'Maintain current deployment configuration', 'Monitor for surge events'],
    confidence: 82,
    color: '#B4730A',
    bg: '#FEF3C7',
    source: 'Resource Utilization Analysis',
  },
  {
    id: 4,
    priority: 'info',
    icon: <TrendingUp size={16} />,
    title: 'Positive Response Time Trend',
    description: 'Medical emergency response times have improved by 18% over the past 2 weeks (9.8 min → 6.4 min). The new EMS route optimization protocol appears to be effective. Recommend formalizing as standard procedure.',
    actions: ['Document EMS route optimization protocol', 'Share best practice with adjacent municipalities', 'Maintain current EMS deployment pattern'],
    confidence: 91,
    color: '#059669',
    bg: '#D1FAE5',
    source: 'Response Time Analytics',
  },
];

const priorityStyle = {
  critical: { color: '#B91C1C', bg: '#FEE2E2', label: 'CRITICAL' },
  high: { color: '#C2410C', bg: '#FFEDD5', label: 'HIGH PRIORITY' },
  medium: { color: '#92400E', bg: '#FEF3C7', label: 'MEDIUM' },
  info: { color: '#065F46', bg: '#D1FAE5', label: 'INSIGHT' },
};

function DSSCard({ rec }: { rec: typeof DSS_RECOMMENDATIONS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const pStyle = priorityStyle[rec.priority as keyof typeof priorityStyle];

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      overflow: 'hidden',
      border: `1px solid ${rec.bg}`,
      marginBottom: 12,
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: rec.bg, color: rec.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          {rec.icon}
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <div>
              <span style={{ background: pStyle.bg, color: pStyle.color, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em', marginRight: 8 }}>
                {pStyle.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{rec.title}</span>
            </div>
            {/* Confidence meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>Confidence</span>
              <div style={{ width: 50, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${rec.confidence}%`, background: rec.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: rec.color }}>{rec.confidence}%</span>
            </div>
          </div>
          <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>{rec.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Brain size={10} /> Source: {rec.source}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: rec.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {expanded ? 'Hide' : 'View'} Recommended Actions <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${rec.bg}`, padding: '12px 16px', background: rec.bg + '40' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recommended Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rec.actions.map((action, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: rec.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: '#334155', paddingTop: 2 }}>{action}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1, background: rec.color, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Approve & Dispatch
            </button>
            <button style={{ background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'templates' | 'dss' | 'history'>('dss');
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (id: string) => {
    setGenerating(id);
    setTimeout(() => setGenerating(null), 2500);
  };

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Reports & Decision Support</h1>
        <p style={{ color: '#64748B', fontSize: 12 }}>AI-assisted decision support and standardized reporting — TUGON DSS Module</p>
      </div>

      {/* Tabs */}
      <div className="reports-tabs" style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'white', borderRadius: 10, padding: 4, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', maxWidth: '100%', overflowX: 'auto' }}>
        {[
          { key: 'dss', label: 'Decision Support', icon: <Brain size={14} /> },
          { key: 'templates', label: 'Report Templates', icon: <FileText size={14} /> },
          { key: 'history', label: 'Report History', icon: <FileClock size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 7,
              border: 'none',
              background: activeTab === tab.key ? '#1E3A8A' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748B',
              fontSize: 12,
              fontWeight: activeTab === tab.key ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* DSS Tab */}
      {activeTab === 'dss' && (
        <div>
          {/* DSS Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Sparkles size={16} color="#FDE68A" />
                <span style={{ color: '#FDE68A', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI-Assisted Decision Support</span>
              </div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>TUGON Intelligence Engine</div>
              <div style={{ color: '#93C5FD', fontSize: 12 }}>
                Analyzing 13 days of incident data, weather patterns, and resource utilization to surface actionable recommendations.
              </div>
            </div>
            <button style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 16px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <RefreshCw size={13} /> Refresh Analysis
            </button>
          </div>

          {/* Stats row */}
          <div className="dss-stats-row" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Active Recommendations', value: 4, color: '#1E3A8A', bg: '#EFF6FF' },
              { label: 'Pending Actions', value: 8, color: '#B4730A', bg: '#FEF3C7' },
              { label: 'Approved This Week', value: 12, color: '#059669', bg: '#D1FAE5' },
              { label: 'Avg. Confidence Score', value: '79%', color: '#7C3AED', bg: '#EDE9FE' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 120px', background: 'white', borderRadius: 10, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lightbulb size={15} color="#B4730A" />
              Current Recommendations
            </div>
            {DSS_RECOMMENDATIONS.map(rec => <DSSCard key={rec.id} rec={rec} />)}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {REPORT_TEMPLATES.map(t => (
              <div key={t.id} style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #F1F5F9' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{t.title}</div>
                      <span style={{ background: t.bg, color: t.color, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {t.category}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{t.description}</p>
                </div>
                <div style={{ padding: '10px 16px', background: '#FAFBFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Last Generated</div>
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{t.lastGen}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Frequency</div>
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{t.frequency}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleGenerate(t.id)}
                      disabled={generating === t.id}
                      style={{
                        flex: 1, background: generating === t.id ? '#F1F5F9' : t.color, color: generating === t.id ? '#94A3B8' : 'white',
                        border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: generating === t.id ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      {generating === t.id ? (
                        <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                      ) : (
                        <><FileText size={12} /> Generate</>
                      )}
                    </button>
                    <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px', cursor: 'pointer' }}>
                      <Download size={14} color="#475569" />
                    </button>
                    <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px', cursor: 'pointer' }}>
                      <Printer size={14} color="#475569" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Generated Report History</span>
            <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={12} /> Export All
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Report Name', 'Category', 'Generated', 'Generated By', 'Size', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_REPORTS.map((r, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} color="#94A3B8" />
                      {r.name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#64748B' }}>{r.type}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{r.time}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B' }}>{r.by}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B' }}>{r.size}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={11} /> Download
                      </button>
                      <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                        <Printer size={12} color="#64748B" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}