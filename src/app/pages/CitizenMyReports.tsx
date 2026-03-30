import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '../i18n';
import {
  Search, X, ChevronRight,
  MapPin, Clock, FileText, User, Calendar, Camera, Mic,
  Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Droplets, Car, Activity, Zap, CheckCircle2,
  MessageSquare, Phone, RefreshCw, Eye, XCircle, Ban,
  ChevronDown, SlidersHorizontal, Info,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { RoleHomeLogo } from '../components/RoleHomeLogo';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import {
  citizenReportsApi,
  type ApiCitizenReport,
  type ApiTicketStatus,
} from '../services/citizenReportsApi';
import type { ReportCategory } from '../data/reportTaxonomy';
import { clearAuthSession, getAuthSession } from '../utils/authSession';

export type CitizenReportStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'unresolvable';

export type CitizenReportType =
  | 'pollution' | 'noise' | 'crime' | 'road_hazard'
  | 'flood' | 'accident' | 'medical' | 'infrastructure' | 'other';

export interface TimelineEvent {
  status: CitizenReportStatus | 'created';
  label: string;
  description: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  note?: string;
}

export interface ReportEvidence {
  id: string;
  kind: 'photo' | 'audio';
  publicUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface CitizenReport {
  id: string;
  type: CitizenReportType;
  status: CitizenReportStatus;
  location: string;
  barangay: string;
  district: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedCount: string | null;
  submittedAt: string;
  updatedAt: string;
  hasPhotos: boolean;
  photoCount: number;
  hasAudio: boolean;
  assignedOfficer: string | null;
  assignedUnit: string | null;
  resolutionNote: string | null;
  evidence: ReportEvidence[];
  timeline: TimelineEvent[];
}

function mapApiStatus(status: ApiTicketStatus): CitizenReportStatus {
  if (status === 'Submitted') return 'submitted';
  if (status === 'Under Review') return 'under_review';
  if (status === 'In Progress') return 'in_progress';
  if (status === 'Resolved') return 'resolved';
  if (status === 'Closed') return 'closed';
  return 'unresolvable';
}

function mapApiType(category: ReportCategory): CitizenReportType {
  if (category === 'Pollution') return 'pollution';
  if (category === 'Noise') return 'noise';
  if (category === 'Crime') return 'crime';
  if (category === 'Road Hazard') return 'road_hazard';
  return 'other';
}

function mapApiReport(report: ApiCitizenReport): CitizenReport {
  return {
    id: report.id,
    type: mapApiType(report.category),
    status: mapApiStatus(report.status),
    location: report.location,
    barangay: report.barangay,
    district: report.district,
    description: report.description,
    severity: report.severity,
    affectedCount: report.affectedCount,
    submittedAt: report.submittedAt,
    updatedAt: report.updatedAt,
    hasPhotos: report.hasPhotos,
    photoCount: report.photoCount,
    hasAudio: report.hasAudio,
    assignedOfficer: report.assignedOfficer,
    assignedUnit: report.assignedUnit,
    resolutionNote: report.resolutionNote,
    evidence: report.evidence ?? [],
    timeline: report.timeline.map((item) => ({
      status: item.status === 'Created' ? 'created' : mapApiStatus(item.status),
      label: item.label,
      description: item.description,
      timestamp: item.timestamp,
      actor: item.actor,
      actorRole: item.actorRole,
      note: item.note,
    })),
  };
}

export const citizenStatusConfig: Record<CitizenReportStatus, {
  label: string; color: string; bg: string; border: string;
  dotColor: string; icon: React.FC<{ size?: number }>; step: number;
  filterGroup: 'active' | 'resolved';
  description: string;
}> = {
  submitted: {
    label: 'Submitted', color: 'var(--primary)', bg: '#EFF6FF', border: '#BFDBFE',
    dotColor: '#3B82F6', icon: FileText, step: 1, filterGroup: 'active',
    description: 'Your report has been received by the system.',
  },
  under_review: {
    label: 'Under Review', color: 'var(--severity-medium)', bg: '#FFFBEB', border: '#FDE68A',
    dotColor: '#F59E0B', icon: Eye, step: 2, filterGroup: 'active',
    description: 'Barangay officials are reviewing your report.',
  },
  in_progress: {
    label: 'In Progress', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4',
    dotColor: '#14B8A6', icon: RefreshCw, step: 3, filterGroup: 'active',
    description: 'Responders have been dispatched to the scene.',
  },
  resolved: {
    label: 'Resolved', color: '#059669', bg: '#ECFDF5', border: '#6EE7B7',
    dotColor: '#10B981', icon: CheckCircle2, step: 4, filterGroup: 'resolved',
    description: 'The incident has been successfully resolved.',
  },
  closed: {
    label: 'Closed', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1',
    dotColor: '#94A3B8', icon: XCircle, step: 4, filterGroup: 'resolved',
    description: 'This case has been officially closed.',
  },
  unresolvable: {
    label: 'Unresolvable', color: 'var(--severity-critical)', bg: '#FEF2F2', border: '#FECACA',
    dotColor: '#EF4444', icon: Ban, step: 4, filterGroup: 'resolved',
    description: 'This report could not be resolved at this time.',
  },
};

const typeConfig: Record<CitizenReportType, {
  label: string; color: string; bg: string; icon: React.FC<{ size?: number }>;
}> = {
  pollution:     { label: 'Pollution',      color: '#0F766E', bg: '#CCFBF1', icon: Wind },
  noise:         { label: 'Noise',          color: '#7C3AED', bg: '#EDE9FE', icon: Volume2 },
  crime:         { label: 'Crime',          color: 'var(--primary)', bg: '#DBEAFE', icon: AlertCircle },
  road_hazard:   { label: 'Road Hazard',    color: 'var(--severity-medium)', bg: '#FEF3C7', icon: AlertTriangle },
  flood:         { label: 'Flood',          color: '#0369A1', bg: '#E0F2FE', icon: Droplets },
  accident:      { label: 'Accident',       color: '#C2410C', bg: '#FFEDD5', icon: Car },
  medical:       { label: 'Medical',        color: 'var(--severity-critical)', bg: '#FEE2E2', icon: Activity },
  infrastructure:{ label: 'Infrastructure', color: '#92400E', bg: '#FEF3C7', icon: Zap },
  other:         { label: 'Other',          color: '#475569', bg: '#F1F5F9', icon: MoreHorizontal },
};

const statusToneClass: Record<CitizenReportStatus, {
  badge: string;
  footer: string;
  text: string;
}> = {
  submitted: {
    badge: 'bg-blue-50 border-blue-200 text-primary',
    footer: 'bg-blue-50 border-t border-blue-200',
    text: 'text-primary',
  },
  under_review: {
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    footer: 'bg-amber-50 border-t border-amber-200',
    text: 'text-amber-700',
  },
  in_progress: {
    badge: 'bg-teal-50 border-teal-200 text-teal-700',
    footer: 'bg-teal-50 border-t border-teal-200',
    text: 'text-teal-700',
  },
  resolved: {
    badge: 'bg-emerald-50 border-emerald-300 text-emerald-600',
    footer: 'bg-emerald-50 border-t border-emerald-300',
    text: 'text-emerald-600',
  },
  closed: {
    badge: 'bg-slate-50 border-slate-300 text-slate-600',
    footer: 'bg-slate-50 border-t border-slate-300',
    text: 'text-slate-600',
  },
  unresolvable: {
    badge: 'bg-red-50 border-red-200 text-severity-critical',
    footer: 'bg-red-50 border-t border-red-200',
    text: 'text-severity-critical',
  },
};

const typeToneClass: Record<CitizenReportType, {
  iconChip: string;
  detailHeader: string;
  detailIcon: string;
  fieldIcon: string;
}> = {
  pollution: {
    iconChip: 'bg-teal-100 text-teal-700',
    detailHeader: 'border-b-[3px] border-b-teal-700',
    detailIcon: 'bg-teal-100 text-teal-700 shadow-[0_2px_10px_rgba(15,118,110,0.18)]',
    fieldIcon: 'text-teal-700',
  },
  noise: {
    iconChip: 'bg-violet-100 text-violet-700',
    detailHeader: 'border-b-[3px] border-b-violet-700',
    detailIcon: 'bg-violet-100 text-violet-700 shadow-[0_2px_10px_rgba(124,58,237,0.18)]',
    fieldIcon: 'text-violet-700',
  },
  crime: {
    iconChip: 'bg-blue-100 text-primary',
    detailHeader: 'border-b-[3px] border-b-primary',
    detailIcon: 'bg-blue-100 text-primary shadow-[0_2px_10px_rgba(30,58,138,0.18)]',
    fieldIcon: 'text-primary',
  },
  road_hazard: {
    iconChip: 'bg-amber-100 text-amber-700',
    detailHeader: 'border-b-[3px] border-b-amber-700',
    detailIcon: 'bg-amber-100 text-amber-700 shadow-[0_2px_10px_rgba(180,115,10,0.2)]',
    fieldIcon: 'text-amber-700',
  },
  flood: {
    iconChip: 'bg-sky-100 text-sky-700',
    detailHeader: 'border-b-[3px] border-b-sky-700',
    detailIcon: 'bg-sky-100 text-sky-700 shadow-[0_2px_10px_rgba(3,105,161,0.2)]',
    fieldIcon: 'text-sky-700',
  },
  accident: {
    iconChip: 'bg-orange-100 text-orange-700',
    detailHeader: 'border-b-[3px] border-b-orange-700',
    detailIcon: 'bg-orange-100 text-orange-700 shadow-[0_2px_10px_rgba(194,65,12,0.2)]',
    fieldIcon: 'text-orange-700',
  },
  medical: {
    iconChip: 'bg-red-100 text-severity-critical',
    detailHeader: 'border-b-[3px] border-b-severity-critical',
    detailIcon: 'bg-red-100 text-severity-critical shadow-[0_2px_10px_rgba(185,28,28,0.2)]',
    fieldIcon: 'text-severity-critical',
  },
  infrastructure: {
    iconChip: 'bg-amber-100 text-amber-800',
    detailHeader: 'border-b-[3px] border-b-amber-800',
    detailIcon: 'bg-amber-100 text-amber-800 shadow-[0_2px_10px_rgba(146,64,14,0.2)]',
    fieldIcon: 'text-amber-800',
  },
  other: {
    iconChip: 'bg-slate-100 text-slate-600',
    detailHeader: 'border-b-[3px] border-b-slate-600',
    detailIcon: 'bg-slate-100 text-slate-600 shadow-[0_2px_10px_rgba(71,85,105,0.2)]',
    fieldIcon: 'text-slate-600',
  },
};

const severityToneClass: Record<CitizenReport['severity'], string> = {
  critical: 'bg-red-100 text-severity-critical',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-600',
};

const timelineToneClass: Record<string, {
  iconShell: string;
  latestBadge: string;
  actorBadge: string;
}> = {
  created: {
    iconShell: 'bg-slate-100 border-2 border-slate-300 text-slate-600',
    latestBadge: 'bg-slate-100 text-slate-600',
    actorBadge: 'bg-slate-100 text-slate-600',
  },
  submitted: {
    iconShell: 'bg-blue-50 border-2 border-blue-200 text-primary',
    latestBadge: 'bg-blue-50 text-primary',
    actorBadge: 'bg-blue-50 text-primary',
  },
  under_review: {
    iconShell: 'bg-amber-50 border-2 border-amber-200 text-amber-700',
    latestBadge: 'bg-amber-50 text-amber-700',
    actorBadge: 'bg-amber-50 text-amber-700',
  },
  in_progress: {
    iconShell: 'bg-teal-50 border-2 border-teal-200 text-teal-700',
    latestBadge: 'bg-teal-50 text-teal-700',
    actorBadge: 'bg-teal-50 text-teal-700',
  },
  resolved: {
    iconShell: 'bg-emerald-50 border-2 border-emerald-200 text-emerald-600',
    latestBadge: 'bg-emerald-50 text-emerald-600',
    actorBadge: 'bg-emerald-50 text-emerald-600',
  },
  closed: {
    iconShell: 'bg-slate-50 border-2 border-slate-300 text-slate-600',
    latestBadge: 'bg-slate-50 text-slate-600',
    actorBadge: 'bg-slate-50 text-slate-600',
  },
  unresolvable: {
    iconShell: 'bg-red-50 border-2 border-red-200 text-severity-critical',
    latestBadge: 'bg-red-50 text-severity-critical',
    actorBadge: 'bg-red-50 text-severity-critical',
  },
};

/* ────────────────────────────────────────────────────────────────────
   API LOADED REPORTS
──────────────────────────────────────────────────────────────────── */
const MY_REPORTS: CitizenReport[] = [];

/* ────────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
function timeAgo(iso: string) {
  const diff = Date.now() - parseTimestamp(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function parseTimestamp(value: string) {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function extractReportSequence(reportId: string) {
  const parts = reportId.split('-');
  const raw = parts[parts.length - 1] ?? '';
  const seq = Number.parseInt(raw, 10);
  return Number.isFinite(seq) ? seq : 0;
}

/* ────────────────────────────────────────────────────────────────────
   CITIZEN STATUS BADGE - 6 statuses
──────────────────────────────────────────────────────────────────── */
function CitizenStatusBadge({ status, size = 'md' }: { status: CitizenReportStatus; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = citizenStatusConfig[status];
  const Icon = cfg.icon;
  const sizes: Record<'sm' | 'md' | 'lg', { className: string; iconSize: number }> = {
    sm: { className: 'gap-1 rounded-[6px] px-[8px] py-[3px] text-[10px]', iconSize: 10 },
    md: { className: 'gap-[5px] rounded-[7px] px-[10px] py-1 text-[11px]', iconSize: 11 },
    lg: { className: 'gap-[6px] rounded-[10px] px-[14px] py-[7px] text-[13px]', iconSize: 14 },
  };
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border-[1.5px] font-bold leading-none tracking-[0.02em] ${statusToneClass[status].badge} ${s.className}`}
    >
      <Icon size={s.iconSize} />
      {cfg.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   WORKFLOW PROGRESS DOTS
──────────────────────────────────────────────────────────────────── */
const WORKFLOW_STEPS: { key: CitizenReportStatus | 'created'; label: string }[] = [
  { key: 'submitted',    label: 'Submitted' },
  { key: 'under_review', label: 'Review' },
  { key: 'in_progress',  label: 'In Progress' },
  { key: 'resolved',     label: 'Done' },
];

function WorkflowProgress({ status }: { status: CitizenReportStatus }) {
  const cfg = citizenStatusConfig[status];
  const currentStep = cfg.step;
  const isTerminal = status === 'resolved' || status === 'closed' || status === 'unresolvable';
  const isFailed = status === 'unresolvable';

  return (
    <div className="flex w-full items-center gap-0">
      {WORKFLOW_STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done  = stepNum < currentStep || (isTerminal && stepNum <= 4);
        const active = stepNum === currentStep && !isTerminal;
        const terminalDoneClass = isFailed
          ? 'bg-red-50 border-severity-critical'
          : 'bg-emerald-50 border-emerald-600';
        const stepToneClassName = isTerminal && stepNum === 4
          ? terminalDoneClass
          : done
            ? 'bg-primary border-primary'
            : active
              ? 'bg-blue-50 border-blue-500'
              : 'bg-slate-100 border-slate-200';

        return (
          <div key={s.key} className="contents">
            <div className="flex flex-1 flex-col items-center gap-[3px]">
              <div
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 transition-all duration-300 ${stepToneClassName}`}
              >
                {(done || (isTerminal && stepNum === 4)) ? (
                  <span className={`text-[9px] ${isTerminal && stepNum === 4 ? (isFailed ? 'text-severity-critical' : 'text-emerald-600') : 'text-white'}`}>
                    {isTerminal && stepNum === 4 ? (isFailed ? 'X' : 'OK') : 'OK'}
                  </span>
                ) : active ? (
                  <div className="h-[7px] w-[7px] rounded-[2px] bg-primary" />
                ) : (
                  <span className="text-[8px] font-bold text-slate-300">{stepNum}</span>
                )}
              </div>
              <span
                className={`text-center text-[8px] leading-[1.2] ${done || active ? 'font-bold text-primary' : 'font-normal text-slate-300'}`}
              >
                {isTerminal && stepNum === 4 ? citizenStatusConfig[status].label : s.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`mb-[14px] h-0.5 flex-1 rounded-[1px] transition-colors duration-300 ${
                  stepNum < currentStep || (isTerminal && stepNum < 4) ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   REPORT CARD
──────────────────────────────────────────────────────────────────── */
function ReportCard({ report, onClick }: { report: CitizenReport; onClick: () => void }) {
  const { t } = useTranslation();
  const tc = typeConfig[report.type];
  const Icon = tc.icon;
  const typeTone = typeToneClass[report.type];
  const statusTone = statusToneClass[report.status];

  return (
    <button
      className="citizen-report-card citizen-report-card-modern relative mb-3 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-left transition-[box-shadow,border-color] duration-200 ease-in-out"
      onClick={onClick}
    >
      <div className="p-[14px] pb-0">
        {/* Top row: ID + Status */}
        <div className="flex items-center justify-between mb-[10px]">
          <div className="flex items-center gap-2">
            <div className={`w-[34px] h-[34px] rounded-[10px] shrink-0 flex items-center justify-center ${typeTone.iconChip}`}>
              <Icon size={17} />
            </div>
            <div>
              <div className="font-extrabold text-[13px] text-slate-900 leading-[1.1]">
                {report.id}
              </div>
              <div className="text-[10px] text-slate-500 mt-[1px] font-medium">
                {tc.label}
              </div>
            </div>
          </div>
          <CitizenStatusBadge status={report.status} size="sm" />
        </div>

        {/* Location */}
        <div className="flex items-start gap-[5px] mb-[7px]">
          <MapPin size={11} color="#94A3B8" className="shrink-0 mt-[1px]" />
          <span className="text-xs text-slate-600 leading-[1.45] flex-1">
            {report.location}, {report.barangay}
          </span>
        </div>

        {/* Description excerpt */}
        <div className="mb-[10px] overflow-hidden text-xs leading-[1.5] text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {report.description}
        </div>

        {/* Date + evidence chips */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1">
            <Calendar size={10} color="#94A3B8" />
            <span className="text-[10px] text-slate-400">{formatDate(report.submittedAt)}</span>
          </div>
          <span className="text-slate-300 text-[10px]"> - </span>
          <span className="text-[10px] text-slate-400">{timeAgo(report.submittedAt)}</span>
          {report.hasPhotos && (
            <span className="contents">
              <span className="text-slate-300 text-[10px]"> - </span>
              <div className="flex items-center gap-[3px] bg-slate-100 rounded-[6px] px-[6px] py-[2px]">
                <Camera size={9} color="#64748B" />
                <span className="text-[9px] text-slate-500 font-semibold">{report.photoCount}</span>
              </div>
            </span>
          )}
          {report.hasAudio && (
            <span className="contents">
              <span className="text-slate-300 text-[10px]"> - </span>
              <div className="flex items-center gap-[3px] bg-slate-100 rounded-[6px] px-[6px] py-[2px]">
                <Mic size={9} color="#64748B" />
                <span className="text-[9px] text-slate-500 font-semibold">{t('citizen.myReports.audioSection')}</span>
              </div>
            </span>
          )}
        </div>
      </div>

      {/* Workflow progress strip */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 pt-[10px] pb-3">
        <WorkflowProgress status={report.status} />
      </div>

      {/* View details footer */}
      <div className={`flex items-center justify-between px-[14px] py-[10px] ${statusTone.footer}`}>
        <span className={`text-[11px] font-semibold ${statusTone.text}`}>
          {citizenStatusConfig[report.status].description}
        </span>
        <div className={`flex items-center gap-[3px] ${statusTone.text}`}>
          <span className="text-[11px] font-bold">{t('citizen.myReports.detailsCardCta')}</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </button>
  );
}

function DetailView({
  report,
  onClose,
  onCancelReport,
  cancelling = false,
  cancelError = null,
}: {
  report: CitizenReport;
  onClose: () => void;
  onCancelReport?: (reportId: string) => Promise<void> | void;
  cancelling?: boolean;
  cancelError?: string | null;
}) {
  const { t } = useTranslation();
  const tc = typeConfig[report.type];
  const typeTone = typeToneClass[report.type];
  const TypeIcon = tc.icon;
  const photoEvidence = report.evidence.filter((item) => item.kind === 'photo');
  const audioEvidence = report.evidence.filter((item) => item.kind === 'audio');
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (confirmCancelOpen) {
        setConfirmCancelOpen(false);
        return;
      }

      if (previewPhotoIndex !== null) {
        setPreviewPhotoIndex(null);
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [confirmCancelOpen, onClose, previewPhotoIndex]);

  const timelineIconMap: Record<string, React.ReactNode> = {
    created:      <FileText size={13} />,
    submitted:    <FileText size={13} />,
    under_review: <Eye size={13} />,
    in_progress:  <RefreshCw size={13} />,
    resolved:     <CheckCircle2 size={13} />,
    closed:       <XCircle size={13} />,
    unresolvable: <Ban size={13} />,
  };

  const hasPreviewableEvidence = photoEvidence.length > 0 || audioEvidence.length > 0;
  const selectedPhoto = previewPhotoIndex !== null ? photoEvidence[previewPhotoIndex] : null;
  const canCancel = report.status === 'submitted' && Boolean(onCancelReport);

  useEffect(() => {
    if (!canCancel) {
      setConfirmCancelOpen(false);
    }
  }, [canCancel]);

  return (
    <div className="citizen-report-modal fixed inset-0 z-[200] flex flex-col">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.55)] backdrop-blur-[3px]"
      />

      <article className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[92vh] max-w-[960px] flex-col overflow-hidden rounded-t-[14px] bg-[#F8FAFC] [animation:slideUp_0.32s_cubic-bezier(0.4,0,0.2,1)]">
        <header className="bg-white pt-[10px] pb-0 flex flex-col items-center border-b border-slate-100 shrink-0">
          <div className="w-[38px] h-1 rounded-[2px] bg-slate-200 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-[14px]">
            <div>
              <div className="font-extrabold text-base text-slate-900">{t('citizen.myReports.detailsTitle')}</div>
              <div className="text-[11px] text-slate-400 mt-[1px]">{report.id}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="w-[34px] h-[34px] rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <section className="mb-4 border-[1.5px] border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
            {/* Colored header */}
            <div className={`flex items-start gap-[14px] px-[18px] pt-[18px] pb-[14px] ${typeTone.detailHeader}`}>
              <div className={`w-[52px] h-[52px] rounded-[15px] shrink-0 flex items-center justify-center ${typeTone.detailIcon}`}>
                <TypeIcon size={26} />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-[18px] text-slate-900 leading-[1.15] mb-1">
                  {t('citizen.myReports.incidentHeading', { type: tc.label })}
                </div>
                <div className="flex items-center gap-[6px] flex-wrap">
                  <CitizenStatusBadge status={report.status} size="md" />
                  <span className={`rounded-[6px] px-[8px] py-[3px] text-[10px] font-bold uppercase tracking-[0.06em] ${severityToneClass[report.severity]}`}>
                    {t('citizen.myReports.severityBadge', { severity: report.severity })}
                  </span>
                </div>
              </div>
            </div>

            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 px-[18px] pt-1 pb-[14px]">
              {[
                { icon: <FileText size={13} />, label: t('citizen.myReports.fieldTicketId'), value: report.id },
                { icon: <MapPin size={13} />, label: t('citizen.myReports.location'), value: `${report.location}, ${report.barangay}, ${report.district}` },
                { icon: <Calendar size={13} />, label: t('citizen.myReports.fieldDateSubmitted'), value: formatDateTime(report.submittedAt) },
                { icon: <Clock size={13} />, label: t('citizen.myReports.fieldLastUpdated'), value: formatDateTime(report.updatedAt) },
                ...(report.assignedOfficer ? [{ icon: <User size={13} />, label: t('citizen.myReports.fieldAssignedOfficer'), value: `${report.assignedOfficer} - ${report.assignedUnit}` }] : []),
                ...(report.affectedCount ? [{ icon: <AlertTriangle size={13} />, label: t('citizen.myReports.fieldAffected'), value: t('citizen.myReports.affectedValue', { count: report.affectedCount }) }] : []),
              ].map(({ icon, label, value }) => (
                <div key={label} className="border border-slate-200 rounded-xl bg-slate-50 px-3 py-[10px]">
                  <dt className="flex items-center gap-[6px] mb-1 text-[10px] text-slate-500 font-bold tracking-[0.04em] uppercase">
                    <span className={typeTone.fieldIcon}>{icon}</span>
                    {label}
                  </dt>
                  <dd className="m-0 text-[13px] text-[#0F172A] leading-[1.5] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <MessageSquare size={14} color={tc.color} />
              <span className="font-bold text-[13px] text-slate-900">{t('citizen.myReports.description')}</span>
            </div>
            <p className="text-[13px] text-slate-600 leading-[1.7] m-0">{report.description}</p>
          </section>

          {canCancel && (
            <section className="mb-4 rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] px-[14px] py-3">
              <p className="m-0 text-xs text-[#78350F] leading-[1.6]">
                {t('citizen.myReports.cancelNotice')}
              </p>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  if (!onCancelReport) {
                    return;
                  }
                  setConfirmCancelOpen(true);
                }}
                className={`mt-[10px] rounded-[10px] border-none px-[14px] py-[9px] text-xs font-bold text-white ${
                  cancelling
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'cursor-pointer bg-severity-critical'
                }`}
              >
                {cancelling ? t('citizen.myReports.cancelling') : t('citizen.myReports.cancelBtn')}
              </button>
              {cancelError && (
                <p className="mt-2 mb-0 text-[11px] text-red-700 leading-[1.5]">{cancelError}</p>
              )}
            </section>
          )}

          {(report.hasPhotos || report.hasAudio) && (
            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
              <div className="font-bold text-[13px] text-slate-900 mb-3">
                {t('citizen.myReports.evidenceAttached')}
              </div>
              <div className={`flex gap-2 flex-wrap ${hasPreviewableEvidence ? 'mb-3' : ''}`}>
                {report.hasPhotos ? (
                  <div className="flex items-center gap-[6px] bg-blue-50 rounded-[10px] px-3 py-2 border border-[#BFDBFE]">
                    <Camera size={14} color="var(--primary)" />
                    <span className="text-xs text-primary font-bold">{report.photoCount > 1 ? t('citizen.myReports.photoCountPlural', { count: report.photoCount }) : t('citizen.myReports.photoCount', { count: report.photoCount })}</span>
                  </div>
                ) : null}
                {report.hasAudio ? (
                  <div className="flex items-center gap-[6px] bg-[#EDE9FE] rounded-[10px] px-3 py-2 border border-[#DDD6FE]">
                    <Mic size={14} color="#7C3AED" />
                    <span className="text-xs text-[#7C3AED] font-bold">{t('citizen.myReports.voiceRecording')}</span>
                  </div>
                ) : null}
              </div>

              {photoEvidence.length > 0 && (
                <section className={audioEvidence.length > 0 ? 'mb-3' : ''}>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">{t('citizen.myReports.photosSection')}</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                    {photoEvidence.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreviewPhotoIndex(index)}
                        className="border border-[#DBEAFE] rounded-[10px] p-0 overflow-hidden bg-blue-50 cursor-pointer"
                      >
                        <img
                          src={item.publicUrl}
                          alt={item.fileName}
                          className="block h-[90px] w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {audioEvidence.length > 0 && (
                <section>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">{t('citizen.myReports.audioSection')}</div>
                  <div className="grid gap-2">
                    {audioEvidence.map((item) => (
                      <article key={item.id} className="border border-slate-200 rounded-[10px] px-3 py-[10px] bg-slate-50">
                        <div className="text-[11px] text-slate-600 mb-[6px] font-semibold">{item.fileName}</div>
                        <audio controls preload="metadata" src={item.publicUrl} className="w-full" />
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!hasPreviewableEvidence && (
                <p className="m-0 text-xs text-slate-400 leading-[1.6]">
                  {t('citizen.myReports.evidenceUnavailable')}
                </p>
              )}
            </section>
          )}

          {report.resolutionNote && (
            <section
              className={`mb-4 rounded-xl border-[1.5px] p-4 ${
                report.status === 'unresolvable'
                  ? 'border-[#FECACA] bg-[#FEF2F2]'
                  : 'border-[#6EE7B7] bg-[#ECFDF5]'
              }`}
            >
              <div className="flex items-center gap-[7px] mb-2">
                {report.status === 'unresolvable'
                  ? <Ban size={14} color="var(--severity-critical)" />
                  : <CheckCircle2 size={14} color="#059669" />
                }
                <span
                  className={`text-[13px] font-bold ${
                    report.status === 'unresolvable' ? 'text-severity-critical' : 'text-emerald-600'
                  }`}
                >
                  {report.status === 'unresolvable' ? t('citizen.myReports.unresolvableReason') : t('citizen.myReports.resolutionSummary')}
                </span>
              </div>
              <p
                className={`m-0 text-[13px] leading-[1.65] ${
                  report.status === 'unresolvable' ? 'text-[#7F1D1D]' : 'text-[#065F46]'
                }`}
              >
                {report.resolutionNote}
              </p>
              {report.status === 'unresolvable' && (
                <button className="mt-3 flex cursor-pointer items-center gap-[6px] rounded-lg border-none bg-severity-critical px-[14px] py-2 text-xs font-bold text-white">
                  <Phone size={12} /> {t('citizen.myReports.callCityVet')}
                </button>
              )}
            </section>
          )}

          <section className="mb-2 rounded-xl border border-slate-200 bg-white p-[18px] shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
            <div className="font-bold text-[13px] text-slate-900 mb-4 flex items-center gap-[7px]">
              <Clock size={14} color="var(--primary)" /> {t('citizen.myReports.timeline')}
            </div>

            <ul className="m-0 p-0 list-none">
            {report.timeline.map((event, idx) => {
              const isLast = idx === report.timeline.length - 1;
              const timelineTone = timelineToneClass[event.status] ?? timelineToneClass['submitted'];
              return (
                <li key={`${event.timestamp}-${idx}`} className="flex gap-3 relative">
                  {!isLast && (
                    <div className="absolute bottom-[-4px] left-[15px] top-[30px] z-0 w-[2px] bg-slate-200" />
                  )}

                  <div className={`w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center z-[1] relative ${timelineTone.iconShell}`}>
                    {timelineIconMap[event.status] ?? <FileText size={13} />}
                  </div>

                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    <div className="flex items-start justify-between gap-2 mb-[2px]">
                      <div className="font-bold text-[13px] text-slate-900 leading-[1.2]">
                        {event.label}
                      </div>
                      {isLast && (
                        <span className={`shrink-0 rounded-[7px] px-2 py-[2px] text-[9px] font-extrabold tracking-[0.06em] uppercase ${timelineTone.latestBadge}`}>
                          {t('citizen.myReports.timelineLatest')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-1 leading-[1.5]">
                      {event.description}
                    </div>
                    {event.note && event.note !== event.description && (
                      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-[10px] py-[7px] text-[11px] text-[#78350F] leading-[1.5] mb-1">
                        {t('citizen.myReports.timelineNote', { note: event.note })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <time className="text-[10px] text-slate-400 [font-variant-numeric:tabular-nums]">
                        {formatDateTime(event.timestamp)}
                      </time>
                      <span className="text-slate-200 text-[10px]"> - </span>
                      <span className={`text-[10px] font-semibold rounded-[4px] px-[6px] py-[1px] ${timelineTone.actorBadge}`}>
                        {event.actor} - {event.actorRole}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          </section>

          <section className="bg-[#FEF2F2] rounded-[14px] px-[14px] py-3 border border-[#FECACA] flex gap-2 items-start">
            <Info size={14} color="var(--severity-critical)" className="shrink-0 mt-[1px]" />
            <p className="text-xs text-[#7F1D1D] leading-[1.6] m-0">
              {t('citizen.myReports.emergencyNotice')}
            </p>
          </section>
        </main>
      </article>

      {confirmCancelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm report cancellation"
          className="fixed inset-0 z-[230] flex items-center justify-center p-4"
        >
          <div
            onClick={() => {
              if (!cancelling) {
                setConfirmCancelOpen(false);
              }
            }}
            className="absolute inset-0 bg-[rgba(15,23,42,0.65)]"
          />

          <article
            className="relative w-[min(460px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_rgba(15,23,42,0.28)]"
          >
            <header className="bg-primary text-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={16} color="#FDE68A" />
                <span className="text-sm font-bold">{t('citizen.myReports.confirmCancelTitle')}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!cancelling) {
                    setConfirmCancelOpen(false);
                  }
                }}
                disabled={cancelling}
                className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.12)] text-white ${
                  cancelling ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                aria-label="Close confirmation dialog"
              >
                <X size={14} />
              </button>
            </header>

            <div className="px-4 pt-[14px] pb-[10px]">
              <p className="m-0 text-[13px] text-[#334155] leading-[1.65]">
                {t('citizen.myReports.confirmCancelBody')}
              </p>
            </div>

            <footer className="px-4 pb-[14px] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
                className={`h-[38px] rounded-[10px] border border-slate-300 bg-slate-50 px-[14px] text-xs font-bold text-slate-600 ${
                  cancelling ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {t('citizen.myReports.keepTicket')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!onCancelReport) {
                    return;
                  }
                  void onCancelReport(report.id);
                  setConfirmCancelOpen(false);
                }}
                disabled={cancelling}
                className={`h-[38px] rounded-[10px] border-none px-[14px] text-xs font-bold text-white ${
                  cancelling
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'cursor-pointer bg-severity-critical'
                }`}
              >
                {cancelling ? t('citizen.myReports.cancelling') : t('citizen.myReports.yesCancelTicket')}
              </button>
            </footer>
          </article>
        </div>
      )}

      {selectedPhoto && (
        <div
          className="citizen-photo-preview-overlay fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(2,6,23,0.82)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPreviewPhotoIndex(null)}
        >
          <div
            className="citizen-photo-preview-stage flex max-h-full w-full max-w-[980px] flex-col gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center text-slate-200 text-xs">
              <strong>{selectedPhoto.fileName}</strong>
              <button
                type="button"
                className="citizen-photo-preview-close bg-[#0F172A] border border-[#334155] text-slate-200 rounded-lg px-[10px] py-1 cursor-pointer"
                onClick={() => setPreviewPhotoIndex(null)}
              >
                {t('citizen.myReports.photoPreviewClose')}
              </button>
            </div>
            <img
              className="citizen-photo-preview-image max-h-[80vh] w-full rounded-xl bg-[#020617] object-contain"
              src={selectedPhoto.publicUrl}
              alt={selectedPhoto.fileName}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ filter, query }: { filter: string; query: string }) {
  const { t } = useTranslation();
  const headingText = query
    ? t('citizen.myReports.emptyNoResults')
    : filter === 'active'
      ? t('citizen.myReports.emptyActiveLabel')
      : filter === 'resolved'
        ? t('citizen.myReports.emptyResolvedLabel')
        : t('citizen.myReports.empty');
  const bodyText = query
    ? t('citizen.myReports.emptyNoResultsDesc', { query })
    : filter === 'active'
      ? t('citizen.myReports.emptyActiveDesc')
      : filter === 'resolved'
        ? t('citizen.myReports.emptyResolvedDesc')
        : t('citizen.myReports.emptyDefaultDesc');
  return (
    <div className="col-span-full w-full flex flex-col items-center justify-center min-h-[320px] px-8 py-[60px] text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-[18px] text-slate-300">
        <FileText size={36} />
      </div>
      <div className="font-extrabold text-[17px] text-slate-900 mb-2">
        {headingText}
      </div>
      <div className="text-[13px] text-slate-400 leading-[1.7] max-w-[260px]">
        {bodyText}
      </div>
    </div>
  );
}

function TicketPageLoadingState() {
  const { t } = useTranslation();
  return (
    <div className="citizen-content-shell pt-7 pb-7">
      <section
        className="grid min-h-[320px] place-items-center rounded-[18px] border border-[#DBEAFE] bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_56%,#F8FAFC_100%)] px-5 py-6 text-center shadow-[0_12px_28px_rgba(30,58,138,0.08)]"
      >
        <div className="grid justify-items-center gap-3">
          <div
            role="status"
            aria-label="Loading my reports"
            className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.96)] shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-[-6px] rounded-full border-4 border-[rgba(30,58,138,0.16)] border-r-primary border-t-severity-critical [animation:ticketPageSpin_0.9s_linear_infinite]"
            />
            <img
              src="/favicon.svg"
              alt="TUGON"
              className="block h-10 w-10 [filter:drop-shadow(0_2px_3px_rgba(15,23,42,0.15))]"
            />
          </div>
          <p className="m-0 text-primary text-sm font-extrabold">
            {t('citizen.myReports.loadingTitle')}
          </p>
          <p className="m-0 text-slate-500 text-xs leading-[1.55]">
            {t('citizen.myReports.loadingSubtitle')}
          </p>
        </div>
      </section>
    </div>
  );
}

