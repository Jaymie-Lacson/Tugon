import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
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
  const sizes = {
    sm:  { fontSize: 10, padding: '3px 8px', iconSize: 10, gap: 4, borderRadius: 6 },
    md:  { fontSize: 11, padding: '4px 10px', iconSize: 11, gap: 5, borderRadius: 7 },
    lg:  { fontSize: 13, padding: '7px 14px', iconSize: 14, gap: 6, borderRadius: 10 },
  };
  const s = sizes[size];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`,
      borderRadius: s.borderRadius, padding: s.padding,
      fontSize: s.fontSize, fontWeight: 700, letterSpacing: '0.02em',
      whiteSpace: 'nowrap', lineHeight: 1,
    }}>
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
  const terminalColor = isFailed ? 'var(--severity-critical)' : '#059669';
  const terminalBg   = isFailed ? '#FEF2F2'  : '#ECFDF5';

  return (
    <div className="flex items-center w-full" style={{ gap: 0 }}>
      {WORKFLOW_STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done  = stepNum < currentStep || (isTerminal && stepNum <= 4);
        const active = stepNum === currentStep && !isTerminal;
        const stepBg = isTerminal && stepNum === 4 ? terminalBg
          : done ? 'var(--primary)' : active ? '#EFF6FF' : '#F1F5F9';
        const stepBorder = isTerminal && stepNum === 4 ? terminalColor
          : done ? 'var(--primary)' : active ? '#3B82F6' : '#E2E8F0';

        return (
          <div key={s.key} style={{ display: 'contents' }}>
            <div className="flex flex-col items-center flex-1" style={{ gap: 3 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                background: stepBg, border: `2px solid ${stepBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                {(done || (isTerminal && stepNum === 4)) ? (
                  <span style={{ fontSize: 9, color: isTerminal && stepNum === 4 ? terminalColor : '#fff' }}>
                    {isTerminal && stepNum === 4 ? (isFailed ? 'X' : 'OK') : 'OK'}
                  </span>
                ) : active ? (
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--primary)' }} />
                ) : (
                  <span style={{ fontSize: 8, color: '#CBD5E1', fontWeight: 700 }}>{stepNum}</span>
                )}
              </div>
              <span style={{ fontSize: 8, color: done || active ? 'var(--primary)' : '#CBD5E1', fontWeight: done || active ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                {isTerminal && stepNum === 4 ? citizenStatusConfig[status].label : s.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 14,
                background: stepNum < currentStep || (isTerminal && stepNum < 4)
                  ? 'var(--primary)' : '#E2E8F0',
                borderRadius: 1, transition: 'background 0.3s',
              }} />
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
  const tc = typeConfig[report.type];
  const Icon = tc.icon;

  return (
    <button
      className="citizen-report-card citizen-report-card-modern w-full bg-white border border-slate-200 rounded-xl p-0 cursor-pointer text-left overflow-hidden relative"
      onClick={onClick}
      style={{
        boxShadow: '0 4px 12px rgba(15,23,42,0.08)', marginBottom: 12,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div className="p-[14px] pb-0">
        {/* Top row: ID + Status */}
        <div className="flex items-center justify-between mb-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-[34px] h-[34px] rounded-[10px] shrink-0 flex items-center justify-center"
              style={{ background: tc.bg, color: tc.color }}>
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
        <div className="text-xs text-slate-500 leading-[1.5] mb-[10px]"
          style={{
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
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
            <span style={{ display: 'contents' }}>
              <span className="text-slate-300 text-[10px]"> - </span>
              <div className="flex items-center gap-[3px] bg-slate-100 rounded-[6px] px-[6px] py-[2px]">
                <Camera size={9} color="#64748B" />
                <span className="text-[9px] text-slate-500 font-semibold">{report.photoCount}</span>
              </div>
            </span>
          )}
          {report.hasAudio && (
            <span style={{ display: 'contents' }}>
              <span className="text-slate-300 text-[10px]"> - </span>
              <div className="flex items-center gap-[3px] bg-slate-100 rounded-[6px] px-[6px] py-[2px]">
                <Mic size={9} color="#64748B" />
                <span className="text-[9px] text-slate-500 font-semibold">Audio</span>
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
      <div className="flex items-center justify-between px-[14px] py-[10px]"
        style={{
          background: citizenStatusConfig[report.status].bg,
          borderTop: `1px solid ${citizenStatusConfig[report.status].border}`,
        }}>
        <span className="text-[11px] font-semibold" style={{ color: citizenStatusConfig[report.status].color }}>
          {citizenStatusConfig[report.status].description}
        </span>
        <div className="flex items-center gap-[3px]" style={{ color: citizenStatusConfig[report.status].color }}>
          <span className="text-[11px] font-bold">Details</span>
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
  const tc = typeConfig[report.type];
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

  const timelineColorMap: Record<string, { color: string; bg: string }> = {
    created:      { color: '#475569', bg: '#F1F5F9' },
    submitted:    { color: 'var(--primary)', bg: '#EFF6FF' },
    under_review: { color: 'var(--severity-medium)', bg: '#FFFBEB' },
    in_progress:  { color: '#0F766E', bg: '#F0FDFA' },
    resolved:     { color: '#059669', bg: '#ECFDF5' },
    closed:       { color: '#475569', bg: '#F8FAFC' },
    unresolvable: { color: 'var(--severity-critical)', bg: '#FEF2F2' },
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
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
      />

      <article className="absolute bottom-0 left-0 right-0 flex flex-col overflow-hidden"
        style={{
          maxHeight: '92vh',
          background: '#F8FAFC',
          borderRadius: '14px 14px 0 0',
          animation: 'slideUp 0.32s cubic-bezier(0.4,0,0.2,1)',
          maxWidth: 960,
          margin: '0 auto',
        }}>
        <header className="bg-white pt-[10px] pb-0 flex flex-col items-center border-b border-slate-100 shrink-0">
          <div className="w-[38px] h-1 rounded-[2px] bg-slate-200 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-[14px]">
            <div>
              <div className="font-extrabold text-base text-slate-900">Report Details</div>
              <div className="text-[11px] text-slate-400 mt-[1px]">{report.id}</div>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <section className="border-[1.5px] border-slate-200 mb-4"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            {/* Colored header */}
            <div className="flex items-start gap-[14px] px-[18px] pt-[18px] pb-[14px]"
              style={{ borderBottom: `3px solid ${tc.color}` }}>
              <div className="w-[52px] h-[52px] rounded-[15px] shrink-0 flex items-center justify-center"
                style={{
                  background: tc.bg, color: tc.color,
                  boxShadow: `0 2px 10px ${tc.color}28`,
                }}>
                <TypeIcon size={26} />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-[18px] text-slate-900 leading-[1.15] mb-1">
                  {tc.label} Incident
                </div>
                <div className="flex items-center gap-[6px] flex-wrap">
                  <CitizenStatusBadge status={report.status} size="md" />
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    background: report.severity === 'critical' ? '#FEE2E2' : report.severity === 'high' ? '#FFEDD5' : report.severity === 'medium' ? '#FEF3C7' : '#D1FAE5',
                    color: report.severity === 'critical' ? 'var(--severity-critical)' : report.severity === 'high' ? '#C2410C' : report.severity === 'medium' ? 'var(--severity-medium)' : '#059669',
                    borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase',
                  }}>
                    {report.severity} severity
                  </span>
                </div>
              </div>
            </div>

            <dl className="m-0 px-[18px] pt-1 pb-[14px]"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { icon: <FileText size={13} />, label: 'Ticket ID', value: report.id },
                { icon: <MapPin size={13} />, label: 'Location', value: `${report.location}, ${report.barangay}, ${report.district}` },
                { icon: <Calendar size={13} />, label: 'Date Submitted', value: formatDateTime(report.submittedAt) },
                { icon: <Clock size={13} />, label: 'Last Updated', value: formatDateTime(report.updatedAt) },
                ...(report.assignedOfficer ? [{ icon: <User size={13} />, label: 'Assigned Officer', value: `${report.assignedOfficer} - ${report.assignedUnit}` }] : []),
                ...(report.affectedCount ? [{ icon: <AlertTriangle size={13} />, label: 'Est. People Affected', value: `~${report.affectedCount} persons` }] : []),
              ].map(({ icon, label, value }) => (
                <div key={label} className="border border-slate-200 rounded-xl bg-slate-50 px-3 py-[10px]">
                  <dt className="flex items-center gap-[6px] mb-1 text-[10px] text-slate-500 font-bold tracking-[0.04em] uppercase">
                    <span style={{ color: tc.color }}>{icon}</span>
                    {label}
                  </dt>
                  <dd className="m-0 text-[13px] text-[#0F172A] leading-[1.5] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="bg-white rounded-xl p-4 border border-slate-200 mb-4"
            style={{ boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
            <div className="flex items-center gap-[6px] mb-[10px]">
              <MessageSquare size={14} color={tc.color} />
              <span className="font-bold text-[13px] text-slate-900">Description</span>
            </div>
            <p className="text-[13px] text-slate-600 leading-[1.7] m-0">{report.description}</p>
          </section>

          {canCancel && (
            <section className="rounded-[14px] px-[14px] py-3 border border-[#FDE68A] mb-4"
              style={{ background: '#FFFBEB' }}>
              <p className="m-0 text-xs text-[#78350F] leading-[1.6]">
                You may cancel this report only while its status is <strong>Submitted</strong>.
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
                className="mt-[10px] border-none rounded-[10px] px-[14px] py-[9px] text-white text-xs font-bold"
                style={{
                  background: cancelling ? '#94A3B8' : 'var(--severity-critical)',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Report'}
              </button>
              {cancelError && (
                <p className="mt-2 mb-0 text-[11px] text-red-700 leading-[1.5]">{cancelError}</p>
              )}
            </section>
          )}

          {(report.hasPhotos || report.hasAudio) && (
            <section className="bg-white rounded-xl p-4 border border-slate-200 mb-4"
              style={{ boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
              <div className="font-bold text-[13px] text-slate-900 mb-3">
                Evidence Attached
              </div>
              <div className={`flex gap-2 flex-wrap ${hasPreviewableEvidence ? 'mb-3' : ''}`}>
                {report.hasPhotos ? (
                  <div className="flex items-center gap-[6px] bg-blue-50 rounded-[10px] px-3 py-2 border border-[#BFDBFE]">
                    <Camera size={14} color="var(--primary)" />
                    <span className="text-xs text-primary font-bold">{report.photoCount} Photo{report.photoCount > 1 ? 's' : ''}</span>
                  </div>
                ) : null}
                {report.hasAudio ? (
                  <div className="flex items-center gap-[6px] bg-[#EDE9FE] rounded-[10px] px-3 py-2 border border-[#DDD6FE]">
                    <Mic size={14} color="#7C3AED" />
                    <span className="text-xs text-[#7C3AED] font-bold">Voice Recording</span>
                  </div>
                ) : null}
              </div>

              {photoEvidence.length > 0 && (
                <section className={audioEvidence.length > 0 ? 'mb-3' : ''}>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">Photos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
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
                          className="w-full block object-cover"
                          style={{ height: 90 }}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {audioEvidence.length > 0 && (
                <section>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">Audio</div>
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
                  Evidence metadata is available, but preview links are not currently accessible for this report.
                </p>
              )}
            </section>
          )}

          {report.resolutionNote && (
            <section className="rounded-xl p-4 mb-4"
              style={{
                background: report.status === 'unresolvable' ? '#FEF2F2' : '#ECFDF5',
                border: `1.5px solid ${report.status === 'unresolvable' ? '#FECACA' : '#6EE7B7'}`,
              }}>
              <div className="flex items-center gap-[7px] mb-2">
                {report.status === 'unresolvable'
                  ? <Ban size={14} color="var(--severity-critical)" />
                  : <CheckCircle2 size={14} color="#059669" />
                }
                <span className="font-bold text-[13px]" style={{ color: report.status === 'unresolvable' ? 'var(--severity-critical)' : '#059669' }}>
                  {report.status === 'unresolvable' ? 'Why This Was Unresolvable' : 'Resolution Summary'}
                </span>
              </div>
              <p className="text-[13px] leading-[1.65] m-0" style={{ color: report.status === 'unresolvable' ? '#7F1D1D' : '#065F46' }}>
                {report.resolutionNote}
              </p>
              {report.status === 'unresolvable' && (
                <button className="mt-3 flex items-center gap-[6px] border-none rounded-lg px-[14px] py-2 text-white text-xs font-bold cursor-pointer"
                  style={{ background: 'var(--severity-critical)' }}>
                  <Phone size={12} /> Call City Veterinary Office
                </button>
              )}
            </section>
          )}

          <section className="bg-white rounded-xl p-[18px] border border-slate-200 mb-2"
            style={{ boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
            <div className="font-bold text-[13px] text-slate-900 mb-4 flex items-center gap-[7px]">
              <Clock size={14} color="var(--primary)" /> Status Timeline
            </div>

            <ul className="m-0 p-0 list-none">
            {report.timeline.map((event, idx) => {
              const isLast = idx === report.timeline.length - 1;
              const colors = timelineColorMap[event.status] ?? timelineColorMap['submitted'];
              return (
                <li key={`${event.timestamp}-${idx}`} className="flex gap-3 relative">
                  {!isLast && (
                    <div className="absolute left-[15px] top-[30px] w-[2px] bg-slate-200 z-0"
                      style={{ bottom: -4 }} />
                  )}

                  <div className="w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center z-[1] relative"
                    style={{
                      background: colors.bg,
                      border: `2px solid ${colors.color}30`,
                      color: colors.color,
                    }}>
                    {timelineIconMap[event.status] ?? <FileText size={13} />}
                  </div>

                  <div className="flex-1" style={{ paddingBottom: isLast ? 0 : 20 }}>
                    <div className="flex items-start justify-between gap-2 mb-[2px]">
                      <div className="font-bold text-[13px] text-slate-900 leading-[1.2]">
                        {event.label}
                      </div>
                      {isLast && (
                        <span className="shrink-0 rounded-[7px] px-2 py-[2px] text-[9px] font-extrabold tracking-[0.06em] uppercase"
                          style={{ background: colors.bg, color: colors.color }}>Latest</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-1 leading-[1.5]">
                      {event.description}
                    </div>
                    {event.note && event.note !== event.description && (
                      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-[10px] py-[7px] text-[11px] text-[#78350F] leading-[1.5] mb-1">
                        Note: {event.note}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <time className="text-[10px] text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDateTime(event.timestamp)}
                      </time>
                      <span className="text-slate-200 text-[10px]"> - </span>
                      <span className="text-[10px] font-semibold rounded-[4px] px-[6px] py-[1px]"
                        style={{ color: colors.color, background: colors.bg }}>
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
              <strong>Immediate danger?</strong> Don't wait for a response - call <strong>911</strong> right away.
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
            className="absolute inset-0"
            style={{ background: 'rgba(15,23,42,0.65)' }}
          />

          <article
            className="relative overflow-hidden rounded-2xl bg-white"
            style={{
              width: 'min(460px, 100%)',
              boxShadow: '0 18px 44px rgba(15,23,42,0.28)',
            }}
          >
            <header className="bg-primary text-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={16} color="#FDE68A" />
                <span className="text-sm font-bold">Confirm Cancellation</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!cancelling) {
                    setConfirmCancelOpen(false);
                  }
                }}
                disabled={cancelling}
                className="w-[30px] h-[30px] rounded-lg inline-flex items-center justify-center text-white"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.12)',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
                aria-label="Close confirmation dialog"
              >
                <X size={14} />
              </button>
            </header>

            <div className="px-4 pt-[14px] pb-[10px]">
              <p className="m-0 text-[13px] text-[#334155] leading-[1.65]">
                Cancel this submitted report? This action is only available while the ticket is still in <strong>Submitted</strong> status.
              </p>
            </div>

            <footer className="px-4 pb-[14px] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
                className="h-[38px] border border-slate-300 rounded-[10px] bg-slate-50 text-slate-600 text-xs font-bold px-[14px]"
                style={{ cursor: cancelling ? 'not-allowed' : 'pointer' }}
              >
                Keep Ticket
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
                className="h-[38px] border-none rounded-[10px] text-white text-xs font-bold px-[14px]"
                style={{
                  background: cancelling ? '#94A3B8' : 'var(--severity-critical)',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Ticket'}
              </button>
            </footer>
          </article>
        </div>
      )}

      {selectedPhoto && (
        <div
          className="citizen-photo-preview-overlay fixed inset-0 z-[220] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPreviewPhotoIndex(null)}
          style={{ background: 'rgba(2,6,23,0.82)' }}
        >
          <div
            className="citizen-photo-preview-stage flex flex-col gap-2"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(980px, 100%)', maxHeight: '100%' }}
          >
            <div className="flex justify-between items-center text-slate-200 text-xs">
              <strong>{selectedPhoto.fileName}</strong>
              <button
                type="button"
                className="citizen-photo-preview-close bg-[#0F172A] border border-[#334155] text-slate-200 rounded-lg px-[10px] py-1 cursor-pointer"
                onClick={() => setPreviewPhotoIndex(null)}
              >
                Close
              </button>
            </div>
            <img
              className="citizen-photo-preview-image w-full rounded-xl object-contain"
              src={selectedPhoto.publicUrl}
              alt={selectedPhoto.fileName}
              style={{ maxHeight: '80vh', background: '#020617' }}
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
  return (
    <div className="col-span-full w-full flex flex-col items-center justify-center min-h-[320px] px-8 py-[60px] text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-[18px] text-slate-300">
        <FileText size={36} />
      </div>
      <div className="font-extrabold text-[17px] text-slate-900 mb-2">
        {query ? 'No results found' : `No ${filter !== 'all' ? filter : ''} reports`}
      </div>
      <div className="text-[13px] text-slate-400 leading-[1.7] max-w-[260px]">
        {query
          ? `No reports match "${query}". Try a different search term.`
          : filter === 'active'
            ? 'You have no active reports at the moment.'
            : filter === 'resolved'
              ? 'None of your reports have been resolved yet.'
              : 'You haven\'t submitted any incident reports yet.'}
      </div>
    </div>
  );
}

function TicketPageLoadingState() {
  return (
    <div className="citizen-content-shell pt-7 pb-7">
      <section
        className="grid place-items-center text-center px-5 py-6"
        style={{
          minHeight: 320,
          borderRadius: 18,
          border: '1px solid #DBEAFE',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 56%, #F8FAFC 100%)',
          boxShadow: '0 12px 28px rgba(30,58,138,0.08)',
        }}
      >
        <div className="grid justify-items-center gap-3">
          <div
            role="status"
            aria-label="Loading my reports"
            className="relative flex items-center justify-center"
            style={{
              width: 104,
              height: 104,
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
            }}
          >
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                inset: -6,
                borderRadius: 9999,
                border: '4px solid rgba(30, 58, 138, 0.16)',
                borderTopColor: 'var(--severity-critical)',
                borderRightColor: 'var(--primary)',
                animation: 'ticketPageSpin 0.9s linear infinite',
              }}
            />
            <img
              src="/favicon.svg"
              alt="TUGON"
              className="block"
              style={{
                width: 40,
                height: 40,
                filter: 'drop-shadow(0 2px 3px rgba(15, 23, 42, 0.15))',
              }}
            />
          </div>
          <p className="m-0 text-primary text-sm font-extrabold">
            Loading your ticket records...
          </p>
          <p className="m-0 text-slate-500 text-xs leading-[1.55]">
            Pulling incident status updates from your barangay queue.
          </p>
        </div>
      </section>
    </div>
  );
}

type FilterKey = 'all' | 'active' | 'resolved';
type DateSortKey = 'newest' | 'oldest';

export default function CitizenMyReports() {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
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
      setMobileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setSortOpen(false);
      setMobileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideHeaderTap);
    document.addEventListener('scroll', handleAnyScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideHeaderTap);
      document.removeEventListener('scroll', handleAnyScroll, true);
    };
  }, []);

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: allCount },
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'resolved', label: 'Resolved', count: resolvedCount },
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
            className="citizen-web-header bg-primary flex items-center h-[60px] shrink-0 sticky top-0 z-50"
            style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.14)' }}
          >
            <div
              className="citizen-web-header-inner flex items-center justify-between gap-3 h-full relative"
              style={{ padding: '0 var(--citizen-content-gutter)' }}
            >
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />

              <div className="flex items-center gap-[10px]">
                <CitizenMobileMenu
                  activeKey="myreports"
                  open={mobileMenuOpen}
                  onToggle={() => {
                    setMobileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setProfileMenuOpen(false);
                    setSortOpen(false);
                  }}
                  onNavigate={(key) => {
                    setMobileMenuOpen(false);
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
                    setMobileMenuOpen(false);
                  }}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                      setSortOpen(false);
                      setMobileMenuOpen(false);
                    }}
                    aria-label="Open profile actions"
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    className="w-9 h-9 rounded-[10px] bg-severity-medium flex items-center justify-center text-white font-extrabold text-sm border-none cursor-pointer"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      className="absolute top-11 right-0 w-[190px] bg-white rounded-xl border border-slate-200 overflow-hidden z-[110]"
                      style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.12)' }}
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
                        Open profile page
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
                        Sign out
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
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
        }}
        mainOnScroll={() => {
          if (sortOpen) {
            setSortOpen(false);
          }
          if (notifOpen) {
            setNotifOpen(false);
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
        }}
      >
        {loadingInitial ? (
          <TicketPageLoadingState />
        ) : (
          <>
            <div className="citizen-content-shell pt-4 pb-0">
              <section
                className="rounded-2xl px-4 pt-4 pb-[14px] mb-[10px] border border-[#DBEAFE]"
                style={{
                  background: 'linear-gradient(140deg, #EFF6FF 0%, #F8FAFC 46%, #FFFFFF 100%)',
                  boxShadow: '0 8px 24px rgba(30,58,138,0.08)',
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-[220px]">
                    <p className="m-0 text-[11px] font-extrabold text-primary tracking-[0.08em] uppercase">
                      Ticket Monitoring
                    </p>
                    <h2 className="mt-[6px] mb-1 text-slate-900 font-extrabold leading-[1.2]"
                      style={{ fontSize: 'clamp(18px,2.4vw,22px)' }}>
                      My Incident Reports
                    </h2>
                    <p className="m-0 text-slate-500 text-xs leading-[1.55]">
                      Track your submitted reports, review timeline updates, and open ticket details anytime.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-white border border-[#BFDBFE] text-primary rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      Total: {allCount}
                    </span>
                    <span className="bg-[#FFFBEB] border border-[#FDE68A] text-severity-medium rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      Active: {activeCount}
                    </span>
                    <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] rounded-full px-[10px] py-[6px] text-[11px] font-bold">
                      Resolved: {resolvedCount}
                    </span>
                  </div>
                </div>
              </section>

              <section
                className="bg-white border border-[#DBEAFE] rounded-2xl p-3"
                style={{ boxShadow: '0 10px 24px rgba(15,23,42,0.07)' }}
              >
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-[10px] border-[1.5px] border-slate-200 min-w-[240px]"
                  style={{ transition: 'border-color 0.2s' }}>
                  <Search size={14} color="#94A3B8" className="shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by ID, type, location..."
                    className="flex-1 border-none bg-transparent text-[13px] text-slate-900 outline-none"
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="bg-transparent border-none cursor-pointer text-slate-400 flex p-0">
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
                    {sortBy === 'newest' ? 'Newest' : 'Oldest'}
                    <ChevronDown size={12} />
                  </button>
                  {sortOpen && (
                    <div className="citizen-sort-panel absolute top-[calc(100%+4px)] right-0 bg-white rounded-xl border border-slate-200 overflow-hidden z-[60] min-w-[130px]"
                      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                      {(['newest', 'oldest'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => { setSortBy(opt); setSortOpen(false); }}
                          className="block w-full text-left px-[14px] py-[10px] border-none cursor-pointer text-[13px]"
                          style={{
                            background: sortBy === opt ? '#EFF6FF' : '#fff',
                            color: sortBy === opt ? 'var(--primary)' : '#475569',
                            fontWeight: sortBy === opt ? 700 : 400,
                            fontFamily: "'Roboto', sans-serif",
                          }}
                        >
                          {opt === 'newest' ? 'Newest First' : 'Oldest First'}
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
                      onClick={() => setFilter(tab.key)}
                      className="flex-1 bg-transparent border-none cursor-pointer px-1 pt-2 pb-[10px] flex flex-col items-center gap-[2px] relative"
                      style={{ transition: 'all 0.2s' }}
                    >
                      <span className="flex items-center gap-[5px] text-[13px]"
                        style={{
                          fontWeight: isActive ? 800 : 500,
                          color: isActive ? 'var(--primary)' : '#94A3B8',
                        }}>
                        {tab.label}
                        <span className="rounded-[20px] px-[7px] py-[1px] text-[10px] font-bold"
                          style={{
                            background: isActive ? 'var(--primary)' : '#F1F5F9',
                            color: isActive ? '#fff' : '#94A3B8',
                          }}>
                          {tab.count}
                        </span>
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 h-[3px] bg-primary rounded-t-[3px]"
                          style={{ left: '15%', right: '15%' }} />
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
                  Showing <strong className="text-slate-900">{filtered.length}</strong> report{filtered.length !== 1 ? 's' : ''}
                  {query && ` for "${query}"`}
                </span>
                {filtered.length > 0 && (
                  <span className="citizen-reports-summary-hint text-[11px] text-slate-400">
                    Open a card to view details
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
                    Reports are kept on record for up to <strong>2 years</strong>. For urgent concerns, always call <strong>911</strong> directly.
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

