import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Search, Filter, X, ChevronRight,
  MapPin, Clock, FileText, User, Calendar, Camera, Mic,
  Flame, Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Droplets, Car, Activity, Zap, CloudRain, CheckCircle2,
  MessageSquare, Phone, RefreshCw, Eye, XCircle, Ban,
  ChevronDown, SlidersHorizontal, Info,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { OfficialPageInitialLoader } from '../components/OfficialPageInitialLoader';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import {
  citizenReportsApi,
  type ApiCitizenReport,
  type ApiIncidentType,
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
  | 'fire' | 'pollution' | 'noise' | 'crime' | 'road_hazard'
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
  if (category === 'Hazards and Safety') return 'fire';
  if (category === 'Garbage and Sanitation') return 'pollution';
  if (category === 'Public Disturbance') return 'noise';
  if (category === 'Neighbor Disputes / Lupon') return 'crime';
  if (category === 'Road and Street Issues') return 'road_hazard';
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
    label: 'Submitted', color: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE',
    dotColor: '#3B82F6', icon: FileText, step: 1, filterGroup: 'active',
    description: 'Your report has been received by the system.',
  },
  under_review: {
    label: 'Under Review', color: '#B4730A', bg: '#FFFBEB', border: '#FDE68A',
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
    label: 'Unresolvable', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA',
    dotColor: '#EF4444', icon: Ban, step: 4, filterGroup: 'resolved',
    description: 'This report could not be resolved at this time.',
  },
};

