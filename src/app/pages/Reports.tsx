import React, { useEffect, useState } from 'react';
import {
  FileText, Download, Printer, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Brain, ShieldAlert,
  CloudRain, Users, MapPin, Calendar, ArrowRight, Sparkles,
  FileBarChart, FilePieChart, FileSearch, FileClock, RefreshCw,
  Lightbulb, Info, ChevronDown,
} from 'lucide-react';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import { officialReportsApi } from '../services/officialReportsApi';
import type { ApiDssRecommendation } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import { getAuthSession } from '../utils/authSession';
import type { Incident } from '../data/incidents';

const REPORT_TEMPLATES = [
  {
    id: 'daily-ops',
    icon: <FileClock size={20} />,
    title: 'Daily Operations Report',
    description: 'Comprehensive summary of all incidents, responses, and resolutions for the operational day.',
    category: 'Operations',
    color: '#1E3A8A',
    bg: '#EFF6FF',
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
    frequency: 'Monthly',
  },
];

interface RecentReportItem {
  reportId: string;
  name: string;
  type: string;
  time: string;
  by: string;
  size: string;
}

interface TemplateGenerationHistoryItem {
  templateId: string;
  templateName: string;
  generatedAt: string;
  generatedBy: string;
  fileName: string;
}

const TEMPLATE_GENERATION_HISTORY_KEY = 'tugon.official.template.generation.history';

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function printTextContent(title: string, content: string) {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const popup = window.open('', '_blank', 'width=860,height=640');
  if (!popup) {
    throw new Error('Popup blocked. Allow popups to print this report.');
  }

  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Roboto,sans-serif;padding:16px;color:#0f172a}pre{white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}</style></head><body><h2>${title}</h2><pre>${escaped}</pre></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function resolveTemplateTitle(templateId: string): string {
  return REPORT_TEMPLATES.find((template) => template.id === templateId)?.title ?? templateId;
}

function loadTemplateGenerationHistory(): TemplateGenerationHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(TEMPLATE_GENERATION_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is TemplateGenerationHistoryItem => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<TemplateGenerationHistoryItem>;
      return typeof candidate.templateId === 'string'
        && typeof candidate.templateName === 'string'
        && typeof candidate.generatedAt === 'string'
        && typeof candidate.generatedBy === 'string'
        && typeof candidate.fileName === 'string';
    }).slice(0, 20);
  } catch {
    return [];
  }
}

function persistTemplateGenerationHistory(items: TemplateGenerationHistoryItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TEMPLATE_GENERATION_HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
}

function incidentTypeToReportCategory(type: string): string {
  if (type === 'crime') {
    return 'Executive';
  }
  if (type === 'accident' || type === 'medical') {
    return 'Operations';
  }
  if (type === 'flood' || type === 'infrastructure' || type === 'typhoon') {
    return 'Geospatial';
  }
  return 'Statistical';
}

function formatEvidenceSummary(photoCount: number, hasAudio: boolean): string {
  const parts: string[] = [];
  if (photoCount > 0) {
    parts.push(`${photoCount} photo${photoCount > 1 ? 's' : ''}`);
  }
  if (hasAudio) {
    parts.push('voice clip');
  }
  return parts.length > 0 ? parts.join(' + ') : 'No attachments';
}

type RecommendationPriority = 'critical' | 'high' | 'medium' | 'info';

interface DSSRecommendation {
  id: number;
  priority: RecommendationPriority;
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: string[];
  confidence: number;
  color: string;
  bg: string;
  source: string;
}

function getRecommendationStyle(priority: RecommendationPriority): Pick<DSSRecommendation, 'icon' | 'color' | 'bg'> {
  if (priority === 'critical') {
    return { icon: <ShieldAlert size={16} />, color: '#B91C1C', bg: '#FEE2E2' };
  }
  if (priority === 'high') {
    return { icon: <CloudRain size={16} />, color: '#1D4ED8', bg: '#EFF6FF' };
  }
  if (priority === 'medium') {
    return { icon: <Users size={16} />, color: '#B4730A', bg: '#FEF3C7' };
  }
  return { icon: <TrendingUp size={16} />, color: '#059669', bg: '#D1FAE5' };
}

