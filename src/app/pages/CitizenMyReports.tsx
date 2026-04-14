import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation, LanguageToggle } from '../i18n';
import {
  Search, X, ChevronRight,
  MapPin, Clock, FileText, User, Calendar, Camera, Mic,
  Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Droplets, Car, Activity, Zap, CheckCircle2,
  MessageSquare, Phone, RefreshCw, Eye, XCircle, Ban,
  ChevronDown, SlidersHorizontal, Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { ThemeToggle } from '../components/ThemeToggle';

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
  dotColor: string; icon: LucideIcon; step: number;
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
  label: string; color: string; bg: string; icon: LucideIcon;
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
    badge: 'bg-[var(--primary-fixed)] border-[var(--primary-fixed-dim)] text-[var(--primary)]',
    footer: 'bg-[var(--primary-fixed)] border-t border-[var(--primary-fixed-dim)]',
    text: 'text-[var(--primary)]',
  },
  under_review: {
    badge: 'bg-[var(--secondary-fixed)] border-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
    footer: 'bg-[var(--secondary-fixed)] border-t border-[var(--secondary-fixed-dim)]',
    text: 'text-[var(--secondary)]',
  },
  in_progress: {
    badge: 'bg-[var(--surface-container-high)] border-[var(--surface-container-highest)] text-[var(--primary-container)]',
    footer: 'bg-[var(--surface-container-high)] border-t border-[var(--surface-container-highest)]',
    text: 'text-[var(--primary-container)]',
  },
  resolved: {
    badge: 'bg-[var(--severity-low-bg)] border-[rgba(5,150,105,0.28)] text-[var(--severity-low)]',
    footer: 'bg-[var(--severity-low-bg)] border-t border-[rgba(5,150,105,0.28)]',
    text: 'text-[var(--severity-low)]',
  },
  closed: {
    badge: 'bg-surface-container-high border-[var(--outline-variant)] text-[var(--outline)]',
    footer: 'bg-surface-container-high border-t border-[var(--outline-variant)]',
    text: 'text-[var(--outline)]',
  },
  unresolvable: {
    badge: 'bg-[var(--error-container)] border-[rgba(186,26,26,0.22)] text-[var(--error)]',
    footer: 'bg-[var(--error-container)] border-t border-[rgba(186,26,26,0.22)]',
    text: 'text-[var(--error)]',
  },
};

const typeToneClass: Record<CitizenReportType, {
  iconChip: string;
  detailHeader: string;
  detailIcon: string;
  fieldIcon: string;
}> = {
  pollution: {
    iconChip: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
    detailHeader: 'border-b-2 border-b-[var(--severity-low)]',
    detailIcon: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
    fieldIcon: 'text-[var(--severity-low)]',
  },
  noise: {
    iconChip: 'bg-[var(--primary-fixed)] text-[var(--primary-container)]',
    detailHeader: 'border-b-2 border-b-[var(--primary-container)]',
    detailIcon: 'bg-[var(--primary-fixed)] text-[var(--primary-container)]',
    fieldIcon: 'text-[var(--primary-container)]',
  },
  crime: {
    iconChip: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
    detailHeader: 'border-b-2 border-b-primary',
    detailIcon: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
    fieldIcon: 'text-primary',
  },
  road_hazard: {
    iconChip: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    detailHeader: 'border-b-2 border-b-[var(--secondary)]',
    detailIcon: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    fieldIcon: 'text-[var(--secondary)]',
  },
  flood: {
    iconChip: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
    detailHeader: 'border-b-2 border-b-[var(--primary-container)]',
    detailIcon: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
    fieldIcon: 'text-[var(--primary-container)]',
  },
  accident: {
    iconChip: 'bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
    detailHeader: 'border-b-2 border-b-[var(--secondary)]',
    detailIcon: 'bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
    fieldIcon: 'text-[var(--secondary)]',
  },
  medical: {
    iconChip: 'bg-[var(--error-container)] text-[var(--error)]',
    detailHeader: 'border-b-2 border-b-severity-critical',
    detailIcon: 'bg-[var(--error-container)] text-[var(--error)]',
    fieldIcon: 'text-[var(--error)]',
  },
  infrastructure: {
    iconChip: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    detailHeader: 'border-b-2 border-b-[var(--secondary)]',
    detailIcon: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    fieldIcon: 'text-[var(--secondary)]',
  },
  other: {
    iconChip: 'bg-surface-container-high text-[var(--outline)]',
    detailHeader: 'border-b-2 border-b-[var(--outline)]',
    detailIcon: 'bg-surface-container-high text-[var(--outline)]',
    fieldIcon: 'text-[var(--outline)]',
  },
};