const typeConfig: Record<CitizenReportType, {
  label: string; color: string; bg: string; icon: React.FC<{ size?: number }>;
}> = {
  fire:          { label: 'Fire',           color: '#B91C1C', bg: '#FEE2E2', icon: Flame },
  pollution:     { label: 'Pollution',      color: '#0F766E', bg: '#CCFBF1', icon: Wind },
  noise:         { label: 'Noise',          color: '#7C3AED', bg: '#EDE9FE', icon: Volume2 },
  crime:         { label: 'Crime',          color: '#1E3A8A', bg: '#DBEAFE', icon: AlertCircle },
  road_hazard:   { label: 'Road Hazard',    color: '#B4730A', bg: '#FEF3C7', icon: AlertTriangle },
  flood:         { label: 'Flood',          color: '#0369A1', bg: '#E0F2FE', icon: Droplets },
  accident:      { label: 'Accident',       color: '#C2410C', bg: '#FFEDD5', icon: Car },
  medical:       { label: 'Medical',        color: '#B91C1C', bg: '#FEE2E2', icon: Activity },
  infrastructure:{ label: 'Infrastructure', color: '#92400E', bg: '#FEF3C7', icon: Zap },
  other:         { label: 'Other',          color: '#475569', bg: '#F1F5F9', icon: MoreHorizontal },
};

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  API LOADED REPORTS
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
const MY_REPORTS: CitizenReport[] = [];

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   HELPERS
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
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

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   CITIZEN STATUS BADGE - 6 statuses
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
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

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   WORKFLOW PROGRESS DOTS
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
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
  const terminalColor = isFailed ? '#B91C1C' : '#059669';
  const terminalBg   = isFailed ? '#FEF2F2'  : '#ECFDF5';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      {WORKFLOW_STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done  = stepNum < currentStep || (isTerminal && stepNum <= 4);
        const active = stepNum === currentStep && !isTerminal;
        const stepColor = isTerminal && stepNum === 4 ? terminalColor
          : done || active ? '#1E3A8A' : '#CBD5E1';
        const stepBg = isTerminal && stepNum === 4 ? terminalBg
          : done ? '#1E3A8A' : active ? '#EFF6FF' : '#F1F5F9';
        const stepBorder = isTerminal && stepNum === 4 ? terminalColor
          : done ? '#1E3A8A' : active ? '#3B82F6' : '#E2E8F0';

        return (
          <div key={s.key} style={{ display: 'contents' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: stepBg, border: `2px solid ${stepBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                {(done || (isTerminal && stepNum === 4)) ? (
                  <span style={{ fontSize: 9, color: isTerminal && stepNum === 4 ? terminalColor : '#fff' }}>
                    {isTerminal && stepNum === 4 ? (isFailed ? 'X' : 'OK') : 'OK'}
                  </span>
                ) : active ? (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1E3A8A' }} />
                ) : (
                  <span style={{ fontSize: 8, color: '#CBD5E1', fontWeight: 700 }}>{stepNum}</span>
                )}
              </div>
              <span style={{ fontSize: 8, color: done || active ? '#1E3A8A' : '#CBD5E1', fontWeight: done || active ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                {isTerminal && stepNum === 4 ? citizenStatusConfig[status].label : s.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 14,
                background: stepNum < currentStep || (isTerminal && stepNum < 4)
                  ? '#1E3A8A' : '#E2E8F0',
                borderRadius: 1, transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   REPORT CARD
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
function ReportCard({ report, onClick }: { report: CitizenReport; onClick: () => void }) {
  const tc = typeConfig[report.type];
  const sc = citizenStatusConfig[report.status];
  const Icon = tc.icon;

  return (
    <button
      className="citizen-report-card citizen-report-card-modern"
      onClick={onClick}
      style={{
        width: '100%', background: '#fff', border: '1px solid #E2E8F0',
        borderRadius: 18, padding: 0, cursor: 'pointer', textAlign: 'left',
        boxShadow: '0 4px 14px rgba(15,23,42,0.06)', marginBottom: 12,
        overflow: 'hidden', transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
      }}
    >
      <div style={{ padding: '14px 14px 0 14px' }}>
        {/* Top row: ID + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: tc.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: tc.color, flexShrink: 0,
            }}>
              <Icon size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1E293B', lineHeight: 1.1 }}>
                {report.id}
              </div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 1, fontWeight: 500 }}>
                {tc.label}
              </div>
            </div>
          </div>
          <CitizenStatusBadge status={report.status} size="sm" />
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 7 }}>
          <MapPin size={11} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, flex: 1 }}>
            {report.location}, {report.barangay}
          </span>
        </div>

        {/* Description excerpt */}
        <div style={{
          fontSize: 12, color: '#64748B', lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          marginBottom: 10,
        }}>
          {report.description}
        </div>

        {/* Date + evidence chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} color="#94A3B8" />
            <span style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(report.submittedAt)}</span>
          </div>
          <span style={{ color: '#CBD5E1', fontSize: 10 }}> - </span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{timeAgo(report.submittedAt)}</span>
          {report.hasPhotos && (
            <span style={{ display: 'contents' }}>
              <span style={{ color: '#CBD5E1', fontSize: 10 }}> - </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#F1F5F9', borderRadius: 6, padding: '2px 6px' }}>
                <Camera size={9} color="#64748B" />
                <span style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>{report.photoCount}</span>
              </div>
            </span>
          )}
          {report.hasAudio && (
            <span style={{ display: 'contents' }}>
              <span style={{ color: '#CBD5E1', fontSize: 10 }}> - </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#F1F5F9', borderRadius: 6, padding: '2px 6px' }}>
                <Mic size={9} color="#64748B" />
                <span style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>Audio</span>
              </div>
            </span>
          )}
        </div>
      </div>

      {/* Workflow progress strip */}
      <div style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderTop: '1px solid #F1F5F9', padding: '10px 16px 12px' }}>
        <WorkflowProgress status={report.status} />
      </div>

      {/* View details footer */}
      <div style={{
        background: `${citizenStatusConfig[report.status].bg}`,
        borderTop: `1px solid ${citizenStatusConfig[report.status].border}`,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: citizenStatusConfig[report.status].color, fontWeight: 600 }}>
          {citizenStatusConfig[report.status].description}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: citizenStatusConfig[report.status].color }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Details</span>
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
    submitted:    { color: '#1E3A8A', bg: '#EFF6FF' },
    under_review: { color: '#B4730A', bg: '#FFFBEB' },
    in_progress:  { color: '#0F766E', bg: '#F0FDFA' },
    resolved:     { color: '#059669', bg: '#ECFDF5' },
    closed:       { color: '#475569', bg: '#F8FAFC' },
    unresolvable: { color: '#B91C1C', bg: '#FEF2F2' },
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
    <div className="citizen-report-modal" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
      />

      <article style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        background: '#F8FAFC', borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
        animation: 'slideUp 0.32s cubic-bezier(0.4,0,0.2,1)',
        maxWidth: 960, margin: '0 auto',
      }}>
        <header style={{
          background: '#fff', paddingTop: 10, paddingBottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          borderBottom: '1px solid #F1F5F9', flexShrink: 0,
        }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: '#E2E8F0', marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 16px 14px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1E293B' }}>Report Details</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{report.id}</div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <section style={{
            border: '1.5px solid #E2E8F0', marginBottom: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
          }}>
            {/* Colored header */}
            <div style={{
              borderBottom: `3px solid ${tc.color}`,
              padding: '18px 18px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, background: tc.bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color,
                boxShadow: `0 2px 10px ${tc.color}28`,
              }}>
                <TypeIcon size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1E293B', lineHeight: 1.15, marginBottom: 4 }}>
                  {tc.label} Incident
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <CitizenStatusBadge status={report.status} size="md" />
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    background: report.severity === 'critical' ? '#FEE2E2' : report.severity === 'high' ? '#FFEDD5' : report.severity === 'medium' ? '#FEF3C7' : '#D1FAE5',
                    color: report.severity === 'critical' ? '#B91C1C' : report.severity === 'high' ? '#C2410C' : report.severity === 'medium' ? '#B4730A' : '#059669',
                    borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase',
                  }}>
                    {report.severity} severity
                  </span>
                </div>
              </div>
            </div>

            <dl style={{ margin: 0, padding: '4px 18px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { icon: <FileText size={13} />, label: 'Ticket ID', value: report.id },
                { icon: <MapPin size={13} />, label: 'Location', value: `${report.location}, ${report.barangay}, ${report.district}` },
                { icon: <Calendar size={13} />, label: 'Date Submitted', value: formatDateTime(report.submittedAt) },
                { icon: <Clock size={13} />, label: 'Last Updated', value: formatDateTime(report.updatedAt) },
                ...(report.assignedOfficer ? [{ icon: <User size={13} />, label: 'Assigned Officer', value: `${report.assignedOfficer} - ${report.assignedUnit}` }] : []),
                ...(report.affectedCount ? [{ icon: <AlertTriangle size={13} />, label: 'Est. People Affected', value: `~${report.affectedCount} persons` }] : []),
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC', padding: '10px 12px' }}>
                  <dt style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <span style={{ color: tc.color }}>{icon}</span>
                    {label}
                  </dt>
                  <dd style={{ margin: 0, fontSize: 13, color: '#0F172A', lineHeight: 1.5, fontWeight: 500 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section style={{
            background: '#fff', borderRadius: 18, padding: '16px',
            border: '1px solid #E2E8F0', marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MessageSquare size={14} color={tc.color} />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>Description</span>
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{report.description}</p>
          </section>

          {canCancel && (
            <section style={{
              background: '#FFFBEB',
              borderRadius: 14,
              padding: '12px 14px',
              border: '1px solid #FDE68A',
              marginBottom: 16,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
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
                style={{
                  marginTop: 10,
                  background: cancelling ? '#94A3B8' : '#B91C1C',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 14px',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Report'}
              </button>
              {cancelError && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#B91C1C', lineHeight: 1.5 }}>{cancelError}</p>
              )}
            </section>
          )}

          {(report.hasPhotos || report.hasAudio) && (
            <section style={{
              background: '#fff', borderRadius: 18, padding: '16px',
              border: '1px solid #E2E8F0', marginBottom: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginBottom: 12 }}>
                Evidence Attached
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: hasPreviewableEvidence ? 12 : 0, flexWrap: 'wrap' }}>
                {report.hasPhotos ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', borderRadius: 10, padding: '8px 12px', border: '1px solid #BFDBFE' }}>
                    <Camera size={14} color="#1E3A8A" />
                    <span style={{ fontSize: 12, color: '#1E3A8A', fontWeight: 700 }}>{report.photoCount} Photo{report.photoCount > 1 ? 's' : ''}</span>
                  </div>
                ) : null}
                {report.hasAudio ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EDE9FE', borderRadius: 10, padding: '8px 12px', border: '1px solid #DDD6FE' }}>
                    <Mic size={14} color="#7C3AED" />
                    <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 700 }}>Voice Recording</span>
                  </div>
                ) : null}
              </div>

              {photoEvidence.length > 0 && (
                <section style={{ marginBottom: audioEvidence.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>Photos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
                    {photoEvidence.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreviewPhotoIndex(index)}
                        style={{ border: '1px solid #DBEAFE', borderRadius: 10, padding: 0, overflow: 'hidden', background: '#EFF6FF', cursor: 'pointer' }}
                      >
                        <img
                          src={item.publicUrl}
                          alt={item.fileName}
                          style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {audioEvidence.length > 0 && (
                <section>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>Audio</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {audioEvidence.map((item) => (
                      <article key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', background: '#F8FAFC' }}>
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 600 }}>{item.fileName}</div>
                        <audio controls preload="metadata" src={item.publicUrl} style={{ width: '100%' }} />
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!hasPreviewableEvidence && (
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                  Evidence metadata is available, but preview links are not currently accessible for this report.
                </p>
              )}
            </section>
          )}

          {report.resolutionNote && (
            <section style={{
              background: report.status === 'unresolvable' ? '#FEF2F2' : '#ECFDF5',
              borderRadius: 18, padding: '16px',
              border: `1.5px solid ${report.status === 'unresolvable' ? '#FECACA' : '#6EE7B7'}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                {report.status === 'unresolvable'
                  ? <Ban size={14} color="#B91C1C" />
                  : <CheckCircle2 size={14} color="#059669" />
                }
                <span style={{ fontWeight: 700, fontSize: 13, color: report.status === 'unresolvable' ? '#B91C1C' : '#059669' }}>
                  {report.status === 'unresolvable' ? 'Why This Was Unresolvable' : 'Resolution Summary'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: report.status === 'unresolvable' ? '#7F1D1D' : '#065F46', lineHeight: 1.65, margin: 0 }}>
                {report.resolutionNote}
              </p>
              {report.status === 'unresolvable' && (
                <button style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                  background: '#B91C1C', border: 'none', borderRadius: 10,
                  padding: '8px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  <Phone size={12} /> Call City Veterinary Office
                </button>
              )}
            </section>
          )}

          <section style={{
            background: '#fff', borderRadius: 18, padding: '18px',
            border: '1px solid #E2E8F0', marginBottom: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={14} color="#1E3A8A" /> Status Timeline
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {report.timeline.map((event, idx) => {
              const isLast = idx === report.timeline.length - 1;
              const colors = timelineColorMap[event.status] ?? timelineColorMap['submitted'];
              return (
                <li key={`${event.timestamp}-${idx}`} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {!isLast && (
                    <div style={{
                      position: 'absolute', left: 15, top: 30, bottom: -4,
                      width: 2, background: '#E2E8F0', zIndex: 0,
                    }} />
                  )}

                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: colors.bg, border: `2px solid ${colors.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: colors.color, zIndex: 1, position: 'relative',
                  }}>
                    {timelineIconMap[event.status] ?? <FileText size={13} />}
                  </div>

                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', lineHeight: 1.2 }}>
                        {event.label}
                      </div>
                      {isLast && (
                        <span style={{
                          background: colors.bg, color: colors.color,
                          borderRadius: 20, padding: '2px 8px', fontSize: 9,
                          fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                          flexShrink: 0,
                        }}>Latest</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, lineHeight: 1.5 }}>
                      {event.description}
                    </div>
                    {event.note && event.note !== event.description && (
                      <div style={{
                        background: '#FFFBEB', border: '1px solid #FDE68A',
                        borderRadius: 8, padding: '7px 10px', fontSize: 11,
                        color: '#78350F', lineHeight: 1.5, marginBottom: 4,
                      }}>
                        Note: {event.note}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <time style={{ fontSize: 10, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDateTime(event.timestamp)}
                      </time>
                      <span style={{ color: '#E2E8F0', fontSize: 10 }}> - </span>
                      <span style={{
                        fontSize: 10, color: colors.color, fontWeight: 600,
                        background: colors.bg, borderRadius: 4, padding: '1px 6px',
                      }}>
                        {event.actor} - {event.actorRole}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          </section>

          <section style={{
            background: '#FEF2F2', borderRadius: 14, padding: '12px 14px',
            border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Info size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.6, margin: 0 }}>
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 230,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={() => {
              if (!cancelling) {
                setConfirmCancelOpen(false);
              }
            }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.65)' }}
          />

          <article
            style={{
              position: 'relative',
              width: 'min(460px, 100%)',
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 18px 44px rgba(15,23,42,0.28)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                background: '#1E3A8A',
                color: '#FFFFFF',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <AlertTriangle size={16} color="#FDE68A" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Confirm Cancellation</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!cancelling) {
                    setConfirmCancelOpen(false);
                  }
                }}
                disabled={cancelling}
                style={{
                  width: 30,
                  height: 30,
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
                aria-label="Close confirmation dialog"
              >
                <X size={14} />
              </button>
            </header>

            <div style={{ padding: '14px 16px 10px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.65 }}>
                Cancel this submitted report? This action is only available while the ticket is still in <strong>Submitted</strong> status.
              </p>
            </div>

            <footer
              style={{
                padding: '0 16px 14px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
                style={{
                  height: 38,
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 14px',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                }}
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
                style={{
                  height: 38,
                  border: 'none',
                  borderRadius: 10,
                  background: cancelling ? '#94A3B8' : '#B91C1C',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 14px',
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
          className="citizen-photo-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPreviewPhotoIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 220,
            background: 'rgba(2,6,23,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="citizen-photo-preview-stage"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#E2E8F0', fontSize: 12 }}>
              <strong>{selectedPhoto.fileName}</strong>
              <button
                type="button"
                className="citizen-photo-preview-close"
                onClick={() => setPreviewPhotoIndex(null)}
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#E2E8F0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <img className="citizen-photo-preview-image" src={selectedPhoto.publicUrl} alt={selectedPhoto.fileName} style={{ maxHeight: '80vh', width: '100%', objectFit: 'contain', borderRadius: 12, background: '#020617' }} />
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
    <div style={{
      gridColumn: '1 / -1',
      width: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, padding: '60px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, color: '#CBD5E1',
      }}>
        <FileText size={36} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17, color: '#1E293B', marginBottom: 8 }}>
        {query ? 'No results found' : `No ${filter !== 'all' ? filter : ''} reports`}
      </div>
      <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, maxWidth: 260 }}>
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

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      try {
        const response = await citizenReportsApi.getMyReports();
        if (!isMounted) return;
        setReports(response.reports.map(mapApiReport));
      } catch {
        // Keep the current list when API is unavailable.
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    }

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (loadingInitial) {
    return <OfficialPageInitialLoader label="Loading my reports page" minHeight="calc(100vh - 120px)" />;
  }

  return (
    <div style={{ position: 'relative' }}>
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
            className="citizen-web-header"
            style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            height: 60,
            flexShrink: 0,
            position: 'sticky', top: 0, zIndex: 50,
            boxShadow: '0 2px 16px rgba(30,58,138,0.45)',
          }}
          >
            <div
              className="citizen-web-header-inner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '0 var(--citizen-content-gutter)',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <button
                onClick={() => navigate('/citizen')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="Go to citizen home"
              >
                <img
                  src="/tugon-header-logo.svg"
                  alt="TUGON Citizen Portal"
                  style={{ height: 38, width: 'auto', display: 'block' }}
                />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                <div style={{ position: 'relative' }}>
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
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #B4730A, #D97706)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      style={{
                        position: 'absolute',
                        top: 44,
                        right: 0,
                        width: 190,
                        background: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        zIndex: 110,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '11px 12px',
                          background: '#fff',
                          border: 'none',
                          borderBottom: '1px solid #F1F5F9',
                          color: '#1E293B',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
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
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '11px 12px',
                          background: '#fff',
                          border: 'none',
                          color: '#B91C1C',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
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
        <div className="citizen-content-shell" style={{ paddingTop: 16, paddingBottom: 0 }}>
          <section
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
              padding: 12,
            }}
          >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: '#F8FAFC', borderRadius: 12, padding: '10px 12px',
              border: '1.5px solid #E2E8F0', transition: 'border-color 0.2s',
              minWidth: 240,
            }}>
              <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by ID, type, location..."
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: 13, color: '#1E293B', outline: 'none',
                  fontFamily: "'Roboto', sans-serif",
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="citizen-sort-panel" style={{ position: 'relative' }}>
              <button
                onClick={() => setSortOpen(v => !v)}
                style={{
                  height: 42, background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 12, padding: '0 12px', display: 'flex', alignItems: 'center',
                  gap: 5, cursor: 'pointer', color: '#475569', fontWeight: 600, fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                <SlidersHorizontal size={13} />
                {sortBy === 'newest' ? 'Newest' : 'Oldest'}
                <ChevronDown size={12} />
              </button>
              {sortOpen && (
                <div className="citizen-sort-panel" style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 60, minWidth: 130,
                }}>
                  {(['newest', 'oldest'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setSortOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', border: 'none', cursor: 'pointer',
                        background: sortBy === opt ? '#EFF6FF' : '#fff',
                        color: sortBy === opt ? '#1E3A8A' : '#475569',
                        fontSize: 13, fontWeight: sortBy === opt ? 700 : 400,
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

          <div style={{ display: 'flex', padding: '10px 2px 0', gap: 0, borderBottom: 'none' }}>
            {FILTER_TABS.map(tab => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  style={{
                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 4px 10px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2, position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: isActive ? 800 : 500,
                    fontSize: 13,
                    color: isActive ? '#1E3A8A' : '#94A3B8',
                  }}>
                    {tab.label}
                    <span style={{
                      background: isActive ? '#1E3A8A' : '#F1F5F9',
                      color: isActive ? '#fff' : '#94A3B8',
                      borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                    }}>
                      {tab.count}
                    </span>
                  </span>
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: '15%', right: '15%',
                      height: 3, background: '#1E3A8A', borderRadius: '3px 3px 0 0',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
          </section>
        </div>

        <div onClick={() => sortOpen && setSortOpen(false)}>
          <div className="citizen-content-shell citizen-reports-summary-row" style={{ paddingTop: 10, paddingBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="citizen-reports-summary-text" style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
              Showing <strong style={{ color: '#1E293B' }}>{filtered.length}</strong> report{filtered.length !== 1 ? 's' : ''}
              {query && ` for "${query}"`}
            </span>
            {filtered.length > 0 && (
              <span className="citizen-reports-summary-hint" style={{ fontSize: 11, color: '#94A3B8' }}>
                Open a card to view details
              </span>
            )}
          </div>

          <div className="citizen-content-shell citizen-reports-grid" style={{ paddingTop: 0, paddingBottom: 24, display: 'grid', gap: 12 }}>
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
            <div className="citizen-content-shell citizen-reports-footnote-wrap" style={{ paddingTop: 0, paddingBottom: 32, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Info size={13} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
              <p className="citizen-reports-footnote" style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Reports are kept on record for up to <strong>2 years</strong>. For urgent concerns, always call <strong>911</strong> directly.
              </p>
            </div>
          )}
        </div>

        <style>{`
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