function toMinutes(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function buildRecommendations(incidents: Incident[]): DSSRecommendation[] {
  if (incidents.length === 0) {
    return [];
  }

  const now = Date.now();
  const unresolved = incidents.filter((incident) => incident.status !== 'resolved');
  const criticalUnresolved = unresolved.filter((incident) => incident.severity === 'critical');
  const unresolvedOlderThan24h = unresolved.filter((incident) => now - new Date(incident.reportedAt).getTime() >= 24 * 60 * 60 * 1000);
  const recentWeek = incidents.filter((incident) => now - new Date(incident.reportedAt).getTime() <= 7 * 24 * 60 * 60 * 1000);

  const byBarangay = new Map<string, number>();
  for (const incident of recentWeek) {
    byBarangay.set(incident.barangay, (byBarangay.get(incident.barangay) ?? 0) + 1);
  }
  const topBarangay = [...byBarangay.entries()].sort((a, b) => b[1] - a[1])[0];

  const responseMinutes = incidents
    .filter((incident) => incident.respondedAt)
    .map((incident) => toMinutes(incident.reportedAt, incident.respondedAt ?? incident.reportedAt));
  const avgResponse = responseMinutes.length > 0
    ? Number((responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length).toFixed(1))
    : null;

  const recommendations: Array<Omit<DSSRecommendation, 'id' | 'icon' | 'color' | 'bg'>> = [];

  if (criticalUnresolved.length > 0) {
    recommendations.push({
      priority: 'critical',
      title: 'Critical Incidents Need Immediate Action',
      description: `${criticalUnresolved.length} critical incident${criticalUnresolved.length > 1 ? 's are' : ' is'} still unresolved in your queue. Prioritize verification and status updates to reduce escalation risk.`,
      actions: ['Escalate critical queue to duty officer', 'Update official status and notes for each critical case', 'Post barangay situational update for ongoing risks'],
      confidence: Math.min(95, 70 + criticalUnresolved.length * 5),
      source: 'Live Incident Queue',
    });
  }

  if (topBarangay) {
    recommendations.push({
      priority: 'high',
      title: 'Weekly Hotspot Concentration Detected',
      description: `${topBarangay[0]} logged ${topBarangay[1]} incident${topBarangay[1] > 1 ? 's' : ''} in the last 7 days, higher than other covered areas. Plan targeted patrol and preventive advisories.`,
      actions: ['Increase field monitoring in hotspot puroks', 'Coordinate with barangay tanod for peak-hour visibility', 'Issue focused community safety advisory'],
      confidence: Math.min(92, 55 + topBarangay[1] * 6),
      source: '7-Day Incident Distribution',
    });
  }

  if (avgResponse !== null) {
    recommendations.push({
      priority: 'info',
      title: 'Average First Response Insight',
      description: `Current average time to first response is ${avgResponse} minutes based on ${responseMinutes.length} responded report${responseMinutes.length > 1 ? 's' : ''}. Track this against barangay operational targets.`,
      actions: ['Review delayed responses above average', 'Highlight fast-response workflow for replication', 'Include response-time summary in shift briefing'],
      confidence: Math.min(96, 65 + responseMinutes.length),
      source: 'Response Timeline Analysis',
    });
  }

  if (unresolvedOlderThan24h.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Aging Unresolved Reports',
      description: `${unresolvedOlderThan24h.length} unresolved report${unresolvedOlderThan24h.length > 1 ? 's are' : ' is'} older than 24 hours. Consider focused review to prevent backlog growth.`,
      actions: ['Tag aging incidents for priority reassessment', 'Assign resolution owner per aging report', 'Update status notes for pending field verification'],
      confidence: Math.min(94, 60 + unresolvedOlderThan24h.length * 6),
      source: 'Queue Aging Monitor',
    });
  }

  return recommendations.slice(0, 4).map((rec, index) => {
    const style = getRecommendationStyle(rec.priority);
    return {
      id: index + 1,
      ...rec,
      ...style,
    };
  });
}

function mapApiRecommendationsToUi(recommendations: ApiDssRecommendation[]): DSSRecommendation[] {
  return recommendations.slice(0, 4).map((recommendation, index) => {
    const style = getRecommendationStyle(recommendation.priority);
    return {
      id: index + 1,
      priority: recommendation.priority,
      icon: style.icon,
      color: style.color,
      bg: style.bg,
      title: recommendation.title,
      description: recommendation.description,
      actions: recommendation.actions,
      confidence: recommendation.confidence,
      source: recommendation.source,
    };
  });
}