const severityToneClass: Record<CitizenReport['severity'], string> = {
  critical: 'bg-[var(--error-container)] text-[var(--error)]',
  high: 'bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
  medium: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
  low: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
};

const timelineToneClass: Record<string, {
  iconShell: string;
  latestBadge: string;
  actorBadge: string;
}> = {
  created: {
    iconShell: 'bg-surface-container-high border-2 border-[var(--outline-variant)] text-[var(--outline)]',
    latestBadge: 'bg-surface-container-high text-[var(--outline)]',
    actorBadge: 'bg-surface-container-high text-[var(--outline)]',
  },
  submitted: {
    iconShell: 'bg-[var(--primary-fixed)] border-2 border-[var(--primary-fixed-dim)] text-[var(--primary)]',
    latestBadge: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
    actorBadge: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
  },
  under_review: {
    iconShell: 'bg-[var(--secondary-fixed)] border-2 border-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
    latestBadge: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    actorBadge: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
  },
  in_progress: {
    iconShell: 'bg-[var(--surface-container-high)] border-2 border-[var(--surface-container-highest)] text-[var(--primary-container)]',
    latestBadge: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
    actorBadge: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
  },
  resolved: {
    iconShell: 'bg-[var(--severity-low-bg)] border-2 border-[rgba(5,150,105,0.28)] text-[var(--severity-low)]',
    latestBadge: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
    actorBadge: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
  },
  closed: {
    iconShell: 'bg-surface-container-high border-2 border-[var(--outline-variant)] text-[var(--outline)]',
    latestBadge: 'bg-surface-container-high text-[var(--outline)]',
    actorBadge: 'bg-surface-container-high text-[var(--outline)]',
  },
  unresolvable: {
    iconShell: 'bg-[var(--error-container)] border-2 border-[rgba(186,26,26,0.22)] text-[var(--error)]',
    latestBadge: 'bg-[var(--error-container)] text-[var(--error)]',
    actorBadge: 'bg-[var(--error-container)] text-[var(--error)]',
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
    sm: { className: 'gap-1 rounded px-[8px] py-[4px] text-[11px]', iconSize: 10 },
    md: { className: 'gap-[5px] rounded px-[10px] py-1 text-[11px]', iconSize: 11 },
    lg: { className: 'gap-[6px] rounded-md px-[14px] py-[7px] text-[13px]', iconSize: 14 },
  };
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border font-semibold leading-none tracking-[0.02em] ${statusToneClass[status].badge} ${s.className}`}
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
          ? 'bg-[var(--error-container)] border-[var(--error)]'
          : 'bg-[var(--severity-low-bg)] border-[var(--severity-low)]';
        const stepToneClassName = isTerminal && stepNum === 4
          ? terminalDoneClass
          : done
            ? 'bg-primary border-primary'
            : active
              ? 'bg-[var(--primary-fixed)] border-[var(--primary)]'
              : 'bg-surface-container-high border-[var(--outline-variant)]';

        return (
          <div key={s.key} className="contents">
            <div className="flex flex-1 flex-col items-center gap-[3px]">
              <div
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border transition-all duration-300 ${stepToneClassName}`}
              >
                {(done || (isTerminal && stepNum === 4)) ? (
                  isTerminal && stepNum === 4 ? (
                    isFailed
                      ? <X size={10} className="text-[var(--error)]" />
                      : <CheckCircle2 size={10} className="text-[var(--severity-low)]" />
                  ) : (
                    <CheckCircle2 size={10} className="text-white" />
                  )
                ) : active ? (
                  <div className="h-[7px] w-[7px] rounded-[2px] bg-primary" />
                ) : (
                  <span className="text-[8px] font-bold text-[var(--outline-variant)]">{stepNum}</span>
                )}
              </div>
              <span
                className={`text-center text-[8px] leading-[1.2] ${done || active ? 'font-bold text-primary' : 'font-normal text-[var(--outline)]'}`}
              >
                {isTerminal && stepNum === 4 ? citizenStatusConfig[status].label : s.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`mb-[14px] h-0.5 flex-1 rounded-[1px] transition-colors duration-300 ${
                  stepNum < currentStep || (isTerminal && stepNum < 4) ? 'bg-primary' : 'bg-surface-container-high'
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
      className="citizen-report-card citizen-report-card-modern relative mb-3 w-full cursor-pointer overflow-hidden rounded-lg border border-[var(--outline-variant)] bg-card p-0 text-left transition-[border-color] duration-200 ease-in-out"
      onClick={onClick}
    >
      <div className="p-[14px] pb-0">
        {/* Top row: ID + Status */}
        <div className="flex items-center justify-between mb-[10px]">
          <div className="flex items-center gap-2">
            <div className={`w-[34px] h-[34px] rounded-md shrink-0 flex items-center justify-center ${typeTone.iconChip}`}>
              <Icon size={17} />
            </div>
            <div>
              <div className="font-semibold text-[13px] text-[var(--on-surface)] leading-[1.1]">
                {report.id}
              </div>
              <div className="mt-[1px] text-[11px] font-medium text-muted-foreground">
                {tc.label}
              </div>
            </div>
          </div>
          <CitizenStatusBadge status={report.status} size="sm" />
        </div>

        {/* Location */}
        <div className="flex items-start gap-[5px] mb-[7px]">
          <MapPin size={11} className="shrink-0 mt-[1px] text-[var(--outline)]" />
          <span className="text-xs text-muted-foreground leading-[1.45] flex-1">
            {report.location}, {report.barangay}
          </span>
        </div>

        {/* Description excerpt */}
        <div className="mb-[10px] overflow-hidden text-xs leading-[1.5] text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {report.description}
        </div>

        {/* Date + evidence chips */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1">
            <Calendar size={10} className="text-[var(--outline)]" />
            <span className="text-[11px] text-muted-foreground">{formatDate(report.submittedAt)}</span>
          </div>
          <span className="text-[11px] text-border"> - </span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(report.submittedAt)}</span>
          {report.hasPhotos && (
            <span className="contents">
              <span className="text-[11px] text-border"> - </span>
              <div className="flex items-center gap-[3px] rounded-[6px] bg-surface-container-high px-[6px] py-[2px]">
                <Camera size={9} className="text-[var(--outline)]" />
                <span className="text-[9px] text-muted-foreground font-semibold">{report.photoCount}</span>
              </div>
            </span>
          )}
          {report.hasAudio && (
            <span className="contents">
              <span className="text-[11px] text-border"> - </span>
              <div className="flex items-center gap-[3px] rounded-[6px] bg-surface-container-high px-[6px] py-[2px]">
                <Mic size={9} className="text-[var(--outline)]" />
                <span className="text-[9px] text-muted-foreground font-semibold">{t('citizen.myReports.audioSection')}</span>
              </div>
            </span>
          )}
        </div>
      </div>

      {/* Workflow progress strip */}
      <div className="border-t border-[var(--outline-variant)] bg-surface-container-low px-4 pt-[10px] pb-3">
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

      <article className="citizen-report-modal-sheet absolute bottom-0 left-0 right-0 mx-auto flex max-h-[92vh] max-w-[960px] flex-col overflow-hidden rounded-t-[14px] bg-[var(--surface-container-low)] [animation:slideUp_0.32s_cubic-bezier(0.4,0,0.2,1)]">
        <header className="bg-card pt-[10px] pb-0 flex flex-col items-center border-b border-border/60 shrink-0">
          <div className="w-[38px] h-1 rounded-[2px] bg-muted mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-[14px]">
            <div>
              <div className="font-semibold text-base text-[var(--on-surface)]">{t('citizen.myReports.detailsTitle')}</div>
              <div className="mt-[1px] text-[12px] text-[var(--on-surface-variant)]">{report.id}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-[var(--outline-variant)] bg-muted text-[var(--on-surface-variant)]"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <section className="mb-4 rounded-lg border border-[var(--outline-variant)] overflow-hidden">
            {/* Colored header */}
            <div className={`flex items-start gap-[14px] px-[18px] pt-[18px] pb-[14px] ${typeTone.detailHeader}`}>
              <div className={`w-[52px] h-[52px] rounded-lg shrink-0 flex items-center justify-center ${typeTone.detailIcon}`}>
                <TypeIcon size={26} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[18px] text-[var(--on-surface)] leading-[1.15] mb-1">
                  {t('citizen.myReports.incidentHeading', { type: tc.label })}
                </div>
                <div className="flex items-center gap-[6px] flex-wrap">
                  <CitizenStatusBadge status={report.status} size="md" />
                  <span className={`rounded px-[8px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] ${severityToneClass[report.severity]}`}>
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
                <div key={label} className="border border-[var(--outline-variant)] rounded-md bg-[var(--surface-container-low)] px-3 py-[10px]">
                  <dt className="mb-1 flex items-center gap-[6px] text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--on-surface-variant)]">
                    <span className={typeTone.fieldIcon}>{icon}</span>
                    {label}
                  </dt>
                  <dd className="m-0 text-[13px] text-[var(--on-surface)] leading-[1.5] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mb-4 rounded-lg border border-[var(--outline-variant)] bg-card p-4">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <MessageSquare size={14} color={tc.color} />
              <span className="font-semibold text-[13px] text-[var(--on-surface)]">{t('citizen.myReports.description')}</span>
            </div>
            <p className="text-[13px] text-[var(--on-surface-variant)] leading-[1.7] m-0">{report.description}</p>
          </section>

          {canCancel && (
            <section className="mb-4 rounded-lg border border-[var(--severity-medium)]/40 bg-[var(--severity-medium-bg)] px-[14px] py-3">
              <p className="m-0 text-xs text-[var(--severity-medium)] leading-[1.6]">
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
                className={`mt-[10px] rounded-md border-none px-[14px] py-[9px] text-xs font-semibold text-white ${
                  cancelling
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'cursor-pointer bg-severity-critical'
                }`}
              >
                {cancelling ? t('citizen.myReports.cancelling') : t('citizen.myReports.cancelBtn')}
              </button>
              {cancelError && (
                <p className="mb-0 mt-2 text-[12px] leading-[1.5] text-[var(--error)]">{cancelError}</p>
              )}
            </section>
          )}

          {(report.hasPhotos || report.hasAudio) && (
            <section className="mb-4 rounded-lg border border-[var(--outline-variant)] bg-card p-4">
              <div className="font-semibold text-[13px] text-[var(--on-surface)] mb-3">
                {t('citizen.myReports.evidenceAttached')}
              </div>
              <div className={`flex gap-2 flex-wrap ${hasPreviewableEvidence ? 'mb-3' : ''}`}>
                {report.hasPhotos ? (
                  <div className="flex items-center gap-[6px] rounded-md border border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)] px-3 py-2">
                    <Camera size={14} className="text-primary" />
                    <span className="text-xs text-primary font-semibold">{report.photoCount > 1 ? t('citizen.myReports.photoCountPlural', { count: report.photoCount }) : t('citizen.myReports.photoCount', { count: report.photoCount })}</span>
                  </div>
                ) : null}
                {report.hasAudio ? (
                  <div className="flex items-center gap-[6px] rounded-md border border-[var(--surface-container-highest)] bg-surface-container-high px-3 py-2">
                    <Mic size={14} className="text-[var(--primary-container)]" />
                    <span className="text-xs font-bold text-[var(--primary-container)]">{t('citizen.myReports.voiceRecording')}</span>
                  </div>
                ) : null}
              </div>

              {photoEvidence.length > 0 && (
                <section className={audioEvidence.length > 0 ? 'mb-3' : ''}>
                  <div className="mb-2 text-[12px] font-bold text-muted-foreground">{t('citizen.myReports.photosSection')}</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                    {photoEvidence.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreviewPhotoIndex(index)}
                        className="border border-[var(--primary-fixed-dim)] rounded-md p-0 overflow-hidden bg-[var(--primary-fixed)] cursor-pointer"
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
                  <div className="mb-2 text-[12px] font-bold text-muted-foreground">{t('citizen.myReports.audioSection')}</div>
                  <div className="grid gap-2">
                    {audioEvidence.map((item) => (
                      <article key={item.id} className="border border-[var(--outline-variant)] rounded-md px-3 py-[10px] bg-[var(--surface-container-low)]">
                        <div className="mb-[6px] text-[12px] font-semibold text-muted-foreground">{item.fileName}</div>
                        <audio controls preload="metadata" src={item.publicUrl} className="w-full" />
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!hasPreviewableEvidence && (
                <p className="m-0 text-xs text-muted-foreground leading-[1.6]">
                  {t('citizen.myReports.evidenceUnavailable')}
                </p>
              )}
            </section>
          )}

          {report.resolutionNote && (
            <section
              className={`mb-4 rounded-lg border p-4 ${
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
                  className={`text-[13px] font-semibold ${
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

          <section className="mb-2 rounded-lg border border-[var(--outline-variant)] bg-card p-[18px]">
            <div className="font-semibold text-[13px] text-[var(--on-surface)] mb-4 flex items-center gap-[7px]">
              <Clock size={14} color="var(--primary)" /> {t('citizen.myReports.timeline')}
            </div>

            <ul className="m-0 p-0 list-none">
            {report.timeline.map((event, idx) => {
              const isLast = idx === report.timeline.length - 1;
              const timelineTone = timelineToneClass[event.status] ?? timelineToneClass['submitted'];
              return (
                <li key={`${event.timestamp}-${idx}`} className="flex gap-3 relative">
                  {!isLast && (
                    <div className="absolute bottom-[-4px] left-[15px] top-[30px] z-0 w-[2px] bg-muted" />
                  )}

                  <div className={`w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center z-[1] relative ${timelineTone.iconShell}`}>
                    {timelineIconMap[event.status] ?? <FileText size={13} />}
                  </div>

                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    <div className="flex items-start justify-between gap-2 mb-[2px]">
                      <div className="font-semibold text-[13px] text-[var(--on-surface)] leading-[1.2]">
                        {event.label}
                      </div>
                      {isLast && (
                        <span className={`shrink-0 rounded px-2 py-[2px] text-[9px] font-semibold tracking-[0.06em] uppercase ${timelineTone.latestBadge}`}>
                          {t('citizen.myReports.timelineLatest')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-1 leading-[1.5]">
                      {event.description}
                    </div>
                    {event.note && event.note !== event.description && (
                      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-[10px] py-[7px] text-[11px] text-[#78350F] leading-[1.5] mb-1">
                        {t('citizen.myReports.timelineNote', { note: event.note })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <time className="text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {formatDateTime(event.timestamp)}
                      </time>
                      <span className="text-[11px] text-border/60"> - </span>
                      <span className={`rounded-[4px] px-[6px] py-[1px] text-[11px] font-semibold ${timelineTone.actorBadge}`}>
                        {event.actor} - {event.actorRole}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          </section>

          <section className="bg-[#FEF2F2] rounded-lg px-[14px] py-3 border border-[#FECACA] flex gap-2 items-start">
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
          className="citizen-vv-bounds fixed inset-0 z-[230] flex items-center justify-center p-4"
        >
          <div
            onClick={() => {
              if (!cancelling) {
                setConfirmCancelOpen(false);
              }
            }}
            className="absolute inset-0 bg-[rgba(15,23,42,0.55)] backdrop-blur-[3px]"
          />

          <article
            className="relative w-[min(460px,100%)] overflow-hidden rounded-lg bg-card shadow-md"
          >
            <header className="bg-[var(--citizen-header-bg)] text-white px-4 py-3 flex items-center justify-between gap-2">
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
              <p className="m-0 text-[13px] text-[var(--on-surface-variant)] leading-[1.65]">
                {t('citizen.myReports.confirmCancelBody')}
              </p>
            </div>

            <footer className="px-4 pb-[14px] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
                className={`h-[38px] rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-[14px] text-xs font-semibold text-[var(--on-surface-variant)] ${
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
                className={`h-[38px] rounded-md border-none px-[14px] text-xs font-semibold text-white ${
                  cancelling
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
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
          className="citizen-photo-preview-overlay citizen-vv-bounds fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(2,6,23,0.82)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPreviewPhotoIndex(null)}
        >
          <div
            className="citizen-photo-preview-stage flex max-h-full w-full max-w-[980px] flex-col gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center text-[var(--inverse-on-surface)] text-xs">
              <strong>{selectedPhoto.fileName}</strong>
              <button
                type="button"
                className="citizen-photo-preview-close bg-[var(--inverse-surface)] border border-[var(--on-surface-variant)]/30 text-[var(--inverse-on-surface)] rounded-lg px-[10px] py-1 cursor-pointer"
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

        .citizen-report-modal {
          top: var(--app-vv-top, 0px);
          bottom: var(--app-vv-bottom-gap, 0px);
        }

        .citizen-vv-bounds {
          top: var(--app-vv-top, 0px);
          bottom: var(--app-vv-bottom-gap, 0px);
        }

        .citizen-report-modal-sheet {
          max-height: calc(92dvh - var(--app-vv-top, 0px) - var(--app-vv-bottom-gap, 0px));
          padding-bottom: calc(env(safe-area-inset-bottom, 0px));
        }

        @supports (-webkit-touch-callout: none) {
          @media (hover: none) and (pointer: coarse) {
            .citizen-report-modal-sheet {
              max-height: calc(-webkit-fill-available - var(--app-vv-top, 0px) - var(--app-vv-bottom-gap, 0px));
            }
          }
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
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-[18px] text-border">
        <FileText size={36} />
      </div>
      <div className="font-semibold text-[17px] text-[var(--on-surface)] mb-2">
        {headingText}
      </div>
      <div className="text-[13px] text-muted-foreground leading-[1.7] max-w-[260px]">
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
        className="grid min-h-[320px] place-items-center rounded-lg border border-[var(--outline-variant)] bg-card px-5 py-6 text-center"
      >
        <div className="grid justify-items-center gap-3">
          <div
            role="status"
            aria-label="Loading my reports"
            className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-card border border-[var(--outline-variant)]"
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
          <p className="m-0 text-primary text-sm font-semibold">
            {t('citizen.myReports.loadingTitle')}
          </p>
          <p className="m-0 text-muted-foreground text-xs leading-[1.55]">
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
  const { notificationItems, unreadNotificationCount, markAllNotificationsRead } = useCitizenReportNotifications();

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
    } else if (item.action === 'open-home') {
      navigate('/citizen');
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
    setSortOpen(false);
  }, [navigate, reports]);

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
            className="citizen-web-header bg-[var(--citizen-header-bg)] flex items-center h-[60px] shrink-0 sticky top-0 z-50 shadow-[0_2px_8px_rgba(15,23,42,0.14)]"
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
                  open={notifOpen}
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
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#B4730A] text-xs font-bold text-white border-0"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      onPointerDown={(event) => event.stopPropagation()}
                      className="absolute right-0 top-11 z-[200] w-[220px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated divide-y divide-[var(--outline-variant)]/30"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] focus-visible:bg-[var(--surface-container-high)] focus-visible:outline-none active:bg-[var(--surface-container)]"
                      >
                        {t('citizen.myReports.openProfilePage')}
                      </button>
                      <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                        <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.language')}</div>
                        <LanguageToggle compact />
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                        <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.theme')}</div>
                        <ThemeToggle compact />
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-bold text-destructive transition-colors hover:bg-[var(--error-container)] focus-visible:bg-[var(--error-container)] focus-visible:outline-none active:bg-[var(--error-container)]/70"
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
                onMarkAllRead={markAllNotificationsRead}
                onItemClick={handleNotificationItemClick}
              />
            </div>
          </header>
        }
        mobileMainPaddingBottom={16}
        desktopMainPaddingBottom={16}
        desktopMainMaxWidth={1320}
        sidebar={<CitizenDesktopNav activeKey="myreports" />}
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
            <div className="citizen-content-shell page-content pt-4 pb-0">
              {/* Page header — official style */}
              <section className="mb-3 border-b border-border pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {t('citizen.myReports.headerLabel')}
                    </div>
                    <h1 className="text-[24px] font-black leading-tight tracking-tight text-foreground">
                      {t('citizen.myReports.headerTitle')}
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('citizen.myReports.headerSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      <span className="text-foreground text-[20px] font-black">{allCount}</span> total
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">·</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      <span className="text-[var(--secondary)] text-[20px] font-black">{activeCount}</span> active
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">·</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      <span className="text-[var(--severity-low)] text-[20px] font-black">{resolvedCount}</span> resolved
                    </span>
                  </div>
                </div>
              </section>

              <section
                className="rounded-lg border border-[var(--outline-variant)] bg-card p-3"
              >
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 flex min-w-0 items-center gap-2 rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3 py-[10px] transition-colors duration-200">
                  <Search size={14} className="shrink-0 text-[var(--outline)]" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('citizen.myReports.searchPlaceholder')}
                    className="flex-1 border-none bg-transparent text-[13px] text-[var(--on-surface)] outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      title="Clear search"
                      className="flex cursor-pointer border-none bg-transparent p-0 text-[var(--outline)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="citizen-sort-panel relative">
                  <button
                    onClick={() => setSortOpen(v => !v)}
                    className="h-[42px] bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-md px-3 flex items-center gap-[5px] cursor-pointer text-[var(--on-surface-variant)] font-semibold text-xs whitespace-nowrap"
                  >
                    <SlidersHorizontal size={13} />
                    {sortBy === 'newest' ? t('citizen.myReports.sortNewestShort') : t('citizen.myReports.sortOldestShort')}
                    <ChevronDown size={12} />
                  </button>
                  {sortOpen && (
                    <div className="citizen-sort-panel absolute right-0 top-[calc(100%+4px)] z-[60] min-w-[130px] overflow-hidden rounded-md border border-[var(--outline-variant)] bg-card shadow-sm">
                      {(['newest', 'oldest'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSortBy(opt); setSortOpen(false); }}
                          className={`block w-full cursor-pointer border-none px-[14px] py-[10px] text-left text-[13px] ${
                            sortBy === opt
                              ? 'bg-[#EFF6FF] font-bold text-primary'
                              : 'bg-card font-normal text-muted-foreground'
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
                          isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`rounded-[20px] px-[7px] py-[1px] text-[11px] font-bold ${
                            isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
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
                <span className="citizen-reports-summary-text text-xs text-muted-foreground font-medium">
                  {t('citizen.myReports.showing')} <strong className="text-foreground">{filtered.length}</strong> {filtered.length !== 1 ? t('citizen.myReports.reports') : t('citizen.myReports.report')}
                  {query && ` ${t('citizen.myReports.showingFor', { query })}`}
                </span>
                {filtered.length > 0 && (
                  <span className="citizen-reports-summary-hint text-[11px] text-muted-foreground">
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
                  <p className="citizen-reports-footnote text-[11px] text-muted-foreground leading-[1.6] m-0">
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
