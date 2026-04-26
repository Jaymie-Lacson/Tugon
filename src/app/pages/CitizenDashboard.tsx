import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation, LanguageToggle } from '../i18n';
import {
  Shield, Bell, MapPin, FileText, User, Plus,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
  Droplets, Car, Activity, Zap, AlertCircle,
  Phone, Info, CloudRain, X as XIcon,
  ArrowRight, ArrowLeft,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { RoleHomeLogo } from '../components/RoleHomeLogo';
import { IncidentMap } from '../components/IncidentMap';
import { StatusBadge } from '../components/StatusBadge';
import CardSkeleton from '../components/ui/CardSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import {
  incidentTypeConfig,
  Incident,
  IncidentType,
  isIncidentVisibleOnMap,
} from '../data/incidents';
import { citizenReportsApi } from '../services/citizenReportsApi';
import { mapTicketStatus, reportToIncident } from '../utils/incidentAdapters';
import { clearAuthSession, getAuthSession, patchAuthSessionUser, performLogout } from '../utils/authSession';
import { ThemeToggle } from '../components/ThemeToggle';
import { useQueryClient } from '@tanstack/react-query';
import { useMyReports, citizenReportsKeys } from '../hooks/useCitizenReportsQueries';
import { useMyVerificationStatus } from '../hooks/useProfileVerificationQueries';

/* ── helpers ─────────────────────────────────────────────────────────── */
interface CitizenMyReport {
  id: string;
  type: IncidentType;
  description: string;
  status: Incident['status'];
  reportedAt: string;
  location: string;
}

interface CitizenVerificationPreview {
  isVerified: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUESTED' | null;
  rejectionReason: string | null;
  idImageUrl: string | null;
  isBanned: boolean;
}

function getVerificationSummary(verification: CitizenVerificationPreview) {
  if (verification.isBanned) {
    return {
      title: 'Account Restricted',
      detail: 'Please coordinate with your barangay office for account assistance.',
      statusLabel: 'Restricted',
      color: '#991B1B',
      bg: '#FEE2E2',
      surfaceClass: 'border border-[rgba(186,26,26,0.22)] bg-[var(--error-container)]',
      titleClass: 'text-[var(--error)]',
    };
  }

  if (verification.isVerified || verification.verificationStatus === 'APPROVED') {
    return {
      title: 'Verified Citizen',
      detail: 'Your resident ID has been approved.',
      statusLabel: 'Verified',
      color: '#065F46',
      bg: '#DCFCE7',
      surfaceClass: 'border border-[rgba(5,150,105,0.24)] bg-[var(--severity-low-bg)]',
      titleClass: 'text-[var(--severity-low)]',
    };
  }

  if (verification.verificationStatus === 'PENDING') {
    return {
      title: 'Verification Under Review',
      detail: 'Your submitted ID is currently being reviewed by barangay staff.',
      statusLabel: 'Pending Review',
      color: '#92400E',
      bg: '#FEF3C7',
      surfaceClass: 'border border-[var(--secondary-fixed-dim)] bg-[var(--secondary-fixed)]',
      titleClass: 'text-[var(--secondary)]',
    };
  }

  if (verification.verificationStatus === 'REJECTED' || verification.verificationStatus === 'REUPLOAD_REQUESTED') {
    return {
      title: 'Action Needed: Re-upload ID',
      detail: verification.rejectionReason
        ? `Reason: ${verification.rejectionReason}`
        : 'Your previous ID upload needs to be replaced with a clearer valid ID.',
      statusLabel: 'Re-upload Required',
      color: 'var(--severity-critical)',
      bg: '#FEE2E2',
      surfaceClass: 'border border-[rgba(186,26,26,0.22)] bg-[var(--error-container)]',
      titleClass: 'text-[var(--error)]',
    };
  }

  return {
    title: 'ID Verification Required',
    detail: 'Submit one valid ID photo so your account can be verified.',
    statusLabel: 'Not Submitted',
    color: 'var(--primary)',
    bg: '#DBEAFE',
    surfaceClass: 'border border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)]',
    titleClass: 'text-[var(--primary)]',
  };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const typeIcon: Record<IncidentType, React.ReactNode> = {
  flood: <Droplets size={14} />,
  accident: <Car size={14} />,
  medical: <Activity size={14} />,
  crime: <AlertCircle size={14} />,
  infrastructure: <Zap size={14} />,
  typhoon: <CloudRain size={14} />,
};

type AccentTone = 'critical' | 'warning' | 'primary' | 'success' | 'slate';

function resolveAccentTone(accent: string): AccentTone {
  if (accent === 'var(--severity-critical)') return 'critical';
  if (accent === 'var(--severity-medium)') return 'warning';
  if (accent === 'var(--primary)') return 'primary';
  if (accent === '#059669') return 'success';
  return 'slate';
}

const statToneClass: Record<AccentTone, { card: string; icon: string }> = {
  critical: {
    card: 'border border-[var(--outline-variant)] bg-card',
    icon: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
  },
  warning: {
    card: 'border border-[var(--outline-variant)] bg-card',
    icon: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
  },
  primary: {
    card: 'border border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)]',
    icon: 'bg-[var(--primary)] text-white',
  },
  success: {
    card: 'border border-[var(--outline-variant)] bg-card',
    icon: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
  },
  slate: {
    card: 'border border-[var(--outline-variant)] bg-card',
    icon: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
  },
};

const quickActionToneClass: Record<AccentTone, {
  card: string;
  icon: string;
  cta: string;
}> = {
  critical: {
    card: 'bg-card border border-[var(--outline-variant)]',
    icon: 'bg-[var(--error-container)] text-[var(--error)]',
    cta: 'text-[var(--error)]',
  },
  warning: {
    card: 'bg-card border border-[var(--outline-variant)]',
    icon: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    cta: 'text-[var(--secondary)]',
  },
  primary: {
    card: 'bg-card border border-[var(--outline-variant)]',
    icon: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
    cta: 'text-[var(--primary)]',
  },
  success: {
    card: 'bg-card border border-[var(--outline-variant)]',
    icon: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
    cta: 'text-[var(--severity-low)]',
  },
  slate: {
    card: 'bg-card border border-[var(--outline-variant)]',
    icon: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
    cta: 'text-[var(--on-surface-variant)]',
  },
};

const incidentIconToneClass: Record<IncidentType, string> = {
  flood: 'bg-[var(--primary-fixed)] text-[var(--primary-container)]',
  accident: 'bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
  medical: 'bg-[var(--error-container)] text-[var(--error)]',
  crime: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
  infrastructure: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
  typhoon: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
};

/* ── sub-components ──────────────────────────────────────────────────── */
function AlertBanner({ incidents }: { incidents: Incident[] }) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();
  const criticalCount = incidents.filter(
    (item) => (item.status === 'active' || item.status === 'responding') && item.severity === 'critical',
  ).length;
  if (dismissed || criticalCount === 0) return null;
  return (
    <div className="bg-severity-critical px-4 py-2.5 text-[13px] text-white flex items-center gap-3">
      <AlertTriangle size={15} className="shrink-0" />
      <span className="flex-1">
        {criticalCount > 1
          ? t('citizen.dashboard.alertBannerPlural', { count: criticalCount })
          : t('citizen.dashboard.alertBannerSingle', { count: criticalCount })}
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-white/70 transition-colors hover:text-white"
      >
        <XIcon size={15} />
      </button>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
}) {
  const toneKey = resolveAccentTone(accent);
  const tone = statToneClass[toneKey];
  const isHighlighted = toneKey === 'primary';
  return (
    <div className={`flex min-h-[112px] min-w-0 items-stretch overflow-hidden rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${tone.card}`}>
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-4 text-center">
        <div className="flex min-w-0 flex-col items-center justify-center">
          <div className={`text-[40px] font-extrabold leading-none tracking-[-0.02em] ${isHighlighted ? 'text-[var(--primary)]' : 'text-foreground'}`}>{value}</div>
          <div className={`mt-1.5 max-w-full truncate text-[13px] font-semibold ${isHighlighted ? 'text-[var(--primary)]/85' : 'text-muted-foreground'}`}>{label}</div>
        </div>
      </div>
      <div className={`flex w-[84px] shrink-0 items-center justify-center sm:w-[92px] ${tone.icon}`}>
        <div className="scale-[1.35]">{icon}</div>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon,
  label,
  sublabel,
  accent,
  onClick,
  featured,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accent: string;
  onClick: () => void;
  featured?: boolean;
}) {
  const tone = quickActionToneClass[resolveAccentTone(accent)];
  return (
    <button
      onClick={onClick}
      className={`group w-full cursor-pointer rounded-lg px-4 py-4 text-left transition-colors duration-150 flex items-start gap-3.5 ${
        featured
          ? 'border-0 bg-primary hover:bg-primary/90'
          : `${tone.card} hover:bg-[var(--surface-container-low)]`
      }`}
    >
      <div className={`size-10 rounded-md flex items-center justify-center shrink-0 ${featured ? 'bg-[var(--primary-foreground)]/15 text-[var(--primary-foreground)]' : tone.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-[2px]">
        <div className={`text-[14px] font-semibold tracking-[-0.005em] ${featured ? 'text-[var(--primary-foreground)]' : 'text-[var(--on-surface)]'}`}>
          {label}
        </div>
        <div className={`text-[12px] leading-[1.5] mt-0.5 ${featured ? 'text-[var(--primary-foreground)]/70' : 'text-[var(--on-surface-variant)]'}`}>
          {sublabel}
        </div>
      </div>
      <ArrowRight
        size={15}
        className={`mt-1 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${featured ? 'text-[var(--primary-foreground)]/70' : 'text-[var(--outline)]'}`}
      />
    </button>
  );
}

function RecentIncidentRow({ report }: { report: CitizenMyReport }) {
  const cfg = incidentTypeConfig[report.type];
  return (
    <div className="flex items-center gap-3 py-[11px] border-b border-[var(--outline-variant)]">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${incidentIconToneClass[report.type]}`}>
        {typeIcon[report.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-[var(--on-surface)] truncate">
          {cfg.label} - {report.id}
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--outline)]">
          {timeAgo(report.reportedAt)} - {report.location}
        </div>
      </div>
      <StatusBadge status={report.status} size="sm" pulse />
    </div>
  );
}

