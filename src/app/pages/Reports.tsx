import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import {
  FileText, Download, Printer,
  TrendingUp, Brain, ShieldAlert,
  CloudRain, Users, MapPin, Sparkles,
  FileBarChart, FilePieChart, FileClock, RefreshCw,
  Lightbulb, ChevronDown,
} from 'lucide-react';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
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

type ReportsTabKey = 'templates' | 'dss' | 'history';

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

  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:20px;background:#f8f9ff;color:#0d1c2e}h2{margin:0 0 12px;font-size:20px;line-height:1.35}pre{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid rgba(197,197,211,0.45);border-radius:12px;padding:14px;line-height:1.55;color:#444651}</style></head><body><h2>${title}</h2><pre>${escaped}</pre></body></html>`);
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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const pStyle = priorityStyle[rec.priority as keyof typeof priorityStyle];

  return (
    <div
      className="mb-3 overflow-hidden bg-white border border-slate-200"
    >
      <div className="flex items-start gap-3 bg-white px-4 py-3.5">
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <span
                className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ color: pStyle.color }}
              >
                {pStyle.label}
              </span>
              <span className="text-[13px] font-bold text-[#0F172A]">{rec.title}</span>
            </div>
            {/* Confidence meter */}
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] text-[var(--outline)]">{t('official.reports.confidence')}</span>
              <div className="h-1.5 w-[50px] overflow-hidden rounded-sm bg-[var(--surface-container-high)]">
                <div className="h-full rounded-sm" style={{ width: `${rec.confidence}%`, background: rec.color }} />
              </div>
              <span className="text-[11px] font-bold" style={{ color: rec.color }}>{rec.confidence}%</span>
            </div>
          </div>
          <p className="mb-2 text-xs leading-[1.6] text-[var(--on-surface-variant)]">{rec.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-[var(--outline)]">
              <Brain size={10} /> {t('official.reports.source')} {rec.source}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 border-none bg-transparent text-xs font-semibold cursor-pointer"
              style={{ color: rec.color }}
            >
              {expanded ? t('official.reports.hideActions') : t('official.reports.viewActions')} <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${rec.bg}`, background: rec.bg + '40' }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">{t('official.reports.recommendedActions')}</div>
          <div className="flex flex-col gap-1.5">
            {rec.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: rec.color }}
                >
                  {i + 1}
                </div>
                <span className="pt-0.5 text-xs text-[var(--on-surface-variant)]">{action}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onDismiss(rec)}
              disabled={busy}
              className={`w-full rounded-lg border-none bg-[var(--surface-container-lowest)] px-3.5 py-2 text-xs font-semibold text-[var(--on-surface-variant)] shadow-[inset_0_0_0_1px_rgba(197,197,211,0.24)] ${
                busy ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
            >
              {busy ? t('official.reports.submitting') : t('official.reports.dismissRecommendation')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportsTabKey>('dss');
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
      return t('official.dashboard.noDataYet');
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
  }, [incidentData, t]);

  if (initialLoadPending) {
    return (
      <div className="min-h-full bg-[var(--surface)] px-5 py-4">
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
    <div className="min-h-full bg-[var(--surface)] px-5 py-4">
      {/* Header */}
      <div className="mb-4 border-b border-slate-200 pb-4">
        <h1 className="mb-0.5 text-xl font-bold text-[#0F172A]">{t('official.reports.pageTitle')}</h1>
        <p className="text-xs text-slate-400">{t('official.reports.pageSubtitle')}</p>
      </div>

      {/* Status messages */}
      {actionError ? (
        <div className="mb-3 rounded-xl bg-[var(--error-container)] px-2.5 py-2 text-xs font-semibold text-[var(--error)]">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="mb-3 rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-4 flex w-fit max-w-full overflow-x-auto border-b border-slate-200">
        {[
          { key: 'dss', label: t('official.reports.decisionSupport'), icon: <Brain size={14} /> },
          { key: 'templates', label: t('official.reports.reportTemplates'), icon: <FileText size={14} /> },
          { key: 'history', label: t('official.reports.reportHistory'), icon: <FileClock size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportsTabKey)}
            className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-none bg-transparent px-4 py-2.5 text-xs font-semibold transition-all duration-150 ${
              activeTab === tab.key
                ? 'border-b-2 border-[#2563EB] text-[#2563EB]'
                : 'text-slate-500 hover:text-[#0F172A]'
            }`}
            style={activeTab === tab.key ? { borderBottom: '2px solid #2563EB', marginBottom: '-1px' } : undefined}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* DSS Tab */}
      {activeTab === 'dss' && (
        <div>
          {/* DSS Header */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 bg-white px-5 py-4 border border-slate-200">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles size={14} color="#2563EB" />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2563EB]">{t('official.reports.aiAssisted')}</span>
              </div>
              <div className="mb-1 text-[15px] font-bold text-[#0F172A]">{t('official.reports.intelligenceEngine')}</div>
              <div className="text-xs text-slate-500">
                {analysisWindowDays > 0
                  ? (analysisWindowDays === 1 ? t('official.reports.analyzingDays', { count: analysisWindowDays }) : t('official.reports.analyzingDaysPlural', { count: analysisWindowDays }))
                  : t('official.reports.waitingData')}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {t('official.reports.recommendationSource', { source: dssRecommendationSource === 'ai' ? t('official.reports.sourceAI') : t('official.reports.sourceFallback') })}
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-400">
                {t('official.reports.lastRefreshed')}{' '}
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
                  : t('official.reports.notYetRefreshed')}
              </div>
            </div>
            <button
              onClick={() => { void reloadReports('dss'); }}
              disabled={dssRefreshing}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded border border-[#2563EB] bg-transparent px-4 py-2 text-xs font-semibold text-[#2563EB] ${
                dssRefreshing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <RefreshCw size={13} className={dssRefreshing ? 'animate-spin' : ''} />
              {dssRefreshing ? t('official.reports.refreshing') : t('official.reports.refreshAnalysis')}
            </button>
          </div>

          {/* Stats row */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('official.reports.activeRecommendations'), value: visibleDssRecommendations.length, color: '#2563EB' },
              { label: t('official.reports.pendingActions'), value: dssActionCount, color: '#D97706' },
              { label: t('official.reports.resolvedThisWeek'), value: resolvedThisWeek, color: '#16A34A' },
              { label: t('official.reports.avgConfidence'), value: `${avgConfidence}%`, color: '#7C3AED' },
            ].map(s => (
              <div key={s.label} className="bg-white px-3.5 py-3 border border-slate-200">
                <div className="mb-0.5 font-mono text-[22px] font-bold text-[#0F172A]">{s.value}</div>
                <div className="text-[11px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-[var(--on-surface)]">
              <Lightbulb size={15} color="var(--severity-medium)" />
              {t('official.reports.currentRecommendations')}
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
              <div className="rounded-2xl bg-[var(--surface-container-lowest)] px-3.5 py-3 text-xs text-[var(--on-surface-variant)] shadow-ambient">
                {t('official.reports.noRecommendations')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {REPORT_TEMPLATES.map(tmpl => (
              <div key={tmpl.id} className="overflow-hidden border border-slate-200 bg-white">
                <div className="px-4 py-3.5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: tmpl.color }}>{tmpl.category}</span>
                  </div>
                  <div className="mb-1 text-[13px] font-bold text-[#0F172A]">{tmpl.title}</div>
                  <p className="text-xs leading-[1.5] text-slate-400">{tmpl.description}</p>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div>
                      <div className="mb-0.5 text-[10px] text-[var(--outline)]">{t('official.reports.lastGenerated')}</div>
                      <div className="text-[11px] font-medium text-[var(--on-surface-variant)]">{latestIncidentTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="mb-0.5 text-[10px] text-[var(--outline)]">{t('official.reports.frequency')}</div>
                      <div className="text-[11px] font-medium text-[var(--on-surface-variant)]">{tmpl.frequency}</div>
                    </div>
                  </div>
                  <div className="report-template-actions flex flex-col items-stretch gap-2">
                    <div className="report-template-secondary-actions grid grid-cols-2 gap-2">
                      <button onClick={() => { void handleTemplateDownload(tmpl.id); }} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-high)] p-2 text-xs font-semibold text-primary">
                        <Download size={14} /> {t('official.reports.download')}
                      </button>
                      <button onClick={() => { void handleTemplatePrint(tmpl.id, tmpl.title); }} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--surface-container-low)] p-2 text-xs font-semibold text-[var(--on-surface-variant)]">
                        <Printer size={14} /> {t('official.reports.print')}
                      </button>
                    </div>
                    <button
                      onClick={() => handleGenerate(tmpl.id)}
                      disabled={generating === tmpl.id}
                      className={`flex flex-1 items-center justify-center gap-[5px] rounded-lg border-none p-2 text-xs font-semibold ${
                        generating === tmpl.id
                          ? 'cursor-not-allowed bg-[var(--surface-container-high)] text-[var(--outline)]'
                          : 'cursor-pointer text-white'
                      }`}
                      style={generating !== tmpl.id ? { background: tmpl.color } : undefined}
                    >
                      {generating === tmpl.id ? (
                        <><RefreshCw size={12} className="animate-spin" /> {t('official.reports.generating')}</>
                      ) : (
                        <><FileText size={12} /> {t('official.reports.generateNew')}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Template generation history */}
          <div className="mt-3.5 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-container-low)] px-4 py-3">
              <span className="text-[13px] font-bold text-[var(--on-surface)]">{t('official.reports.pastTemplates')}</span>
              <span className="text-[11px] text-[var(--outline)]">{templateHistory.length === 1 ? t('official.reports.recordCount', { count: templateHistory.length }) : t('official.reports.recordCountPlural', { count: templateHistory.length })}</span>
            </div>

            <div className="report-history-table-wrapper overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: 680 }}>
                <thead>
                  <tr className="bg-[var(--surface-container-low)]">
                    {[t('official.reports.templateCol'), t('official.reports.generatedAtCol'), t('official.reports.generatedByCol'), t('official.reports.fileNameCol'), t('official.reports.quickActions')].map((heading) => (
                      <th key={heading} className="whitespace-nowrap border-b border-[var(--outline-variant)]/25 px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-wide text-[var(--on-surface-variant)]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templateHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-3 text-[var(--outline)]">
                        {t('official.reports.noTemplatesYet')}
                      </td>
                    </tr>
                  ) : templateHistory.map((historyItem) => (
                    <tr key={`${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} className="border-b border-[var(--outline-variant)]/18">
                      <td className="px-3.5 py-[11px] font-semibold text-[var(--on-surface)]">{historyItem.templateName}</td>
                      <td className="whitespace-nowrap px-3.5 py-[11px] text-[var(--outline)]">{formatDateTime(historyItem.generatedAt)}</td>
                      <td className="px-3.5 py-[11px] text-[var(--outline)]">{historyItem.generatedBy}</td>
                      <td className="px-3.5 py-[11px] text-[var(--on-surface-variant)]">{historyItem.fileName}</td>
                      <td className="px-3.5 py-[11px]">
                        <div className="flex gap-1.5">
                          <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[var(--surface-container-high)] px-2.5 py-[5px] text-[11px] font-semibold text-primary">
                            <Download size={11} /> {t('official.reports.download')}
                          </button>
                          <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[var(--surface-container-low)] px-2 py-[5px] text-[11px] font-semibold text-[var(--on-surface-variant)]">
                            <Printer size={11} /> {t('official.reports.print')}
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
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-3.5 py-3 text-xs text-[var(--on-surface-variant)]">
                  {t('official.reports.noTemplatesYet')}
                </div>
              ) : templateHistory.map((historyItem) => (
                <div key={`mobile:${historyItem.templateId}:${historyItem.generatedAt}:${historyItem.fileName}`} className="mb-2.5 rounded-xl border bg-card p-3">
                  <div className="mb-1.5 text-[13px] font-bold text-[var(--on-surface)]">{historyItem.templateName}</div>
                  <div className="mb-2.5 grid gap-1">
                    <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.generatedLabel')}</strong> {formatDateTime(historyItem.generatedAt)}</div>
                    <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.byLabel')}</strong> {historyItem.generatedBy}</div>
                    <div className="break-words text-[11px] text-[var(--outline)]"><strong>{t('official.reports.fileLabel')}</strong> {historyItem.fileName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { void handleTemplateDownload(historyItem.templateId); }} className="flex cursor-pointer items-center justify-center gap-1 rounded-[7px] border-none bg-[var(--surface-container-high)] px-2.5 py-2 text-xs font-semibold text-primary">
                      <Download size={12} /> {t('official.reports.download')}
                    </button>
                    <button onClick={() => { void handleTemplatePrint(historyItem.templateId, historyItem.templateName); }} className="flex cursor-pointer items-center justify-center gap-1 rounded-[7px] border-none bg-[var(--surface-container-low)] px-2.5 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
                      <Printer size={12} /> {t('official.reports.print')}
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
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between bg-[var(--surface-container-low)] px-4 py-3">
            <span className="text-[13px] font-bold text-[var(--on-surface)]">{t('official.reports.generatedReportHistory')}</span>
            <button onClick={() => { void handleHistoryExportAll(); }} className="flex cursor-pointer items-center gap-[5px] rounded-[7px] border-none bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-semibold text-primary">
              <Download size={12} /> {t('official.reports.exportAllCsv')}
            </button>
          </div>
          <div className="report-history-table-wrapper overflow-x-auto">
          <table className="w-full border-collapse text-xs" style={{ minWidth: 760 }}>
            <thead>
              <tr className="bg-[var(--surface-container-low)]">
                {[t('official.reports.reportNameCol'), t('official.reports.categoryCol'), t('official.reports.generatedCol'), t('official.reports.generatedByCol'), t('official.reports.sizeCol'), t('official.reports.actionsCol')].map(h => (
                  <th key={h} className="whitespace-nowrap border-b border-[var(--outline-variant)]/25 px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-wide text-[var(--on-surface-variant)]">{h}</th>
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
                  <td colSpan={6} className="px-3.5 py-3 text-[var(--outline)]">{t('official.reports.noHistoryAvailable')}</td>
                </tr>
              ) : recentReports.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--outline-variant)]/18 transition-colors odd:bg-[var(--surface-container-lowest)] even:bg-[var(--surface-container-low)]/55 hover:bg-[var(--surface-container-high)]/45"
                >
                  <td className="px-3.5 py-[11px] font-medium text-[var(--on-surface)]">
                    <div className="flex items-center gap-2">
                      <FileText size={14} color="#94A3B8" />
                      {r.name}
                    </div>
                  </td>
                  <td className="px-3.5 py-[11px] text-[var(--outline)]">{r.type}</td>
                  <td className="whitespace-nowrap px-3.5 py-[11px] text-[var(--outline)]">{r.time}</td>
                  <td className="px-3.5 py-[11px] text-[var(--outline)]">{r.by}</td>
                  <td className="px-3.5 py-[11px] text-[var(--outline)]">{r.size}</td>
                  <td className="px-3.5 py-[11px]">
                    <div className="flex gap-1.5">
                      <button onClick={() => { void handleHistoryDownload(r.reportId); }} className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[var(--surface-container-high)] px-2.5 py-[5px] text-[11px] font-semibold text-primary">
                        <Download size={11} /> {t('official.reports.download')}
                      </button>
                      <button aria-label={t('official.reports.print')} title={t('official.reports.print')} onClick={() => { void handleHistoryPrint(r.reportId); }} className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[var(--surface-container-low)] px-2 py-[5px]">
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
              <div className="rounded-2xl bg-[var(--error-container)] px-3.5 py-3 text-xs text-[var(--error)]">
                {reportsError}
              </div>
            ) : reportsLoading ? (
              <div className="rounded-2xl bg-[var(--surface-container-low)] px-3 py-2.5">
                <TableSkeleton rows={4} columns={1} showHeader={false} className="border-0" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="rounded-2xl bg-[var(--surface-container-low)] px-3.5 py-3 text-xs text-[var(--on-surface-variant)]">
                {t('official.reports.noHistoryAvailable')}
              </div>
            ) : recentReports.map((reportItem, index) => (
              <div key={`mobile-report:${reportItem.reportId}:${index}`} className="mb-2.5 rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-start gap-2">
                  <FileText size={14} color="#94A3B8" className="mt-0.5 shrink-0" />
                  <div className="text-[13px] font-bold leading-[1.4] text-[var(--on-surface)]">{reportItem.name}</div>
                </div>
                <div className="mb-2.5 grid gap-1">
                  <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.categoryLabel')}</strong> {reportItem.type}</div>
                  <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.generatedLabel')}</strong> {reportItem.time}</div>
                  <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.byLabel')}</strong> {reportItem.by}</div>
                  <div className="text-[11px] text-[var(--outline)]"><strong>{t('official.reports.evidenceLabel')}</strong> {reportItem.size}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { void handleHistoryDownload(reportItem.reportId); }} className="flex cursor-pointer items-center justify-center gap-1 rounded-[7px] border-none bg-[var(--surface-container-high)] px-2.5 py-2 text-xs font-semibold text-primary">
                    <Download size={12} /> {t('official.reports.download')}
                  </button>
                  <button onClick={() => { void handleHistoryPrint(reportItem.reportId); }} className="flex cursor-pointer items-center justify-center gap-1 rounded-[7px] border-none bg-[var(--surface-container-low)] px-2.5 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
                    <Printer size={12} /> {t('official.reports.print')}
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