const priorityStyle = {
  critical: { color: '#B91C1C', bg: '#FEE2E2', label: 'CRITICAL' },
  high: { color: '#C2410C', bg: '#FFEDD5', label: 'HIGH PRIORITY' },
  medium: { color: '#92400E', bg: '#FEF3C7', label: 'MEDIUM' },
  info: { color: '#065F46', bg: '#D1FAE5', label: 'INSIGHT' },
};

function DSSCard({
  rec,
  onDismiss,
  busy,
}: {
  rec: DSSRecommendation;
  onDismiss: (rec: DSSRecommendation) => void;
  busy: boolean;
}) {
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
            <button
              onClick={() => onDismiss(rec)}
              disabled={busy}
              style={{ width: '100%', background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              {busy ? 'Submitting...' : 'Dismiss Recommendation'}
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
  const [recentReports, setRecentReports] = useState<RecentReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<number[]>([]);
  const [dssActionSubmittingId, setDssActionSubmittingId] = useState<number | null>(null);
  const [dssRefreshing, setDssRefreshing] = useState(false);
  const [dssLastRefreshedAt, setDssLastRefreshedAt] = useState<string | null>(null);
  const [reportsSignature, setReportsSignature] = useState('');
  const [incidentData, setIncidentData] = useState<Incident[]>([]);
  const [dssRecommendations, setDssRecommendations] = useState<DSSRecommendation[]>([]);
  const [dssRecommendationSource, setDssRecommendationSource] = useState<'ai' | 'fallback'>('fallback');
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [templateHistory, setTemplateHistory] = useState<TemplateGenerationHistoryItem[]>(() => loadTemplateGenerationHistory());

  useEffect(() => {
    const load = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        const [payload, dssPayload] = await Promise.all([
          officialReportsApi.getReports(),
          officialReportsApi.getDssRecommendations().catch(() => null),
        ]);
        const mapped = payload.reports.map((report) => reportToIncident(report));
        const signature = payload.reports
          .map((report) => `${report.id}:${report.status}:${report.updatedAt}`)
          .sort()
          .join('|');
        setIncidentData(mapped);
        if (dssPayload?.recommendations?.length) {
          setDssRecommendations(mapApiRecommendationsToUi(dssPayload.recommendations));
          setDssRecommendationSource(dssPayload.source);
        } else {
          setDssRecommendations(buildRecommendations(mapped));
          setDssRecommendationSource('fallback');
        }
        setReportsSignature(signature);
        setDssLastRefreshedAt(new Date().toISOString());
        const historyRows = payload.reports.slice(0, 8).map((report) => {
          const incident = reportToIncident(report);
          return {
            reportId: incident.id,
            name: `${incident.id} — ${incident.location}`,
            type: incidentTypeToReportCategory(incident.type),
            time: new Date(incident.reportedAt).toLocaleString('en-PH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            by: incident.reportedBy,
            size: formatEvidenceSummary(report.photoCount, report.hasAudio),
          };
        });
        setRecentReports(historyRows);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load report history.';
        setReportsError(message);
        setIncidentData([]);
        setDssRecommendations([]);
      } finally {
        setReportsLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!initialLoadPending) {
      return;
    }

    if (!reportsLoading) {
      setInitialLoadPending(false);
    }
  }, [initialLoadPending, reportsLoading]);

  const reloadReports = async (source: 'dss' | 'general' = 'general') => {
    if (source === 'dss') {
      setDssRefreshing(true);
      setActionError(null);
      setActionSuccess(null);
    }

    setReportsLoading(true);
    setReportsError(null);
    try {
      const [payload, dssPayload] = await Promise.all([
        officialReportsApi.getReports(),
        officialReportsApi.getDssRecommendations().catch(() => null),
      ]);
      const mapped = payload.reports.map((report) => reportToIncident(report));
      const nextSignature = payload.reports
        .map((report) => `${report.id}:${report.status}:${report.updatedAt}`)
        .sort()
        .join('|');
      const changed = nextSignature !== reportsSignature;

      setIncidentData(mapped);
      if (dssPayload?.recommendations?.length) {
        setDssRecommendations(mapApiRecommendationsToUi(dssPayload.recommendations));
        setDssRecommendationSource(dssPayload.source);
      } else {
        setDssRecommendations(buildRecommendations(mapped));
        setDssRecommendationSource('fallback');
      }
      setReportsSignature(nextSignature);
      setDssLastRefreshedAt(new Date().toISOString());
      setDismissedRecommendationIds([]);
      const historyRows = payload.reports.slice(0, 8).map((report) => {
        const incident = reportToIncident(report);
        return {
          reportId: incident.id,
          name: `${incident.id} — ${incident.location}`,
          type: incidentTypeToReportCategory(incident.type),
          time: new Date(incident.reportedAt).toLocaleString('en-PH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          by: incident.reportedBy,
          size: formatEvidenceSummary(report.photoCount, report.hasAudio),
        };
      });
      setRecentReports(historyRows);

      if (source === 'dss') {
        setActionSuccess(
          changed
            ? 'Decision support analysis refreshed with latest incident updates.'
            : 'Decision support analysis refreshed. No new incident changes since last refresh.',
        );
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to reload reports.';
      setReportsError(message);
      setIncidentData([]);
      setDssRecommendations([]);

      if (source === 'dss') {
        setActionError(message);
      }
    } finally {
      setReportsLoading(false);
      if (source === 'dss') {
        setDssRefreshing(false);
      }
    }
  };

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await officialReportsApi.generateTemplateReport(id);
      setActionSuccess(`${result.fileName} generated successfully.`);

      const historyEntry: TemplateGenerationHistoryItem = {
        templateId: id,
        templateName: resolveTemplateTitle(id),
        generatedAt: new Date().toISOString(),
        generatedBy: getAuthSession()?.user.fullName?.trim() || 'Barangay Official',
        fileName: result.fileName,
      };

      setTemplateHistory((prev) => {
        const next = [historyEntry, ...prev].slice(0, 20);
        persistTemplateGenerationHistory(next);
        return next;
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to generate report template.');
    } finally {
      setGenerating(null);
    }
  };

  const handleTemplateDownload = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { text, fileName } = await officialReportsApi.exportTemplateReport(id);
      downloadFile(fileName ?? `tugon-${id}.txt`, text, 'text/plain;charset=utf-8');
      setActionSuccess(`${fileName ?? `tugon-${id}.txt`} downloaded.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to download template report.');
    }
  };

  const handleTemplatePrint = async (id: string, title: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { text } = await officialReportsApi.exportTemplateReport(id);
      printTextContent(title, text);
      setActionSuccess(`${title} opened for printing.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to print template report.');
    }
  };

  const handleHistoryExportAll = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { text, fileName } = await officialReportsApi.exportAllReports();
      downloadFile(fileName ?? 'tugon-report-history.csv', text, 'text/csv;charset=utf-8');
      setActionSuccess('Report history exported as CSV.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to export report history.');
    }
  };

  const handleHistoryDownload = async (reportId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { text, fileName } = await officialReportsApi.exportReportById(reportId);
      downloadFile(fileName ?? `tugon-${reportId}.xls`, text, 'application/vnd.ms-excel;charset=utf-8');
      setActionSuccess(`Report ${reportId} downloaded as Excel.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to download report.');
    }
  };

  const handleHistoryPrint = async (reportId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { text } = await officialReportsApi.exportReportById(reportId);
      printTextContent(`Report ${reportId}`, text);
      setActionSuccess(`Report ${reportId} opened for printing.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to print report.');
    }
  };

  const visibleDssRecommendations = React.useMemo(
    () => dssRecommendations.filter((rec) => !dismissedRecommendationIds.includes(rec.id)),
    [dismissedRecommendationIds, dssRecommendations],
  );
  const dssActionCount = visibleDssRecommendations.reduce((sum, rec) => sum + rec.actions.length, 0);
    const handleDssAction = async (rec: DSSRecommendation) => {
      setDssActionSubmittingId(rec.id);
      setActionError(null);
      setActionSuccess(null);
      try {
        await officialReportsApi.submitDssAction({
          actionType: 'DISMISS',
          recommendationTitle: rec.title,
        });

        setDismissedRecommendationIds((prev) => [...prev, rec.id]);
        setActionSuccess('Recommendation dismissed and removed from active queue.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to submit DSS action.');
      } finally {
        setDssActionSubmittingId(null);
      }
    };

  const resolvedThisWeek = React.useMemo(() => {
    const now = Date.now();
    return incidentData.filter((incident) => incident.resolvedAt && now - new Date(incident.resolvedAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  }, [incidentData]);
  const avgConfidence = dssRecommendations.length > 0
    ? Math.round(dssRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / dssRecommendations.length)
    : 0;
  const analysisWindowDays = React.useMemo(() => {
    if (incidentData.length === 0) {
      return 0;
    }
    const minTs = Math.min(...incidentData.map((incident) => new Date(incident.reportedAt).getTime()));
    const diffDays = Math.floor((Date.now() - minTs) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, diffDays);
  }, [incidentData]);
  const latestIncidentTime = React.useMemo(() => {
    if (incidentData.length === 0) {
      return 'No data yet';
    }
    const latestTs = Math.max(...incidentData.map((incident) => new Date(incident.reportedAt).getTime()));
    return new Date(latestTs).toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [incidentData]);

  if (initialLoadPending) {
    return (
      <div style={{ padding: '16px 20px', minHeight: '100%' }}>
        <CardSkeleton
          count={3}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        />
        <div style={{ marginTop: 16 }}>
          <TextSkeleton rows={3} title={false} />
        </div>
        <div style={{ marginTop: 16 }}>
          <TableSkeleton rows={7} columns={4} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Reports & Decision Support</h1>
        <p style={{ color: '#64748B', fontSize: 12 }}>AI-assisted decision support and standardized reporting — TUGON DSS Module</p>
      </div>

      {/* Tabs */}
      {actionError ? (
        <div style={{ marginBottom: 12, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div style={{ marginBottom: 12, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
          {actionSuccess}
        </div>
      ) : null}

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
                {analysisWindowDays > 0
                  ? `Analyzing ${analysisWindowDays} day${analysisWindowDays > 1 ? 's' : ''} of incident data to surface actionable recommendations.`
                  : 'Waiting for incident data to generate recommendations.'}
              </div>
              <div style={{ color: '#93C5FD', fontSize: 11, marginTop: 4 }}>
                Recommendation source: {dssRecommendationSource === 'ai' ? 'AI model' : 'Fallback rules engine'}
              </div>
              <div style={{ color: '#BFDBFE', fontSize: 11, marginTop: 6 }}>
                Last refreshed:{' '}
                {dssLastRefreshedAt
                  ? new Date(dssLastRefreshedAt).toLocaleString('en-PH', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })
                  : 'Not yet'}
              </div>
            </div>
            <button
              onClick={() => { void reloadReports('dss'); }}
              disabled={dssRefreshing}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                padding: '8px 16px',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: dssRefreshing ? 'not-allowed' : 'pointer',
                opacity: dssRefreshing ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <RefreshCw size={13} style={dssRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
              {dssRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
          </div>

          {/* Stats row */}
          <div className="dss-stats-row" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Active Recommendations', value: visibleDssRecommendations.length, color: '#1E3A8A', bg: '#EFF6FF' },
              { label: 'Pending Actions', value: dssActionCount, color: '#B4730A', bg: '#FEF3C7' },
              { label: 'Resolved This Week', value: resolvedThisWeek, color: '#059669', bg: '#D1FAE5' },
              { label: 'Avg. Confidence Score', value: `${avgConfidence}%`, color: '#7C3AED', bg: '#EDE9FE' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 120px', background: 'white', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 5px rgba(15, 23, 42, 0.06)', border: '1px solid #E2E8F0' }}>
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
              {visibleDssRecommendations.length > 0 ? (
              visibleDssRecommendations.map((rec) => (
                <DSSCard
                  key={rec.id}
                  rec={rec}
                  onDismiss={(item) => { void handleDssAction(item); }}
                  busy={dssActionSubmittingId === rec.id}
                />
              ))
            ) : (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', color: '#64748B', fontSize: 12, padding: '12px 14px' }}>
                No live recommendation available yet. Submit or process incidents to unlock DSS insights.
              </div>
            )}
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
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{latestIncidentTime}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Frequency</div>
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{t.frequency}</div>
                    </div>
                  </div>
                  <div className="report-template-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                    <div className="report-template-secondary-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button onClick={() => { void handleTemplateDownload(t.id); }} style={{ background: '#EFF6FF', color: '#1E3A8A', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                        <Download size={14} /> Download
                      </button>
                      <button onClick={() => { void handleTemplatePrint(t.id, t.title); }} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#334155' }}>
                        <Printer size={14} /> Print
                      </button>
                    </div>
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
                        <><FileText size={12} /> Generate New Report</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Past Generated Template Reports</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>{templateHistory.length} record{templateHistory.length === 1 ? '' : 's'}</span>
            </div>

            <div className="report-history-table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Template', 'Generated At', 'Generated By', 'File Name', 'Quick Actions'].map((heading) => (
                      <th key={heading} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templateHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '12px 14px', color: '#64748B' }}>
                        No generated templates yet. Use any template card above to generate your first report.
                      </td>
                    </tr>
                  ) : templateHistory.map((historyItem) => (
                    <tr key={`${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 600 }}>{historyItem.templateName}</td>
                      <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{formatDateTime(historyItem.generatedAt)}</td>
                      <td style={{ padding: '11px 14px', color: '#64748B' }}>{historyItem.generatedBy}</td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>{historyItem.fileName}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Download size={11} /> Download
                          </button>
                          <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#334155', fontSize: 11, fontWeight: 600 }}>
                            <Printer size={11} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-history-mobile-list" style={{ padding: 12 }}>
              {templateHistory.length === 0 ? (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', color: '#64748B', fontSize: 12 }}>
                  No generated templates yet. Use any template card above to generate your first report.
                </div>
              ) : templateHistory.map((historyItem) => (
                <div key={`mobile:${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10, background: '#FFFFFF' }}>
                  <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{historyItem.templateName}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}><strong>Generated:</strong> {formatDateTime(historyItem.generatedAt)}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}><strong>By:</strong> {historyItem.generatedBy}</div>
                    <div style={{ fontSize: 11, color: '#64748B', wordBreak: 'break-word' }}><strong>File:</strong> {historyItem.fileName}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 7, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Download size={12} /> Download
                    </button>
                    <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} style={{ background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 7, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Generated Report History</span>
            <button onClick={() => { void handleHistoryExportAll(); }} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={12} /> Export All CSV
            </button>
          </div>
          <div className="report-history-table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Report Name', 'Category', 'Generated', 'Generated By', 'Size', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportsError ? (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 14px', color: '#B91C1C' }}>{reportsError}</td>
                </tr>
              ) : reportsLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '10px 12px' }}>
                    <TableSkeleton rows={5} columns={6} showHeader={false} className="border-0" />
                  </td>
                </tr>
              ) : recentReports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 14px', color: '#64748B' }}>No report history available.</td>
                </tr>
              ) : recentReports.map((r, i) => (
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
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'normal' }}>{r.type}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{r.time}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B' }}>{r.by}</td>
                  <td style={{ padding: '11px 14px', color: '#64748B' }}>{r.size}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { void handleHistoryDownload(r.reportId); }} style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={11} /> Download
                      </button>
                      <button onClick={() => { void handleHistoryPrint(r.reportId); }} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                        <Printer size={12} color="#64748B" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="report-history-mobile-list" style={{ padding: 12 }}>
            {reportsError ? (
              <div style={{ border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', color: '#B91C1C', fontSize: 12, background: '#FEF2F2' }}>
                {reportsError}
              </div>
            ) : reportsLoading ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                <TableSkeleton rows={4} columns={1} showHeader={false} className="border-0" />
              </div>
            ) : recentReports.length === 0 ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', color: '#64748B', fontSize: 12 }}>
                No report history available.
              </div>
            ) : recentReports.map((reportItem, index) => (
              <div key={`mobile-report:${reportItem.reportId}:${index}`} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <FileText size={14} color="#94A3B8" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{reportItem.name}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}><strong>Category:</strong> {reportItem.type}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}><strong>Generated:</strong> {reportItem.time}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}><strong>By:</strong> {reportItem.by}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}><strong>Evidence:</strong> {reportItem.size}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => { void handleHistoryDownload(reportItem.reportId); }} style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 7, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => { void handleHistoryPrint(reportItem.reportId); }} style={{ background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 7, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .report-history-table-wrapper {
          display: block;
        }

        .report-history-mobile-list {
          display: none;
        }

        @media (max-width: 768px) {
          .report-template-actions {
            align-items: center;
          }

          .report-template-secondary-actions {
            grid-template-columns: 1fr;
          }

          .report-template-actions > button {
            min-height: 44px;
          }

          .report-history-table-wrapper {
            display: none;
          }

          .report-history-mobile-list {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}