function MyReportRow({
  report,
}: {
  report: CitizenMyReport;
}) {
  const cfg = incidentTypeConfig[report.type];
  return (
    <div className="flex items-center gap-3 py-[11px] border-b border-[var(--outline-variant)]">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${incidentIconToneClass[report.type]}`}>
        {typeIcon[report.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-[var(--on-surface)] truncate">
          {report.description}
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--outline)]">
          {report.id} - {timeAgo(report.reportedAt)}
        </div>
      </div>
      <StatusBadge status={report.status} size="sm" />
    </div>
  );
}

type Tab = 'home' | 'report' | 'map' | 'myreports' | 'profile';

type CitizenNotificationItem = {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  action: 'open-map-incident' | 'open-my-reports' | 'open-home' | 'open-verification';
  incidentId?: string;
  reportId?: string;
};

/* ── main page ──────────────────────────────────────────────────────────────── */
export default function CitizenDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen';
  const firstName = fullName.split(' ')[0] || 'Citizen';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const barangayLabel = session?.user.barangayCode ? `Barangay ${session.user.barangayCode}` : 'Tondo Cluster';
  const todayLabel = new Date().toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const nowHour = new Date().getHours();
  const greetingLabel = nowHour < 12 ? t('citizen.dashboard.greetingMorning') : nowHour < 18 ? t('citizen.dashboard.greetingAfternoon') : t('citizen.dashboard.greetingEvening');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { notificationItems: reportNotificationItems, markAllNotificationsRead } = useCitizenReportNotifications();
  const [verificationPreview, setVerificationPreview] = useState<CitizenVerificationPreview>({
    isVerified: Boolean(session?.user.isVerified),
    verificationStatus: session?.user.verificationStatus ?? null,
    rejectionReason: session?.user.verificationRejectionReason ?? null,
    idImageUrl: session?.user.idImageUrl ?? null,
    isBanned: Boolean(session?.user.isBanned),
  });

  const { data: reportsData, isLoading: reportsLoading } = useMyReports();
  const { data: verificationData, isLoading: verificationLoading } = useMyVerificationStatus();

  const incidents = useMemo(
    () => (reportsData?.reports ?? []).map(reportToIncident),
    [reportsData],
  );

  const myReports = useMemo((): CitizenMyReport[] =>
    (reportsData?.reports ?? []).map((report) => ({
      id: report.id,
      type: reportToIncident(report).type,
      description: report.description,
      status: mapTicketStatus(report.status),
      reportedAt: report.submittedAt,
      location: report.location,
    })),
  [reportsData]);

  // Sync verificationPreview from query; keep session-backed value as initial
  useEffect(() => {
    if (!verificationData) return;
    const v = verificationData.verification;
    setVerificationPreview({
      isVerified: v.isVerified,
      verificationStatus: v.verificationStatus,
      rejectionReason: v.rejectionReason,
      idImageUrl: v.idImageUrl,
      isBanned: v.isBanned,
    });
    patchAuthSessionUser({
      isVerified: v.isVerified,
      verificationStatus: v.verificationStatus,
      verificationRejectionReason: v.rejectionReason,
      idImageUrl: v.idImageUrl,
      isBanned: v.isBanned,
    });
  }, [verificationData]);

  const mapIncidents = useMemo(() => incidents.filter((incident) => isIncidentVisibleOnMap(incident)), [incidents]);

  const notificationItems = React.useMemo<CitizenNotificationItem[]>(() => {
    const criticalItems = incidents
      .filter((item) => (item.status === 'active' || item.status === 'responding') && item.severity === 'critical')
      .slice(0, 2)
      .map((item) => ({
        icon: <AlertTriangle size={14} />,
        color: 'var(--severity-critical)',
        bg: '#FEE2E2',
        title: t('citizen.dashboard.criticalReportAlert'),
        desc: `${incidentTypeConfig[item.type].label} in ${item.barangay}`,
        time: timeAgo(item.reportedAt),
        unread: true,
        action: 'open-map-incident' as const,
        incidentId: item.id,
      }));

    const verificationSummary = getVerificationSummary(verificationPreview);
    const hasPendingVerificationNotification =
      verificationPreview.verificationStatus === 'PENDING'
      || verificationPreview.verificationStatus === 'REJECTED'
      || verificationPreview.verificationStatus === 'REUPLOAD_REQUESTED';

    const verificationItems = !verificationPreview.isVerified && !verificationPreview.isBanned
      ? [{
        icon: <Shield size={14} />,
        color: verificationSummary.color,
        bg: verificationSummary.bg,
        title: verificationSummary.title,
        desc: verificationSummary.statusLabel,
        time: t('citizen.dashboard.accountTime'),
        unread: hasPendingVerificationNotification,
        action: 'open-verification' as const,
      }]
      : [];

    const items = [...verificationItems, ...criticalItems, ...reportNotificationItems].slice(0, 4);
    if (items.length > 0) {
      return items;
    }

    return [{
      icon: <Info size={14} />,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      title: t('citizen.dashboard.noNewAlerts'),
      desc: t('citizen.dashboard.allCaughtUp'),
      time: 'Live',
      unread: false,
      action: 'open-home',
    }];
  }, [incidents, reportNotificationItems, verificationPreview]);

  const handleNotificationClick = React.useCallback((item: CitizenNotificationItem) => {
    if (item.action === 'open-map-incident') {
      const targetIncident = mapIncidents.find((incident) => incident.id === item.incidentId) ?? null;
      setSelectedIncident(targetIncident);
      setActiveTab('map');
    } else if (item.action === 'open-my-reports') {
      if (item.reportId) {
        navigate(`/citizen/my-reports?reportId=${encodeURIComponent(item.reportId)}`);
      } else {
        navigate('/citizen/my-reports');
      }
    } else if (item.action === 'open-verification') {
      navigate('/citizen/verification');
    } else {
      setActiveTab('home');
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [mapIncidents, navigate]);

  const handleSignOut = React.useCallback(async () => {
    await performLogout();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

  // SSE stream → invalidate query
  useEffect(() => {
    const disconnect = citizenReportsApi.connectMyReportsStream(() => {
      void queryClient.invalidateQueries({ queryKey: citizenReportsKeys.myReports() });
    });
    return () => disconnect();
  }, [queryClient]);

  // Keep selectedIncident in sync when list refreshes
  useEffect(() => {
    if (!selectedIncident) return;
    const refreshed = incidents.find((item) => item.id === selectedIncident.id);
    if (refreshed && refreshed !== selectedIncident) setSelectedIncident(refreshed);
  }, [incidents]);

  const homeLoading = reportsLoading || verificationLoading;

  useEffect(() => {
    const handleOutsideHeaderTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.citizen-web-header')) {
        return;
      }

      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideHeaderTap);
    document.addEventListener('scroll', handleAnyScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideHeaderTap);
      document.removeEventListener('scroll', handleAnyScroll, true);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'map' || tab === 'profile' || tab === 'home') {
      setActiveTab(tab);
    }
  }, [location.search]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab incidents={mapIncidents} myReports={myReports} setActiveTab={setActiveTab} selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} firstName={firstName} greetingLabel={greetingLabel} barangayLabel={barangayLabel} todayLabel={todayLabel} verificationPreview={verificationPreview} isLoading={homeLoading} />;
      case 'report':
        return null;
      case 'map':
        return <MapTab incidents={mapIncidents} selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} onBack={() => setActiveTab('home')} />;
      case 'myreports':
        navigate('/citizen/my-reports');
        return null;
      case 'profile':
        return <ProfileTab incidents={mapIncidents} myReports={myReports} verificationPreview={verificationPreview} />;
    }
  };

  return (
    <CitizenPageLayout
      header={
        <header className="citizen-web-header bg-[var(--citizen-header-bg)] flex items-center h-[60px] shrink-0 sticky top-0 z-50 shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
          <div
            className="citizen-web-header-inner flex items-center justify-between gap-3 h-full relative box-border"
          >
            <div className="flex items-center gap-2.5">
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />
            </div>

            <div className="flex items-center gap-2.5">
              <CitizenMobileMenu
                activeKey={activeTab}
                onNavigate={(key) => {
                  if (key === 'report') navigate('/citizen/report');
                  else if (key === 'myreports') navigate('/citizen/my-reports');
                  else if (key === 'map') setActiveTab('map');
                  else if (key === 'profile') setActiveTab('profile');
                  else setActiveTab('home');
                }}
              />
              <CitizenNotificationBellTrigger
                unreadCount={unreadNotificationCount}
                open={notifOpen}
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
              />
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open profile actions"
                  aria-haspopup="menu"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
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
                        setActiveTab('profile');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] focus-visible:bg-[var(--surface-container-high)] focus-visible:outline-none active:bg-[var(--surface-container)]"
                    >
                      {t('citizen.dashboard.openProfilePage')}
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
              onItemClick={handleNotificationClick}
            />
          </div>
        </header>
      }
      beforeMain={<AlertBanner incidents={incidents} />}
      sidebar={
        <CitizenDesktopNav
          activeKey={activeTab}
          onNavigate={(key) => {
            if (key === 'report') {
              navigate('/citizen/report');
              return true;
            }
            if (key === 'myreports') {
              navigate('/citizen/my-reports');
              return true;
            }
            if (key === 'map' || key === 'profile' || key === 'home') {
              setActiveTab(key);
              return true;
            }
            return false;
          }}
        />
      }
      mainOnClick={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
      }}
      mainOnScroll={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
      }}
      mobileMainPaddingBottom={activeTab === 'map' ? 0 : 20}
      desktopMainPaddingBottom={activeTab === 'map' ? 8 : 24}
      desktopMainMaxWidth={1320}
    >
      {renderContent()}
    </CitizenPageLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HOME TAB
══════════════════════════════════════════════════════════════════════ */
function HomeTab({
  incidents,
  myReports,
  setActiveTab,
  selectedIncident,
  setSelectedIncident,
  firstName,
  greetingLabel,
  barangayLabel,
  todayLabel,
  verificationPreview,
  isLoading,
}: {
  incidents: Incident[];
  myReports: CitizenMyReport[];
  setActiveTab: (t: Tab) => void;
  selectedIncident: Incident | null;
  setSelectedIncident: (i: Incident | null) => void;
  firstName: string;
  greetingLabel: string;
  barangayLabel: string;
  todayLabel: string;
  verificationPreview: CitizenVerificationPreview;
  isLoading: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'responding');
  const criticalCount = activeIncidents.filter((i) => i.severity === 'critical').length;
  const verificationSummary = getVerificationSummary(verificationPreview);

  if (isLoading) {
    return (
      <div className="citizen-content-shell pt-4 pb-[18px]">
        <TextSkeleton rows={3} title={false} className="rounded-xl" />
        <CardSkeleton
          count={3}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        />
        <TableSkeleton rows={6} columns={3} showHeader={false} />
      </div>
    );
  }

  return (
    <div className="citizen-content-shell page-content pt-4 pb-[18px]">
      {/* Page header — matches official dashboard district focus header */}
      <section className="mb-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {barangayLabel} · {greetingLabel}
            </div>
            <h1 className="text-[24px] font-black leading-tight tracking-tight text-foreground">
              {firstName}'s Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {todayLabel} · {t('citizen.dashboard.trackReports')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/citizen/report')}
            className="cursor-pointer rounded border border-primary bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
          >
            {t('citizen.dashboard.submitIncidentReport')}
          </button>
        </div>
      </section>

      {/* KPI stats — matches official dashboard metric tiles */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<AlertTriangle size={16} />}
          value={activeIncidents.length}
          label={t('citizen.dashboard.activeReports')}
          accent="var(--severity-critical)"
        />
        <StatCard
          icon={<Clock size={16} />}
          value={criticalCount}
          label={t('severity.critical')}
          accent="var(--severity-medium)"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          value={myReports.length}
          label={t('citizen.dashboard.totalMyReports')}
          accent="var(--primary)"
        />
      </div>

      {/* Verification prompt */}
      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <section
          className={`rounded-lg p-4 ${verificationSummary.surfaceClass}`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className={`font-semibold text-[14px] ${verificationSummary.titleClass}`}>
                {verificationSummary.title}
              </div>
              <div className="text-[12px] text-[var(--on-surface-variant)] mt-1 leading-[1.5]">
                {verificationSummary.detail}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/citizen/verification')}
              className="border-0 rounded-md bg-primary text-white text-[12px] font-semibold px-3 py-2 cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              {t('citizen.dashboard.openVerification')}
            </button>
          </div>
        </section>
      ) : null}

      {/* Map preview */}
      <div className="mb-4 overflow-hidden bg-card border border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
          <div>
            <div className="text-[13px] font-bold text-foreground">{t('citizen.dashboard.myReportMap')}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{t('citizen.dashboard.mapPinsDesc')}</div>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            className="cursor-pointer rounded border border-border bg-transparent px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/50 inline-flex items-center gap-1"
          >
            {t('citizen.dashboard.openFullMap')} <ArrowRight size={11} />
          </button>
        </div>
        <div className="p-3">

        <div className="flex flex-wrap gap-3">
          <aside className="flex-[1_1_320px] max-w-full min-w-0 flex flex-col gap-2">
            <div className="bg-[var(--surface-container-low)] rounded-md px-3.5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">{t('citizen.dashboard.mapSummary')}</div>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <div>
                  <div className="text-[18px] font-semibold text-primary leading-none tracking-[-0.01em]">{incidents.length}</div>
                  <div className="mt-1 text-[11px] text-[var(--on-surface-variant)]">{t('citizen.dashboard.totalPins')}</div>
                </div>
                <div>
                  <div className="text-[18px] font-semibold text-severity-medium leading-none tracking-[-0.01em]">{criticalCount}</div>
                  <div className="mt-1 text-[11px] text-[var(--on-surface-variant)]">{t('citizen.dashboard.needsAttention')}</div>
                </div>
              </div>
            </div>

            {selectedIncident ? (
              <div className="bg-[var(--primary-fixed)] rounded-md px-3.5 py-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">{t('citizen.dashboard.selectedPin')}</div>
                <div className="flex items-center gap-2.5">
                  <div className={`size-8 rounded-md flex items-center justify-center shrink-0 ${incidentIconToneClass[selectedIncident.type]}`}>
                    {typeIcon[selectedIncident.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-[var(--on-surface)] font-semibold truncate">{selectedIncident.id}</div>
                    <div className="text-[11px] text-[var(--on-surface-variant)] truncate">{selectedIncident.location}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <StatusBadge status={selectedIncident.status} size="sm" pulse />
                </div>
              </div>
            ) : (
              <div className="bg-[var(--surface-container-low)] rounded-md px-3.5 py-3 text-[11px] text-[var(--on-surface-variant)] leading-[1.5]">
                {t('citizen.dashboard.tapPinHint')}
              </div>
            )}
          </aside>

          <div className="flex-[1_1_420px] min-w-0">
            <div className="rounded-md overflow-hidden border border-[var(--outline-variant)] bg-card block w-full min-h-[360px]">
              <IncidentMap
                incidents={incidents}
                height={360}
                selectedId={selectedIncident?.id ?? null}
                onSelectIncident={setSelectedIncident}
                compact={false}
                zoom={17}
                showSelectedPopup
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 overflow-hidden bg-card border border-border">
        <div className="px-4 py-3 border-b border-border/60">
          <div className="text-[13px] font-bold text-foreground">{t('citizen.dashboard.quickActions')}</div>
        </div>
        <div className="p-3">
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2"
        >
          <QuickActionCard
            icon={<Plus size={22} />}
            label={t('citizen.dashboard.submitIncidentReport')}
            sublabel={t('citizen.dashboard.submitIncidentSublabel')}
            accent="var(--severity-critical)"
            featured
            onClick={() => navigate('/citizen/report')}
          />
          <QuickActionCard
            icon={<FileText size={22} />}
            label={t('citizen.myReports.title')}
            sublabel={t('citizen.dashboard.myReportsSublabel')}
            accent="var(--primary)"
            onClick={() => navigate('/citizen/my-reports')}
          />
          <QuickActionCard
            icon={<MapPin size={22} />}
            label={t('citizen.dashboard.myReportMap')}
            sublabel={t('citizen.dashboard.myReportMapSublabel')}
            accent="#059669"
            onClick={() => setActiveTab('map')}
          />
          <QuickActionCard
            icon={<User size={22} />}
            label={t('citizen.dashboard.profileSettings')}
            sublabel={t('citizen.dashboard.profileSettingsSublabel')}
            accent="var(--severity-medium)"
            onClick={() => setActiveTab('profile')}
          />
        </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mb-4 overflow-hidden bg-card border border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
          <span className="text-[13px] font-bold text-foreground">{t('citizen.dashboard.recentReportActivity')}</span>
          <button
            className="cursor-pointer rounded border border-border bg-transparent px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/50 inline-flex items-center gap-1"
            onClick={() => navigate('/citizen/my-reports')}
          >
            {t('common.viewAll')} <ChevronRight size={11} />
          </button>
        </div>
        <div className="px-4">
          {myReports.slice(0, 3).map((report) => (
            <RecentIncidentRow key={report.id} report={report} />
          ))}
          {myReports.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-[13px]">
              {t('citizen.dashboard.noSubmittedReports')}
            </div>
          )}
        </div>
      </div>

      {/* Emergency contacts */}
      <div className="mb-4 overflow-hidden bg-card border border-border">
        <div className="px-4 py-3 border-b border-border/60">
          <div className="text-[13px] font-bold text-foreground">{t('citizen.dashboard.emergencyContacts')}</div>
        </div>
        <div className="divide-y divide-border/60">
          {[
            { label: t('citizen.dashboard.emergencyHotline'), number: '911', iconTone: 'bg-[var(--error-container)] text-[var(--error)]' },
            { label: t('citizen.dashboard.mdrrmoOffice'), number: '(02) 123-4567', iconTone: 'bg-[var(--primary-fixed)] text-[var(--primary)]' },
            { label: t('citizen.dashboard.barangayHotline'), number: '(02) 765-4321', iconTone: 'bg-[var(--severity-low-bg)] text-[var(--severity-low)]' },
          ].map((contact) => (
            <a
              key={contact.label}
              href={`tel:${contact.number.replace(/\D/g, '')}`}
              className="flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-[var(--surface-container-low)]"
            >
              <div className={`size-9 rounded-md flex items-center justify-center shrink-0 ${contact.iconTone}`}>
                <Phone size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[13px] text-[var(--on-surface)]">{contact.label}</div>
                <div className="text-[12px] font-mono text-[var(--on-surface-variant)] mt-0.5">{contact.number}</div>
              </div>
              <ChevronRight size={15} className="text-[var(--outline)]" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   REPORT TAB
══════════════════════════════════════════════════════════════════════ */
const REPORT_TYPES: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
  { type: 'flood', label: 'Flood', icon: <Droplets size={20} /> },
  { type: 'accident', label: 'Accident', icon: <Car size={20} /> },
  { type: 'medical', label: 'Medical', icon: <Activity size={20} /> },
  { type: 'crime', label: 'Crime', icon: <AlertCircle size={20} /> },
  { type: 'infrastructure', label: 'Infrastructure', icon: <Zap size={20} /> },
  { type: 'typhoon', label: 'Typhoon', icon: <CloudRain size={20} /> },
];

const reportTypeToneClass: Record<IncidentType, {
  selectedCard: string;
  selectedIcon: string;
  selectedLabel: string;
  unselectedIcon: string;
}> = {
  flood: {
    selectedCard: 'bg-primary-container border-primary-container shadow-[0_4px_12px_rgba(30,58,138,0.26)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--primary-fixed)] text-[var(--primary-container)]',
  },
  accident: {
    selectedCard: 'bg-secondary border-secondary shadow-[0_4px_12px_rgba(134,83,0,0.26)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
  },
  medical: {
    selectedCard: 'bg-severity-critical border-severity-critical shadow-[0_4px_12px_rgba(185,28,28,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--error-container)] text-[var(--error)]',
  },
  crime: {
    selectedCard: 'bg-primary border-primary shadow-[0_4px_12px_rgba(30,58,138,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--primary-fixed)] text-[var(--primary)]',
  },
  infrastructure: {
    selectedCard: 'bg-secondary border-secondary shadow-[0_4px_12px_rgba(134,83,0,0.26)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--secondary-fixed)] text-[var(--secondary)]',
  },
  typhoon: {
    selectedCard: 'bg-primary-container border-primary-container shadow-[0_4px_12px_rgba(30,58,138,0.26)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-[var(--surface-container-high)] text-[var(--primary-container)]',
  },
};

const severityToneClass: Record<string, { selected: string; unselected: string }> = {
  low: {
    selected: 'border-[rgba(5,150,105,0.26)] bg-[var(--severity-low-bg)] text-[var(--severity-low)]',
    unselected: 'border-[var(--outline-variant)] bg-card text-[var(--outline)]',
  },
  medium: {
    selected: 'border-[var(--secondary-fixed-dim)] bg-[var(--secondary-fixed)] text-[var(--secondary)]',
    unselected: 'border-[var(--outline-variant)] bg-card text-[var(--outline)]',
  },
  high: {
    selected: 'border-[var(--secondary)] bg-[var(--secondary-fixed-dim)] text-[var(--secondary)]',
    unselected: 'border-[var(--outline-variant)] bg-card text-[var(--outline)]',
  },
  critical: {
    selected: 'border-[rgba(186,26,26,0.24)] bg-[var(--error-container)] text-[var(--error)]',
    unselected: 'border-[var(--outline-variant)] bg-card text-[var(--outline)]',
  },
};

function _ReportTab() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [severity, setSeverity] = useState<string>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedType || !description || !location) return;
    setSubmitted(true);
    setTimeout(() => {
      setStep(1);
      setSelectedType(null);
      setSeverity('');
      setDescription('');
      setLocation('');
      setSubmitted(false);
    }, 3500);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[var(--severity-low-bg)] flex items-center justify-center text-[var(--severity-low)]">
          <CheckCircle2 size={40} />
        </div>
        <div className="font-extrabold text-xl text-[var(--on-surface)]">Report Submitted!</div>
        <div className="text-[13px] text-muted-foreground leading-relaxed">
          Your incident report has been received. Our responders have been notified and will act accordingly. Track your report under "My Reports".
        </div>
        <div className="bg-[var(--primary-fixed)] rounded-xl px-5 py-2.5 text-primary font-bold text-sm text-center">
          Reference number will appear in My Reports after processing.
        </div>
        <div className="text-[11px] text-muted-foreground">Redirecting you back shortly...</div>
      </div>
    );
  }

  return (
    <div className="citizen-content-shell pt-5 pb-5">
      {/* Header */}
      <div
        className="mb-5 rounded-2xl bg-[#B91C1C] p-4 text-white"
      >
        <div className="font-extrabold text-lg mb-1">Submit Incident Report</div>
        <div className="text-xs text-white/75">
          Help keep your community safe by reporting incidents promptly.
        </div>
        <div className="flex gap-1.5 mt-3.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-sm transition-[background] duration-300 ${s <= step ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
        <div className="text-[10px] text-white/65 mt-1.5">
          Step {step} of 3 - {step === 1 ? 'Incident Type' : step === 2 ? 'Details' : 'Review & Submit'}
        </div>
      </div>

      {/* Step 1: type */}
      {step === 1 && (
        <div>
          <div className="font-bold text-sm text-[var(--on-surface)] mb-3">
            What type of incident?
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {REPORT_TYPES.map(({ type, label, icon }) => {
              const isSelected = selectedType === type;
              const tone = reportTypeToneClass[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] border-2 px-3 py-[14px] transition-all duration-200 ${
                    isSelected
                      ? tone.selectedCard
                      : 'bg-card border-border shadow-[0_1px_4px_rgba(0,0,0,0.07)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${isSelected ? tone.selectedIcon : tone.unselectedIcon}`}>
                    {icon}
                  </div>
                  <span className={`font-semibold text-[13px] ${isSelected ? tone.selectedLabel : 'text-[var(--on-surface)]'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => selectedType && setStep(2)}
            disabled={!selectedType}
            className={`mt-5 w-full rounded-xl border-0 py-3.5 text-sm font-bold transition-colors duration-200 ${
              selectedType
                ? 'cursor-pointer bg-primary text-white'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            }`}
          >
            {'Continue ->'}
          </button>
        </div>
      )}

      {/* Step 2: details */}
      {step === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="font-bold text-sm text-[var(--on-surface)] mb-0.5">Describe the incident</div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Location / Address *
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Purok 3, Brgy. San Antonio"
              className="w-full px-[13px] py-[11px] rounded-[10px] border-[1.5px] border-border bg-input-background text-[var(--on-surface)] text-[13px] outline-none box-border font-['Roboto',sans-serif]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Severity Level *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'low', label: 'Low' },
                { key: 'medium', label: 'Medium' },
                { key: 'high', label: 'High' },
                { key: 'critical', label: 'Critical' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSeverity(s.key)}
                  className={`cursor-pointer rounded-lg border-2 px-1 py-2 text-[11px] font-bold transition-all duration-150 ${
                    severity === s.key ? severityToneClass[s.key].selected : severityToneClass[s.key].unselected
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what is happening..."
              rows={4}
              className="w-full px-[13px] py-[11px] rounded-[10px] border-[1.5px] border-border bg-input-background text-[var(--on-surface)] text-[13px] outline-none resize-none box-border font-['Roboto',sans-serif]"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-surface-container-low text-muted-foreground border-0 rounded-xl py-3.5 font-bold text-sm cursor-pointer"
            >
              {'<- Back'}
            </button>
            <button
              onClick={() => description && location && severity && setStep(3)}
              disabled={!description || !location || !severity}
              className={`flex-[2] rounded-xl border-0 py-3.5 text-sm font-bold ${
                description && location && severity
                  ? 'cursor-pointer bg-primary text-white'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'
              }`}
            >
              {'Review ->'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: review */}
      {step === 3 && selectedType && (
        <div>
          <div className="font-bold text-sm text-[var(--on-surface)] mb-3.5">Review your report</div>
          <div className="bg-card rounded-[14px] p-4 border-[1.5px] border-border flex flex-col gap-3 mb-4">
            {[
              { label: 'Incident Type', value: incidentTypeConfig[selectedType].label },
              { label: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1) },
              { label: 'Location', value: location },
              { label: 'Description', value: description },
              { label: 'Reported By', value: 'Juan Dela Cruz' },
              { label: 'Date & Time', value: new Date().toLocaleString('en-PH') },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.06em]">
                  {label}
                </div>
                <div className="text-[13px] font-semibold text-[var(--on-surface)]">{value}</div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 rounded-[10px] px-3.5 py-2.5 border border-amber-200 mb-4 text-xs text-amber-800 flex gap-2 items-start">
            <Info size={14} className="shrink-0 mt-px" />
            False reporting is punishable by law. Only submit genuine emergencies or concerns.
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-surface-container-low text-muted-foreground border-0 rounded-xl py-3.5 font-bold text-sm cursor-pointer"
            >
              {'<- Edit'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-[2] cursor-pointer rounded-xl border-0 bg-[#B91C1C] py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(185,28,28,0.4)]"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAP TAB
══════════════════════════════════════════════════════════════════════ */
function MapTab({
  incidents,
  selectedIncident,
  setSelectedIncident,
  onBack,
}: {
  incidents: Incident[];
  selectedIncident: Incident | null;
  setSelectedIncident: (i: Incident | null) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'responding'>('all');
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  const filtered =
    filter === 'all'
      ? incidents
      : filter === 'active'
      ? incidents.filter((i) => i.status === 'active')
      : incidents.filter((i) => i.status === 'responding');
  const incidentTypeChipClass: Record<IncidentType, string> = {
    flood: 'bg-blue-100 text-blue-700',
    accident: 'bg-amber-100 text-amber-800',
    medical: 'bg-teal-100 text-teal-700',
    crime: 'bg-violet-100 text-violet-700',
    infrastructure: 'bg-muted text-muted-foreground',
    typhoon: 'bg-sky-100 text-sky-700',
  };
  const hasPinsForFilter = filtered.length > 0;
  const isCompactMobileHeight = isMobileViewport && viewportHeight < 760;
  // Keep map viewport-filling across header variants while preserving space for filters/detail panel.
  const mapBaseOffset = isMobileViewport
    ? (isCompactMobileHeight ? 114 : 126)
    : 186;
  const mapDetailOffset = isMobileViewport ? (isCompactMobileHeight ? 50 : 62) : 48;
  const mapHeight = `max(320px, calc(100dvh - ${mapBaseOffset + mapDetailOffset}px - env(safe-area-inset-bottom)))`;
  const mapShellMinHeightClass = isMobileViewport
    ? (isCompactMobileHeight ? 'min-h-[calc(100dvh-108px)]' : 'min-h-[calc(100dvh-120px)]')
    : 'min-h-[calc(100dvh-176px)]';

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }
    const stillVisible = filtered.some((incident) => incident.id === selectedIncident.id);
    if (!stillVisible) {
      setSelectedIncident(null);
    }
  }, [filtered, selectedIncident, setSelectedIncident]);

  return (
    <div className={`flex flex-col ${mapShellMinHeightClass}`}>
      {/* Filters */}
      <div className="citizen-map-filter-bar px-4 py-3 bg-card border-b border-border flex gap-2 items-center flex-wrap">
        <div className="font-semibold text-[14px] tracking-[-0.005em] text-[var(--on-surface)] flex-1">{t('citizen.dashboard.myReportMap')}</div>
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium text-[var(--on-surface-variant)] cursor-pointer hover:bg-[var(--surface-container-low)] transition-colors ${
            isMobileViewport ? 'px-3 py-2' : 'px-2.5 py-1.5'
          }`}
        >
          <ArrowLeft size={13} />
          {t('citizen.dashboard.backToDashboard')}
        </button>
        <div className="inline-flex items-center gap-px rounded-md bg-[var(--surface-container-low)] p-0.5">
          {(['all', 'active', 'responding'] as const).map((f) => (
            <button
              className={`rounded-[5px] font-medium capitalize cursor-pointer transition-colors ${
                isMobileViewport ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-1 text-[11px]'
              } ${filter === f ? 'bg-card text-[var(--on-surface)] shadow-sm' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[320px]">
        <IncidentMap
          incidents={filtered}
          height={mapHeight}
          selectedId={selectedIncident?.id ?? null}
          onSelectIncident={setSelectedIncident}
          compact={false}
          zoom={17}
          showMarkerTooltip={false}
        />
        {!hasPinsForFilter ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[2px]">
            <div className="citizen-map-empty-card pointer-events-auto bg-card border border-[var(--outline-variant)] rounded-lg px-4 py-3 text-center">
              <div className="text-[12px] font-medium text-[var(--on-surface)] mb-2">
                {t('citizen.dashboard.noMapPins')}
              </div>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="bg-primary text-white rounded-md text-[11px] font-semibold px-3 py-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {t('citizen.dashboard.showAllPins')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedIncident ? (
        <div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="citizen-map-report-modal-title"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-[var(--outline-variant)] bg-card shadow-[0_18px_48px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--outline-variant)] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">Selected Report</div>
                <h3 id="citizen-map-report-modal-title" className="truncate text-[18px] font-extrabold text-[var(--on-surface)]">
                  {selectedIncident.id}
                </h3>
                <div className="mt-1 text-[13px] text-[var(--on-surface-variant)]">{selectedIncident.barangay}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                aria-label="Close report preview"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)] bg-card text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-low)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={selectedIncident.status} size="sm" />
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${incidentTypeChipClass[selectedIncident.type]}`}
                >
                  {incidentTypeConfig[selectedIncident.type].label}
                </span>
              </div>

              <div className="space-y-2.5 text-[13px] text-[var(--on-surface)]">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--on-surface-variant)]" />
                  <span>{selectedIncident.location}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0 text-[var(--on-surface-variant)]" />
                  <span>{new Date(selectedIncident.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--on-surface)]">
                {selectedIncident.description}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-[var(--outline-variant)] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)] bg-card px-4 py-2.5 text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-low)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => navigate(`/citizen/my-reports?reportId=${encodeURIComponent(selectedIncident.id)}`)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <FileText size={14} />
                View Full Details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MY REPORTS TAB
══════════════════════════════════════════════════════════════════════ */
function _MyReportsTab({ myReports }: { myReports: CitizenMyReport[] }) {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-primary rounded-2xl p-4 mb-[18px] text-white">
        <div className="font-extrabold text-lg mb-1">My Reports</div>
        <div className="text-xs text-white/75">
          You have submitted {myReports.length} incident reports.
        </div>
        <div className="flex gap-3.5 mt-3">
          {[
            { label: 'Submitted', value: myReports.length, color: '#BFDBFE' },
            { label: 'Responding', value: myReports.filter(r => r.status === 'responding').length, color: '#FDE68A' },
            { label: 'Resolved', value: myReports.filter(r => r.status === 'resolved').length, color: '#A7F3D0' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-extrabold text-[22px] text-white">{s.value}</div>
              <div className="text-[10px] text-white/65 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report list */}
      <div className="font-bold text-sm text-[var(--on-surface)] mb-2.5">Submitted Reports</div>
      <div className="bg-card rounded-[14px] px-3.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-border/60 mb-4">
        {myReports.map((report) => (
          <MyReportRow key={report.id} report={report} />
        ))}
      </div>

      {/* Status guide */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-border">
        <div className="font-bold text-[13px] text-[var(--on-surface)] mb-2.5">Report Status Guide</div>
        {[
          { status: 'active' as const, desc: 'Received, awaiting assignment' },
          { status: 'responding' as const, desc: 'Responders have been deployed' },
          { status: 'contained' as const, desc: 'Situation is under control' },
          { status: 'resolved' as const, desc: 'Incident fully resolved' },
        ].map(({ status, desc }) => (
          <div key={status} className="flex items-center gap-2.5 mb-2">
            <StatusBadge status={status} size="sm" />
            <span className="text-xs text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PROFILE TAB
══════════════════════════════════════════════════════════════════════ */
function ProfileTab({
  incidents,
  myReports,
  verificationPreview,
}: {
  incidents: Incident[];
  myReports: CitizenMyReport[];
  verificationPreview: CitizenVerificationPreview;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen User';
  const phoneNumber = session?.user.phoneNumber || 'Not available';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const barangayLabel = session?.user.barangayCode ? `Barangay ${session.user.barangayCode}` : 'Assigned barangay';
  const activeIncidents = incidents.filter((item) => item.status === 'active' || item.status === 'responding');
  const criticalCount = activeIncidents.filter((item) => item.severity === 'critical').length;
  const verificationSummary = getVerificationSummary(verificationPreview);

  return (
    <div className="citizen-content-shell pt-4 pb-4">
      {/* Page header */}
      <section className="mb-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-[46px] shrink-0 items-center justify-center bg-[var(--inverse-surface)] font-mono text-[16px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {barangayLabel} · Tondo, Manila
              </div>
              <h2 className="text-[22px] font-black leading-tight tracking-tight text-foreground truncate">
                {fullName}
              </h2>
              <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">{phoneNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <Shield size={11} /> {verificationSummary.statusLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<AlertTriangle size={16} />}
          value={activeIncidents.length}
          label={t('citizen.dashboard.activeReports')}
          accent="var(--severity-critical)"
        />
        <StatCard
          icon={<Clock size={16} />}
          value={criticalCount}
          label={t('severity.critical')}
          accent="var(--severity-medium)"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          value={myReports.length}
          label={t('citizen.dashboard.totalMyReports')}
          accent="var(--primary)"
        />
      </div>

      {/* Verification preview */}
      <div className="font-semibold text-[12px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mb-2 px-1">{t('citizen.dashboard.verificationPreview')}</div>
      <div
        className={`mb-4 rounded-lg px-4 py-3 ${verificationSummary.surfaceClass}`}
      >
        <div className={`font-semibold text-[13px] ${verificationSummary.titleClass}`}>
          {verificationSummary.title}
        </div>
        <div className="text-[12px] text-[var(--on-surface-variant)] mt-1 leading-[1.5]">{verificationSummary.detail}</div>
        {verificationPreview.idImageUrl ? (
          <a
            href={verificationPreview.idImageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-2 no-underline text-primary text-[12px] font-medium hover:underline"
          >
            {t('citizen.dashboard.viewLatestId')}
          </a>
        ) : null}
      </div>

      {/* Account info */}
      <div className="font-semibold text-[12px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mb-2 px-1">{t('citizen.dashboard.accountInformation')}</div>
      <div className="bg-card rounded-lg overflow-hidden border border-[var(--outline-variant)] mb-4">
        {[
          { icon: <User size={15} />, label: t('settings.personalInfo'), sub: fullName, action: 'personal' as const },
          { icon: <Bell size={15} />, label: t('common.notifications'), sub: t('citizen.dashboard.alertsSubLabel'), action: 'notifications' as const },
          { icon: <Shield size={15} />, label: t('citizen.dashboard.verificationStatus'), sub: verificationSummary.statusLabel, action: 'verification' as const },
          { icon: <MapPin size={15} />, label: t('citizen.dashboard.homeBarangay'), sub: barangayLabel, action: 'barangay' as const },
          { icon: <Phone size={15} />, label: t('citizen.dashboard.contactNumber'), sub: phoneNumber, action: 'contact' as const },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 cursor-default text-left bg-card ${
              idx < arr.length - 1 ? 'border-b border-[var(--outline-variant)]' : ''
            }`}
          >
            <div className="size-8 rounded-md bg-[var(--primary-fixed)] text-primary flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[13px] text-[var(--on-surface)]">{item.label}</div>
              <div className="text-[11px] text-[var(--on-surface-variant)] mt-0.5 truncate">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface-container-low)] rounded-md px-3 py-2.5 mb-4 text-[var(--on-surface-variant)] text-[12px] leading-[1.5]">
        Your profile details are tied to your registered and verified account. For account corrections, contact your barangay administrator.
      </div>

      {!session?.user.isPhoneVerified ? (
        <button
          onClick={() => navigate('/auth/register')}
          className="w-full py-2.5 rounded-md border border-[var(--outline-variant)] bg-card text-primary font-semibold text-[13px] cursor-pointer mb-2 hover:bg-[var(--surface-container-low)] transition-colors"
        >
          {t('citizen.dashboard.verifyPhoneNumber')}
        </button>
      ) : null}

      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <button
          onClick={() => navigate('/citizen/verification')}
          className="w-full py-2.5 rounded-md border border-[var(--outline-variant)] bg-card text-primary font-semibold text-[13px] cursor-pointer mb-2 hover:bg-[var(--surface-container-low)] transition-colors"
        >
          {t('citizen.dashboard.openVerificationStatus')}
        </button>
      ) : null}

      {/* Sign out */}
      <button
        onClick={async () => {
          await performLogout();
          navigate('/auth/login', { replace: true });
        }}
        className="w-full py-2.5 rounded-md border border-[var(--outline-variant)] bg-card text-[var(--error)] font-medium text-[13px] cursor-pointer hover:bg-[var(--error-container)] transition-colors"
      >
        {t('common.signOut')}
      </button>
    </div>
  );
}