type FilterKey = 'all' | 'active' | 'resolved';
type DateSortKey = 'newest' | 'oldest';

export default function CitizenMyReports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const [reports, setReports]     = useState<CitizenReport[]>(MY_REPORTS);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [query, setQuery]         = useState('');
  const [selected, setSelected]   = useState<CitizenReport | null>(null);
  const [sortBy, setSortBy]       = useState<DateSortKey>('newest');
  const [sortOpen, setSortOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { notificationItems, unreadNotificationCount } = useCitizenReportNotifications();

  const loadReports = React.useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingInitial(true);
    }

    try {
      const response = await citizenReportsApi.getMyReports();
      const mappedReports = response.reports.map(mapApiReport);
      setReports(mappedReports);
      setSelected((current) => {
        if (!current) {
          return current;
        }

        return mappedReports.find((report) => report.id === current.id) ?? current;
      });
    } catch {
      // Keep the current list when API is unavailable.
    } finally {
      if (!silent) {
        setLoadingInitial(false);
      }
    }
  }, []);

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const disconnect = citizenReportsApi.connectMyReportsStream(() => {
      void loadReports(true);
    });

    return () => {
      disconnect();
    };
  }, [loadReports]);

  useEffect(() => {
    setCancelError(null);
    setCancelSubmitting(false);
  }, [selected?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get('reportId');
    if (!reportId) {
      return;
    }

    const target = reports.find((report) => report.id === reportId);
    if (!target) {
      return;
    }

    setSelected(target);

    params.delete('reportId');
    const search = params.toString();
    navigate(search ? `/citizen/my-reports?${search}` : '/citizen/my-reports', { replace: true });
  }, [location.search, navigate, reports]);

  const handleCancelReport = React.useCallback(async (reportId: string) => {
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const response = await citizenReportsApi.cancelReport(reportId);
      const updated = mapApiReport(response.report);
      setReports((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelected(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to cancel this report right now.';
      setCancelError(message);
    } finally {
      setCancelSubmitting(false);
    }
  }, []);

  const handleNotificationItemClick = React.useCallback((item: { action?: 'open-my-reports' | 'open-home'; reportId?: string }) => {
    if (item.action === 'open-my-reports' && item.reportId) {
      const target = reports.find((report) => report.id === item.reportId);
      if (target) {
        setSelected(target);
      }
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
    setSortOpen(false);
  }, [reports]);

  // Filter + search + sort pipeline.
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const visible = reports.filter((r) => {
      const matchFilter =
        filter === 'all' ? true :
        filter === 'active' ? citizenStatusConfig[r.status].filterGroup === 'active' :
        citizenStatusConfig[r.status].filterGroup === 'resolved';
      const matchQuery = q.length === 0 || [
        r.id, r.type, typeConfig[r.type].label,
        r.location, r.barangay, r.description,
        citizenStatusConfig[r.status].label,
      ].some((v) => v.toLowerCase().includes(q));
      return matchFilter && matchQuery;
    });

    const sorted = [...visible].sort((a, b) => {
      const direction = sortBy === 'newest' ? -1 : 1;
      const dateA = parseTimestamp(a.submittedAt);
      const dateB = parseTimestamp(b.submittedAt);
      if (dateA !== dateB) {
        return (dateA - dateB) * direction;
      }

      const updatedA = parseTimestamp(a.updatedAt);
      const updatedB = parseTimestamp(b.updatedAt);
      if (updatedA !== updatedB) {
        return (updatedA - updatedB) * direction;
      }

      const seqA = extractReportSequence(a.id);
      const seqB = extractReportSequence(b.id);
      if (seqA !== seqB) {
        return (seqA - seqB) * direction;
      }

      return a.id.localeCompare(b.id) * direction;
    });

    return sorted;
  }, [filter, query, reports, sortBy]);

  // Counts
  const allCount      = reports.length;
  const activeCount   = reports.filter(r => citizenStatusConfig[r.status].filterGroup === 'active').length;
  const resolvedCount = reports.filter(r => citizenStatusConfig[r.status].filterGroup === 'resolved').length;

  useEffect(() => {
    const handleOutsideHeaderTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.citizen-web-header') || target?.closest('.citizen-sort-panel')) {
        return;
      }

      setNotifOpen(false);
      setProfileMenuOpen(false);
      setSortOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setSortOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideHeaderTap);
    document.addEventListener('scroll', handleAnyScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideHeaderTap);
      document.removeEventListener('scroll', handleAnyScroll, true);
    };
  }, []);

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',      label: t('citizen.myReports.filterAll'),      count: allCount },
    { key: 'active',   label: t('citizen.myReports.filterActive'),   count: activeCount },
    { key: 'resolved', label: t('citizen.myReports.filterResolved'), count: resolvedCount },
  ];

  return (
    <div className="relative">
      {selected && (
        <DetailView
          report={selected}
          onClose={() => setSelected(null)}
          onCancelReport={handleCancelReport}
          cancelling={cancelSubmitting}
          cancelError={cancelError}
        />
      )}

      <CitizenPageLayout
        header={
          <header
            className="citizen-web-header bg-primary flex items-center h-[60px] shrink-0 sticky top-0 z-50 shadow-[0_2px_8px_rgba(15,23,42,0.14)]"
          >
            <div
              className="citizen-web-header-inner flex items-center justify-between gap-3 h-full relative"
            >
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />

              <div className="flex items-center gap-[10px]">
                <CitizenMobileMenu
                  activeKey="myreports"
                  onNavigate={(key) => {
                    if (key === 'report') navigate('/citizen/report');
                    else if (key === 'myreports') navigate('/citizen/my-reports');
                    else if (key === 'map') navigate('/citizen?tab=map');
                    else if (key === 'profile') navigate('/citizen?tab=profile');
                    else navigate('/citizen');
                  }}
                />
                <CitizenNotificationBellTrigger
                  unreadCount={unreadNotificationCount}
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                    setSortOpen(false);
                  }}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                      setSortOpen(false);
                    }}
                    aria-label="Open profile actions"
                    aria-haspopup="menu"
                    className="w-11 h-11 rounded-[10px] bg-severity-medium flex items-center justify-center text-white font-extrabold text-sm border-none cursor-pointer"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      className="absolute top-11 right-0 w-[190px] bg-white rounded-xl border border-slate-200 overflow-hidden z-[110] shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        className="w-full text-left px-3 py-[11px] bg-white border-none border-b border-slate-100 text-slate-900 text-[13px] font-semibold cursor-pointer"
                      >
                        {t('citizen.myReports.openProfilePage')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left px-3 py-[11px] bg-white border-none text-red-700 text-[13px] font-bold cursor-pointer"
                      >
                        {t('common.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <CitizenNotificationsPanel
                open={notifOpen}
                unreadCount={unreadNotificationCount}
                items={notificationItems}
                onItemClick={handleNotificationItemClick}
              />
            </div>
          </header>
        }
        mobileMainPaddingBottom={16}
        desktopMainPaddingBottom={16}
        desktopMainMaxWidth={1320}
        beforeMain={<CitizenDesktopNav activeKey="myreports" />}
        mainOnClick={() => {
          if (sortOpen) {
            setSortOpen(false);
          }
          if (notifOpen) {
            setNotifOpen(false);
          }
        }}
        mainOnScroll={() => {
          if (sortOpen) {
            setSortOpen(false);
          }
          if (notifOpen) {
            setNotifOpen(false);
          }
        }}
      >
        {loadingInitial ? (
          <TicketPageLoadingState />
        ) : (
          <>
            <div className="citizen-content-shell pt-4 pb-0">
              <section
                className="mb-[10px] rounded-2xl border border-[#DBEAFE] bg-[linear-gradient(140deg,#EFF6FF_0%,#F8FAFC_46%,#FFFFFF_100%)] px-4 pb-[14px] pt-4 shadow-[0_8px_24px_rgba(30,58,138,0.08)]"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-[220px]">
                    <p className="m-0 text-[11px] font-extrabold text-primary tracking-[0.08em] uppercase">
                      {t('citizen.myReports.headerLabel')}
                    </p>
                    <h2 className="mb-1 mt-[6px] text-[clamp(18px,2.4vw,22px)] font-extrabold leading-[1.2] text-slate-900">
                      {t('citizen.myReports.headerTitle')}
                    </h2>
                    <p className="m-0 text-slate-500 text-xs leading-[1.55]">
                      {t('citizen.myReports.headerSubtitle')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-white border border-[#BFDBFE] text-primary rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      {t('citizen.myReports.countTotal', { count: allCount })}
                    </span>
                    <span className="bg-[#FFFBEB] border border-[#FDE68A] text-severity-medium rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      {t('citizen.myReports.countActive', { count: activeCount })}
                    </span>
                    <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      {t('citizen.myReports.countResolved', { count: resolvedCount })}
                    </span>
                  </div>
                </div>
              </section>

              <section
                className="rounded-2xl border border-[#DBEAFE] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)]"
              >
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 flex min-w-[240px] items-center gap-2 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-3 py-[10px] transition-colors duration-200">
                  <Search size={14} color="#94A3B8" className="shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('citizen.myReports.searchPlaceholder')}
                    className="flex-1 border-none bg-transparent text-[13px] text-slate-900 outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      title="Clear search"
                      className="flex cursor-pointer border-none bg-transparent p-0 text-slate-400"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="citizen-sort-panel relative">
                  <button
                    onClick={() => setSortOpen(v => !v)}
                    className="h-[42px] bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-3 flex items-center gap-[5px] cursor-pointer text-slate-600 font-semibold text-xs whitespace-nowrap"
                  >
                    <SlidersHorizontal size={13} />
                    {sortBy === 'newest' ? t('citizen.myReports.sortNewestShort') : t('citizen.myReports.sortOldestShort')}
                    <ChevronDown size={12} />
                  </button>
                  {sortOpen && (
                    <div className="citizen-sort-panel absolute right-0 top-[calc(100%+4px)] z-[60] min-w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                      {(['newest', 'oldest'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSortBy(opt); setSortOpen(false); }}
                          className={`block w-full cursor-pointer border-none px-[14px] py-[10px] text-left text-[13px] ${
                            sortBy === opt
                              ? 'bg-[#EFF6FF] font-bold text-primary'
                              : 'bg-white font-normal text-slate-600'
                          }`}
                        >
                          {opt === 'newest' ? t('citizen.myReports.sortNewestFull') : t('citizen.myReports.sortOldestFull')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex pt-[10px] px-[2px] pb-0 gap-0">
                {FILTER_TABS.map(tab => {
                  const isActive = filter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className="relative flex flex-1 flex-col items-center gap-[2px] border-none bg-transparent px-1 pb-[10px] pt-2 transition-all duration-200"
                    >
                      <span
                        className={`flex items-center gap-[5px] text-[13px] ${
                          isActive ? 'font-extrabold text-primary' : 'font-medium text-slate-400'
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`rounded-[20px] px-[7px] py-[1px] text-[10px] font-bold ${
                            isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-t-[3px] bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              </section>
            </div>

            <div onClick={() => sortOpen && setSortOpen(false)}>
              <div className="citizen-content-shell citizen-reports-summary-row pt-[10px] pb-2 flex items-center justify-between">
                <span className="citizen-reports-summary-text text-xs text-slate-400 font-medium">
                  {t('citizen.myReports.showing')} <strong className="text-slate-900">{filtered.length}</strong> {filtered.length !== 1 ? t('citizen.myReports.reports') : t('citizen.myReports.report')}
                  {query && ` ${t('citizen.myReports.showingFor', { query })}`}
                </span>
                {filtered.length > 0 && (
                  <span className="citizen-reports-summary-hint text-[11px] text-slate-400">
                    {t('citizen.myReports.openCardHint')}
                  </span>
                )}
              </div>

              <div className="citizen-content-shell citizen-reports-grid pt-0 pb-6 grid gap-3">
                {filtered.length === 0 ? (
                  <EmptyState filter={filter} query={query} />
                ) : (
                  filtered.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onClick={() => setSelected(report)}
                    />
                  ))
                )}
              </div>

              {filtered.length > 0 && (
                <div className="citizen-content-shell citizen-reports-footnote-wrap pt-0 pb-8 flex items-start gap-2">
                  <Info size={13} color="#94A3B8" className="shrink-0 mt-[1px]" />
                  <p className="citizen-reports-footnote text-[11px] text-slate-400 leading-[1.6] m-0">
                    {t('citizen.myReports.footnote')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <style>{`
          @keyframes ticketPageSpin {
            to { transform: rotate(360deg); }
          }

          .citizen-report-card-modern:hover,
          .citizen-report-card-modern:focus-visible {
            border-color: #93c5fd !important;
            box-shadow: 0 10px 22px rgba(30, 58, 138, 0.14) !important;
            outline: none;
          }

          @media (max-width: 900px) {
            .citizen-reports-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (min-width: 901px) {
            .citizen-reports-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
      </CitizenPageLayout>
    </div>
  );
}

