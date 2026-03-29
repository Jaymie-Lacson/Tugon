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
    color: 'var(--primary)',
    bg: '#EFF6FF',
    frequency: 'Daily',
  },
  {
    id: 'incident-summary',
    icon: <FileBarChart size={20} />,
    title: 'Incident Summary Report',
    description: 'Statistical breakdown of incidents by type, severity, barangay, and resolution status.',
    category: 'Statistical',
    color: 'var(--severity-medium)',
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
    color: 'var(--severity-critical)',
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
    return { icon: <ShieldAlert size={16} />, color: 'var(--severity-critical)', bg: '#FEE2E2' };
  }
  if (priority === 'high') {
    return { icon: <CloudRain size={16} />, color: '#1D4ED8', bg: '#EFF6FF' };
  }
  if (priority === 'medium') {
    return { icon: <Users size={16} />, color: 'var(--severity-medium)', bg: '#FEF3C7' };
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
  critical: { color: 'var(--severity-critical)', bg: '#FEE2E2', label: 'CRITICAL' },
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
    <div
      className="mb-3 overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
      style={{ border: `1px solid ${rec.bg}` }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <div
          className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: rec.bg, color: rec.color }}
        >
          {rec.icon}
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <span
                className="mr-2 rounded text-[9px] font-bold tracking-widest"
                style={{ background: pStyle.bg, color: pStyle.color, padding: '2px 7px' }}
              >
                {pStyle.label}
              </span>
              <span className="text-[13px] font-bold text-slate-800">{rec.title}</span>
            </div>
            {/* Confidence meter */}
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Confidence</span>
              <div className="h-1.5 w-[50px] overflow-hidden rounded-sm bg-slate-100">
                <div className="h-full rounded-sm" style={{ width: `${rec.confidence}%`, background: rec.color }} />
              </div>
              <span className="text-[11px] font-bold" style={{ color: rec.color }}>{rec.confidence}%</span>
            </div>
          </div>
          <p className="mb-2 text-xs leading-[1.6] text-slate-600">{rec.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Brain size={10} /> Source: {rec.source}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 border-none bg-transparent text-xs font-semibold cursor-pointer"
              style={{ color: rec.color }}
            >
              {expanded ? 'Hide' : 'View'} Recommended Actions <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${rec.bg}`, background: rec.bg + '40' }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Recommended Actions</div>
          <div className="flex flex-col gap-1.5">
            {rec.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: rec.color }}
                >
                  {i + 1}
                </div>
                <span className="pt-0.5 text-xs text-slate-700">{action}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onDismiss(rec)}
              disabled={busy}
              className={`w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500 ${
                busy ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
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
      <div className="min-h-full px-5 py-4">
        <CardSkeleton
          count={3}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        />
        <div className="mt-4">
          <TextSkeleton rows={3} title={false} />
        </div>
        <div className="mt-4">
          <TableSkeleton rows={7} columns={4} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-5 py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="mb-0.5 text-xl font-bold text-slate-800">Reports & Decision Support</h1>
        <p className="text-xs text-slate-500">AI-assisted decision support and standardized reporting — TUGON DSS Module</p>
      </div>

      {/* Status messages */}
      {actionError ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-800">
          {actionSuccess}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-4 flex w-fit max-w-full overflow-x-auto rounded-[10px] border border-slate-100 bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
        {[
          { key: 'dss', label: 'Decision Support', icon: <Brain size={14} /> },
          { key: 'templates', label: 'Report Templates', icon: <FileText size={14} /> },
          { key: 'history', label: 'Report History', icon: <FileClock size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-[7px] border-none px-4 py-2 text-xs transition-all duration-150 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary font-bold text-white'
                : 'bg-transparent font-medium text-slate-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* DSS Tab */}
      {activeTab === 'dss' && (
        <div>
          {/* DSS Header */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl px-5 py-4" style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)' }}>
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles size={16} color="#FDE68A" />
                <span className="text-xs font-bold uppercase tracking-wide text-amber-200">AI-Assisted Decision Support</span>
              </div>
              <div className="mb-1 text-base font-bold text-white">TUGON Intelligence Engine</div>
              <div className="text-xs text-blue-300">
                {analysisWindowDays > 0
                  ? `Analyzing ${analysisWindowDays} day${analysisWindowDays > 1 ? 's' : ''} of incident data to surface actionable recommendations.`
                  : 'Waiting for incident data to generate recommendations.'}
              </div>
              <div className="mt-1 text-[11px] text-blue-300">
                Recommendation source: {dssRecommendationSource === 'ai' ? 'AI model' : 'Fallback rules engine'}
              </div>
              <div className="mt-1.5 text-[11px] text-blue-200">
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
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white ${
                dssRefreshing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <RefreshCw size={13} className={dssRefreshing ? 'animate-spin' : ''} />
              {dssRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
          </div>

          {/* Stats row */}
          <div className="mb-4 flex flex-wrap gap-2.5">
            {[
              { label: 'Active Recommendations', value: visibleDssRecommendations.length, color: 'var(--primary)', bg: '#EFF6FF' },
              { label: 'Pending Actions', value: dssActionCount, color: 'var(--severity-medium)', bg: '#FEF3C7' },
              { label: 'Resolved This Week', value: resolvedThisWeek, color: '#059669', bg: '#D1FAE5' },
              { label: 'Avg. Confidence Score', value: `${avgConfidence}%`, color: '#7C3AED', bg: '#EDE9FE' },
            ].map(s => (
              <div key={s.label} className="flex-[1_1_120px] rounded-[10px] border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <div className="mb-0.5 text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
              <Lightbulb size={15} color="var(--severity-medium)" />
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
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-500">
                No live recommendation available yet. Submit or process incidents to unlock DSS insights.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {REPORT_TEMPLATES.map(t => (
              <div key={t.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
                <div className="border-b border-slate-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: t.bg, color: t.color }}
                    >
                      {t.icon}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 text-[13px] font-bold text-slate-800">{t.title}</div>
                      <span
                        className="rounded text-[9px] font-bold uppercase tracking-wide"
                        style={{ background: t.bg, color: t.color, padding: '2px 7px' }}
                      >
                        {t.category}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-[1.5] text-slate-500">{t.description}</p>
                </div>
                <div className="bg-[#FAFBFF] px-4 py-2.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div>
                      <div className="mb-0.5 text-[10px] text-slate-400">Last Generated</div>
                      <div className="text-[11px] font-medium text-slate-600">{latestIncidentTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="mb-0.5 text-[10px] text-slate-400">Frequency</div>
                      <div className="text-[11px] font-medium text-slate-600">{t.frequency}</div>
                    </div>
                  </div>
                  <div className="report-template-actions flex flex-col items-stretch gap-2">
                    <div className="report-template-secondary-actions grid grid-cols-2 gap-2">
                      <button onClick={() => { void handleTemplateDownload(t.id); }} className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-semibold text-primary cursor-pointer">
                        <Download size={14} /> Download
                      </button>
                      <button onClick={() => { void handleTemplatePrint(t.id, t.title); }} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <Printer size={14} /> Print
                      </button>
                    </div>
                    <button
                      onClick={() => handleGenerate(t.id)}
                      disabled={generating === t.id}
                      className={`flex flex-1 items-center justify-center gap-[5px] rounded-lg border-none p-2 text-xs font-semibold ${
                        generating === t.id
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'cursor-pointer text-white'
                      }`}
                      style={generating !== t.id ? { background: t.color } : undefined}
                    >
                      {generating === t.id ? (
                        <><RefreshCw size={12} className="animate-spin" /> Generating...</>
                      ) : (
                        <><FileText size={12} /> Generate New Report</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Template generation history */}
          <div className="mt-3.5 overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <span className="text-[13px] font-bold text-slate-800">Past Generated Template Reports</span>
              <span className="text-[11px] text-slate-500">{templateHistory.length} record{templateHistory.length === 1 ? '' : 's'}</span>
            </div>

            <div className="report-history-table-wrapper overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: 680 }}>
                <thead>
                  <tr className="bg-slate-50">
                    {['Template', 'Generated At', 'Generated By', 'File Name', 'Quick Actions'].map((heading) => (
                      <th key={heading} className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-wide text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templateHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-3 text-slate-500">
                        No generated templates yet. Use any template card above to generate your first report.
                      </td>
                    </tr>
                  ) : templateHistory.map((historyItem) => (
                    <tr key={`${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} className="border-b border-slate-50">
                      <td className="px-3.5 py-[11px] font-semibold text-slate-800">{historyItem.templateName}</td>
                      <td className="whitespace-nowrap px-3.5 py-[11px] text-slate-500">{formatDateTime(historyItem.generatedAt)}</td>
                      <td className="px-3.5 py-[11px] text-slate-500">{historyItem.generatedBy}</td>
                      <td className="px-3.5 py-[11px] text-slate-600">{historyItem.fileName}</td>
                      <td className="px-3.5 py-[11px]">
                        <div className="flex gap-1.5">
                          <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} className="flex items-center gap-1 rounded-md border-none bg-blue-50 px-2.5 py-[5px] text-[11px] font-semibold text-primary cursor-pointer">
                            <Download size={11} /> Download
                          </button>
                          <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-[5px] text-[11px] font-semibold text-slate-700 cursor-pointer">
                            <Printer size={11} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-history-mobile-list p-3">
              {templateHistory.length === 0 ? (
                <div className="rounded-[10px] border border-slate-200 px-3.5 py-3 text-xs text-slate-500">
                  No generated templates yet. Use any template card above to generate your first report.
                </div>
              ) : templateHistory.map((historyItem) => (
                <div key={`mobile:${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} className="mb-2.5 rounded-[10px] border border-slate-200 bg-white p-3">
                  <div className="mb-1.5 text-[13px] font-bold text-slate-800">{historyItem.templateName}</div>
                  <div className="mb-2.5 grid gap-1">
                    <div className="text-[11px] text-slate-500"><strong>Generated:</strong> {formatDateTime(historyItem.generatedAt)}</div>
                    <div className="text-[11px] text-slate-500"><strong>By:</strong> {historyItem.generatedBy}</div>
                    <div className="break-words text-[11px] text-slate-500"><strong>File:</strong> {historyItem.fileName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} className="flex items-center justify-center gap-1 rounded-[7px] border-none bg-blue-50 px-2.5 py-2 text-xs font-semibold text-primary cursor-pointer">
                      <Download size={12} /> Download
                    </button>
                    <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} className="flex items-center justify-center gap-1 rounded-[7px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
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
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-[13px] font-bold text-slate-800">Generated Report History</span>
            <button onClick={() => { void handleHistoryExportAll(); }} className="flex items-center gap-[5px] rounded-[7px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
              <Download size={12} /> Export All CSV
            </button>
          </div>
          <div className="report-history-table-wrapper overflow-x-auto">
          <table className="w-full border-collapse text-xs" style={{ minWidth: 760 }}>
            <thead>
              <tr className="bg-slate-50">
                {['Report Name', 'Category', 'Generated', 'Generated By', 'Size', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap border-b border-slate-100 px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportsError ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-3 text-red-700">{reportsError}</td>
                </tr>
              ) : reportsLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-2.5">
                    <TableSkeleton rows={5} columns={6} showHeader={false} className="border-0" />
                  </td>
                </tr>
              ) : recentReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-3 text-slate-500">No report history available.</td>
                </tr>
              ) : recentReports.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-50 transition-colors hover:bg-[#FAFBFF]"
                >
                  <td className="px-3.5 py-[11px] font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText size={14} color="#94A3B8" />
                      {r.name}
                    </div>
                  </td>
                  <td className="px-3.5 py-[11px] text-slate-500">{r.type}</td>
                  <td className="whitespace-nowrap px-3.5 py-[11px] text-slate-500">{r.time}</td>
                  <td className="px-3.5 py-[11px] text-slate-500">{r.by}</td>
                  <td className="px-3.5 py-[11px] text-slate-500">{r.size}</td>
                  <td className="px-3.5 py-[11px]">
                    <div className="flex gap-1.5">
                      <button onClick={() => { void handleHistoryDownload(r.reportId); }} className="flex items-center gap-1 rounded-md border-none bg-blue-50 px-2.5 py-[5px] text-[11px] font-semibold text-primary cursor-pointer">
                        <Download size={11} /> Download
                      </button>
                      <button onClick={() => { void handleHistoryPrint(r.reportId); }} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-[5px] cursor-pointer">
                        <Printer size={12} color="#64748B" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="report-history-mobile-list p-3">
            {reportsError ? (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
                {reportsError}
              </div>
            ) : reportsLoading ? (
              <div className="rounded-[10px] border border-slate-200 px-3 py-2.5">
                <TableSkeleton rows={4} columns={1} showHeader={false} className="border-0" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="rounded-[10px] border border-slate-200 px-3.5 py-3 text-xs text-slate-500">
                No report history available.
              </div>
            ) : recentReports.map((reportItem, index) => (
              <div key={`mobile-report:${reportItem.reportId}:${index}`} className="mb-2.5 rounded-[10px] border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-start gap-2">
                  <FileText size={14} color="#94A3B8" className="mt-0.5 shrink-0" />
                  <div className="text-[13px] font-bold leading-[1.4] text-slate-800">{reportItem.name}</div>
                </div>
                <div className="mb-2.5 grid gap-1">
                  <div className="text-[11px] text-slate-500"><strong>Category:</strong> {reportItem.type}</div>
                  <div className="text-[11px] text-slate-500"><strong>Generated:</strong> {reportItem.time}</div>
                  <div className="text-[11px] text-slate-500"><strong>By:</strong> {reportItem.by}</div>
                  <div className="text-[11px] text-slate-500"><strong>Evidence:</strong> {reportItem.size}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { void handleHistoryDownload(reportItem.reportId); }} className="flex items-center justify-center gap-1 rounded-[7px] border-none bg-blue-50 px-2.5 py-2 text-xs font-semibold text-primary cursor-pointer">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => { void handleHistoryPrint(reportItem.reportId); }} className="flex items-center justify-center gap-1 rounded-[7px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
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
