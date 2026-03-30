import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '../i18n';
import {
  Shield, Bell, MapPin, FileText, User, Plus,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
  Droplets, Car, Activity, Zap, AlertCircle,
  Phone, Info, CloudRain,
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
import { profileVerificationApi } from '../services/profileVerificationApi';
import { mapTicketStatus, reportToIncident } from '../utils/incidentAdapters';
import { clearAuthSession, getAuthSession, patchAuthSessionUser } from '../utils/authSession';

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
      surfaceClass: 'border border-red-200 bg-red-100',
      titleClass: 'text-red-800',
    };
  }

  if (verification.isVerified || verification.verificationStatus === 'APPROVED') {
    return {
      title: 'Verified Citizen',
      detail: 'Your resident ID has been approved.',
      statusLabel: 'Verified',
      color: '#065F46',
      bg: '#DCFCE7',
      surfaceClass: 'border border-emerald-200 bg-emerald-100',
      titleClass: 'text-emerald-800',
    };
  }

  if (verification.verificationStatus === 'PENDING') {
    return {
      title: 'Verification Under Review',
      detail: 'Your submitted ID is currently being reviewed by barangay staff.',
      statusLabel: 'Pending Review',
      color: '#92400E',
      bg: '#FEF3C7',
      surfaceClass: 'border border-amber-200 bg-amber-100',
      titleClass: 'text-amber-800',
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
      surfaceClass: 'border border-red-200 bg-red-100',
      titleClass: 'text-severity-critical',
    };
  }

  return {
    title: 'ID Verification Required',
    detail: 'Submit one valid ID photo so your account can be verified.',
    statusLabel: 'Not Submitted',
    color: 'var(--primary)',
    bg: '#DBEAFE',
    surfaceClass: 'border border-blue-200 bg-blue-100',
    titleClass: 'text-primary',
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
    card: 'border-[1.5px] border-red-100',
    icon: 'bg-red-100 text-severity-critical',
  },
  warning: {
    card: 'border-[1.5px] border-amber-100',
    icon: 'bg-amber-100 text-amber-700',
  },
  primary: {
    card: 'border-[1.5px] border-blue-100',
    icon: 'bg-blue-100 text-primary',
  },
  success: {
    card: 'border-[1.5px] border-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  slate: {
    card: 'border-[1.5px] border-slate-200',
    icon: 'bg-slate-100 text-slate-600',
  },
};

const quickActionToneClass: Record<AccentTone, {
  card: string;
  icon: string;
  cta: string;
}> = {
  critical: {
    card: 'bg-red-50 border border-red-200 text-severity-critical',
    icon: 'bg-red-100 text-severity-critical',
    cta: 'text-severity-critical',
  },
  warning: {
    card: 'bg-amber-50 border border-amber-200 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
    cta: 'text-amber-700',
  },
  primary: {
    card: 'bg-blue-50 border border-blue-200 text-primary',
    icon: 'bg-blue-100 text-primary',
    cta: 'text-primary',
  },
  success: {
    card: 'bg-emerald-50 border border-emerald-200 text-emerald-600',
    icon: 'bg-emerald-100 text-emerald-600',
    cta: 'text-emerald-600',
  },
  slate: {
    card: 'bg-slate-50 border border-slate-200 text-slate-700',
    icon: 'bg-slate-200 text-slate-700',
    cta: 'text-slate-700',
  },
};

const incidentIconToneClass: Record<IncidentType, string> = {
  flood: 'bg-sky-100 text-sky-700',
  accident: 'bg-orange-100 text-orange-700',
  medical: 'bg-red-100 text-severity-critical',
  crime: 'bg-blue-100 text-primary',
  infrastructure: 'bg-amber-100 text-amber-700',
  typhoon: 'bg-cyan-100 text-cyan-700',
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
    <div className="bg-red-700 border-b border-red-800 text-white px-4 py-2.5 flex items-center gap-2.5 text-[13px]">
      <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center shrink-0">
        <AlertTriangle size={15} />
      </span>
      <span className="flex-1">
        {criticalCount > 1
          ? t('citizen.dashboard.alertBannerPlural', { count: criticalCount })
          : t('citizen.dashboard.alertBannerSingle', { count: criticalCount })}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="bg-transparent border-0 text-white/70 cursor-pointer text-lg leading-none p-0"
      >
        x
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
  const tone = statToneClass[resolveAccentTone(accent)];
  return (
    <div className={`bg-white rounded-xl p-3 min-w-0 w-full flex flex-col gap-1 shadow-sm ${tone.card}`}>
      <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center mb-0.5 ${tone.icon}`}>
        {icon}
      </div>
      <div className="font-extrabold text-slate-900 text-xl leading-none">{value}</div>
      <div className="text-slate-500 text-[11px] font-medium">{label}</div>
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
  const { t } = useTranslation();
  const tone = quickActionToneClass[resolveAccentTone(accent)];
  return (
    <button
      onClick={onClick}
      className={`w-full cursor-pointer rounded-xl px-4 py-[18px] text-left transition-transform duration-150 hover:-translate-y-0.5 flex flex-col items-start gap-2 ${
        featured
          ? 'border-0 bg-primary text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)]'
          : `shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${tone.card}`
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${featured ? 'bg-white/25 text-white' : tone.icon}`}>
        {icon}
      </div>
      <div>
        <div className={`mb-0.5 text-sm font-bold ${featured ? 'text-white' : 'text-slate-800'}`}>
          {label}
        </div>
        <div className={`text-[11px] leading-snug ${featured ? 'text-white/75' : 'text-slate-500'}`}>
          {sublabel}
        </div>
      </div>
      <div className={`mt-auto flex items-center gap-[3px] text-[11px] font-semibold ${featured ? 'text-white/80' : tone.cta}`}>
        {t('citizen.dashboard.tapToOpen')} <ArrowRight size={11} />
      </div>
    </button>
  );
}

function RecentIncidentRow({ report }: { report: CitizenMyReport }) {
  const cfg = incidentTypeConfig[report.type];
  return (
    <div className="flex items-center gap-3 py-[11px] border-b border-slate-100">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${incidentIconToneClass[report.type]}`}>
        {typeIcon[report.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-slate-900 truncate">
          {cfg.label} - {report.id}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
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
    <div className="flex items-center gap-3 py-[11px] border-b border-slate-100">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${incidentIconToneClass[report.type]}`}>
        {typeIcon[report.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-slate-900 truncate">
          {report.description}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [myReports, setMyReports] = useState<CitizenMyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { notificationItems: reportNotificationItems } = useCitizenReportNotifications();
  const [verificationPreview, setVerificationPreview] = useState<CitizenVerificationPreview>({
    isVerified: Boolean(session?.user.isVerified),
    verificationStatus: session?.user.verificationStatus ?? null,
    rejectionReason: session?.user.verificationRejectionReason ?? null,
    idImageUrl: session?.user.idImageUrl ?? null,
    isBanned: Boolean(session?.user.isBanned),
  });
  const mapIncidents = React.useMemo(() => incidents.filter((incident) => isIncidentVisibleOnMap(incident)), [incidents]);

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

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

  const loadReports = React.useCallback(async (silent = false) => {
    if (!silent) {
      setReportsLoading(true);
    }
    try {
      const payload = await citizenReportsApi.getMyReports();
      const mappedIncidents = payload.reports.map((report) => reportToIncident(report));
      setIncidents(mappedIncidents);
      setSelectedIncident((current) => {
        if (!current) {
          return current;
        }
        return mappedIncidents.find((incident) => incident.id === current.id) ?? null;
      });
      setMyReports(
        payload.reports.map((report) => ({
          id: report.id,
          type: reportToIncident(report).type,
          description: report.description,
          status: mapTicketStatus(report.status),
          reportedAt: report.submittedAt,
          location: report.location,
        })),
      );
    } catch {
      setIncidents([]);
      setMyReports([]);
    } finally {
      if (!silent) {
        setReportsLoading(false);
      }
    }
  }, []);

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
    const loadVerification = async () => {
      setVerificationLoading(true);
      try {
        const payload = await profileVerificationApi.getMyStatus();
        const verificationState: CitizenVerificationPreview = {
          isVerified: payload.verification.isVerified,
          verificationStatus: payload.verification.verificationStatus,
          rejectionReason: payload.verification.rejectionReason,
          idImageUrl: payload.verification.idImageUrl,
          isBanned: payload.verification.isBanned,
        };
        setVerificationPreview(verificationState);
        patchAuthSessionUser({
          isVerified: payload.verification.isVerified,
          verificationStatus: payload.verification.verificationStatus,
          verificationRejectionReason: payload.verification.rejectionReason,
          idImageUrl: payload.verification.idImageUrl,
          isBanned: payload.verification.isBanned,
        });
      } catch {
        // Keep session-backed preview if endpoint fails.
      } finally {
        setVerificationLoading(false);
      }
    };

    void loadVerification();
  }, []);

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
        return <ProfileTab myReports={myReports} verificationPreview={verificationPreview} />;
    }
  };

  return (
    <CitizenPageLayout
      header={
        <header className="citizen-web-header bg-primary flex items-center h-[60px] shrink-0 sticky top-0 z-50 shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
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
                onClick={() => {
                  setNotifOpen(!notifOpen);
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
                  className="w-11 h-11 rounded-[10px] bg-severity-medium flex items-center justify-center text-white font-extrabold text-sm cursor-pointer border-0"
                >
                  {initials}
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Profile actions"
                    className="absolute top-11 right-0 w-[190px] bg-white rounded-xl shadow-[0_8px_18px_rgba(15,23,42,0.12)] border border-slate-200 overflow-hidden z-[110]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActiveTab('profile');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-[11px] bg-white border-0 border-b border-slate-100 text-slate-900 text-[13px] font-semibold cursor-pointer"
                    >
                      {t('citizen.dashboard.openProfilePage')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-[11px] bg-white border-0 text-red-700 text-[13px] font-bold cursor-pointer"
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
              onItemClick={handleNotificationClick}
            />
          </div>
        </header>
      }
      beforeMain={
        <>
          <AlertBanner incidents={incidents} />
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
        </>
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
      <div className="citizen-content-shell pt-4 pb-[18px] flex flex-col gap-3.5">
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
    <div className="citizen-content-shell pt-4 pb-[18px] flex flex-col gap-4">
      {/* Welcome banner */}
      <section className="bg-primary rounded-xl px-4 pt-4 pb-3.5 text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)]">
        <div className="text-[13px] text-blue-200">{greetingLabel}, {firstName}.</div>
        <div className="font-extrabold text-[28px] leading-[1.15] mt-1">{t('citizen.dashboard.citizenDashboard')}</div>
        <div className="text-[13px] text-indigo-200 mt-0.5">
          {t('citizen.dashboard.trackReports')}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-white/[0.14] border border-white/[0.24] rounded-lg px-2.5 py-[5px] text-[11px] font-semibold">
            {barangayLabel}
          </span>
          <span className="bg-white/[0.14] border border-white/[0.24] rounded-lg px-2.5 py-[5px] text-[11px] font-semibold">
            {todayLabel}
          </span>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white rounded-2xl border border-slate-200 p-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5"
        >
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
      </section>

      {/* Verification prompt */}
      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <section
          className={`rounded-2xl p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ${verificationSummary.surfaceClass}`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className={`font-bold text-[15px] ${verificationSummary.titleClass}`}>
                {verificationSummary.title}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {verificationSummary.detail}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/citizen/verification')}
              className="border-0 rounded-[10px] bg-primary text-white text-xs font-bold px-3 py-2.5 cursor-pointer whitespace-nowrap"
            >
              {t('citizen.dashboard.openVerification')}
            </button>
          </div>
        </section>
      ) : null}

      {/* Map preview */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <div className="font-bold text-slate-950 text-base">{t('citizen.dashboard.myReportMap')}</div>
            <div className="text-xs text-slate-500">{t('citizen.dashboard.mapPinsDesc')}</div>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-[7px] text-primary font-bold text-xs cursor-pointer inline-flex items-center gap-[5px]"
          >
            {t('citizen.dashboard.openFullMap')} <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <aside className="flex-[1_1_320px] max-w-full min-w-0 flex flex-col gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5">
              <div className="text-[11px] font-semibold text-slate-600">{t('citizen.dashboard.mapSummary')}</div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <div className="text-[10px] text-slate-500">{t('citizen.dashboard.totalPins')}</div>
                  <div className="text-lg font-extrabold text-primary">{incidents.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">{t('citizen.dashboard.needsAttention')}</div>
                  <div className="text-lg font-extrabold text-severity-medium">{criticalCount}</div>
                </div>
              </div>
            </div>

            {selectedIncident ? (
              <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-3 py-2.5">
                <div className="text-[11px] text-primary font-bold mb-1.5">{t('citizen.dashboard.selectedPin')}</div>
                <div className="flex items-center gap-2">
                  <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 ${incidentIconToneClass[selectedIncident.type]}`}>
                    {typeIcon[selectedIncident.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-900 font-bold truncate">{selectedIncident.id}</div>
                    <div className="text-[10px] text-slate-500 truncate">{selectedIncident.location}</div>
                  </div>
                </div>
                <div className="mt-1.5">
                  <StatusBadge status={selectedIncident.status} size="sm" pulse />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-[10px] px-3 py-2.5 text-[11px] text-slate-500">
                {t('citizen.dashboard.tapPinHint')}
              </div>
            )}
          </aside>

          <div className="flex-[1_1_420px] min-w-[320px]">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white block w-full min-h-[360px]">
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
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="font-bold text-base text-slate-900 mb-2.5">{t('citizen.dashboard.quickActions')}</div>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5"
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
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-bold text-base text-slate-900">{t('citizen.dashboard.recentReportActivity')}</div>
          <button
            className="bg-transparent border-0 text-primary text-xs font-bold cursor-pointer inline-flex items-center gap-1"
            onClick={() => navigate('/citizen/my-reports')}
          >
            {t('common.viewAll')} <ChevronRight size={13} />
          </button>
        </div>
        <div className="border border-slate-100 rounded-xl px-3 py-1">
          {myReports.slice(0, 3).map((report) => (
            <RecentIncidentRow key={report.id} report={report} />
          ))}
          {myReports.length === 0 && (
            <div className="text-center py-5 text-slate-400 text-[13px]">
              {t('citizen.dashboard.noSubmittedReports')}
            </div>
          )}
        </div>
      </section>

      {/* Emergency contacts */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="font-bold text-base text-slate-900 mb-2.5">{t('citizen.dashboard.emergencyContacts')}</div>
        <div className="flex flex-col gap-2">
          {[
            { label: t('citizen.dashboard.emergencyHotline'), number: '911', tone: 'text-severity-critical', iconTone: 'bg-red-100 text-severity-critical' },
            { label: t('citizen.dashboard.mdrrmoOffice'), number: '(02) 123-4567', tone: 'text-primary', iconTone: 'bg-blue-100 text-primary' },
            { label: t('citizen.dashboard.barangayHotline'), number: '(02) 765-4321', tone: 'text-emerald-600', iconTone: 'bg-emerald-100 text-emerald-600' },
          ].map((contact) => (
            <a
              key={contact.label}
              href={`tel:${contact.number.replace(/\D/g, '')}`}
              className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3 no-underline border border-slate-200"
            >
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${contact.iconTone}`}>
                <Phone size={17} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[13px] text-slate-900">{contact.label}</div>
                <div className={`text-xs font-bold mt-px ${contact.tone}`}>{contact.number}</div>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </a>
          ))}
        </div>
      </section>
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
    selectedCard: 'bg-sky-700 border-sky-700 shadow-[0_4px_12px_rgba(3,105,161,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-sky-100 text-sky-700',
  },
  accident: {
    selectedCard: 'bg-orange-700 border-orange-700 shadow-[0_4px_12px_rgba(194,65,12,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-orange-100 text-orange-700',
  },
  medical: {
    selectedCard: 'bg-severity-critical border-severity-critical shadow-[0_4px_12px_rgba(185,28,28,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-red-100 text-severity-critical',
  },
  crime: {
    selectedCard: 'bg-primary border-primary shadow-[0_4px_12px_rgba(30,58,138,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-blue-100 text-primary',
  },
  infrastructure: {
    selectedCard: 'bg-amber-700 border-amber-700 shadow-[0_4px_12px_rgba(180,115,10,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-amber-100 text-amber-700',
  },
  typhoon: {
    selectedCard: 'bg-cyan-700 border-cyan-700 shadow-[0_4px_12px_rgba(14,116,144,0.28)]',
    selectedIcon: 'bg-white/25 text-white',
    selectedLabel: 'text-white',
    unselectedIcon: 'bg-cyan-100 text-cyan-700',
  },
};

const severityToneClass: Record<string, { selected: string; unselected: string }> = {
  low: {
    selected: 'border-emerald-600 bg-emerald-100 text-emerald-600',
    unselected: 'border-slate-200 bg-white text-slate-400',
  },
  medium: {
    selected: 'border-amber-700 bg-amber-100 text-amber-700',
    unselected: 'border-slate-200 bg-white text-slate-400',
  },
  high: {
    selected: 'border-orange-700 bg-orange-100 text-orange-700',
    unselected: 'border-slate-200 bg-white text-slate-400',
  },
  critical: {
    selected: 'border-severity-critical bg-red-100 text-severity-critical',
    unselected: 'border-slate-200 bg-white text-slate-400',
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
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 size={40} />
        </div>
        <div className="font-extrabold text-xl text-slate-900">Report Submitted!</div>
        <div className="text-[13px] text-slate-500 leading-relaxed">
          Your incident report has been received. Our responders have been notified and will act accordingly. Track your report under "My Reports".
        </div>
        <div className="bg-blue-50 rounded-xl px-5 py-2.5 text-primary font-bold text-sm text-center">
          Reference number will appear in My Reports after processing.
        </div>
        <div className="text-[11px] text-slate-400">Redirecting you back shortly...</div>
      </div>
    );
  }

  return (
    <div className="citizen-content-shell pt-5 pb-5">
      {/* Header */}
      <div
        className="mb-5 rounded-2xl bg-[linear-gradient(135deg,#B91C1C_0%,#991B1B_100%)] p-4 text-white"
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
          <div className="font-bold text-sm text-slate-900 mb-3">
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
                      : 'bg-white border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.07)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${isSelected ? tone.selectedIcon : tone.unselectedIcon}`}>
                    {icon}
                  </div>
                  <span className={`font-semibold text-[13px] ${isSelected ? tone.selectedLabel : 'text-slate-800'}`}>
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
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            {'Continue ->'}
          </button>
        </div>
      )}

      {/* Step 2: details */}
      {step === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="font-bold text-sm text-slate-900 mb-0.5">Describe the incident</div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Location / Address *
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Purok 3, Brgy. San Antonio"
              className="w-full px-[13px] py-[11px] rounded-[10px] border-[1.5px] border-slate-200 text-[13px] outline-none box-border font-['Roboto',sans-serif]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
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
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what is happening..."
              rows={4}
              className="w-full px-[13px] py-[11px] rounded-[10px] border-[1.5px] border-slate-200 text-[13px] outline-none resize-none box-border font-['Roboto',sans-serif]"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-slate-100 text-slate-600 border-0 rounded-xl py-3.5 font-bold text-sm cursor-pointer"
            >
              {'<- Back'}
            </button>
            <button
              onClick={() => description && location && severity && setStep(3)}
              disabled={!description || !location || !severity}
              className={`flex-[2] rounded-xl border-0 py-3.5 text-sm font-bold ${
                description && location && severity
                  ? 'cursor-pointer bg-primary text-white'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
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
          <div className="font-bold text-sm text-slate-900 mb-3.5">Review your report</div>
          <div className="bg-white rounded-[14px] p-4 border-[1.5px] border-slate-200 flex flex-col gap-3 mb-4">
            {[
              { label: 'Incident Type', value: incidentTypeConfig[selectedType].label },
              { label: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1) },
              { label: 'Location', value: location },
              { label: 'Description', value: description },
              { label: 'Reported By', value: 'Juan Dela Cruz' },
              { label: 'Date & Time', value: new Date().toLocaleString('en-PH') },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.06em]">
                  {label}
                </div>
                <div className="text-[13px] font-semibold text-slate-900">{value}</div>
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
              className="flex-1 bg-slate-100 text-slate-600 border-0 rounded-xl py-3.5 font-bold text-sm cursor-pointer"
            >
              {'<- Edit'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-[2] cursor-pointer rounded-xl border-0 bg-[linear-gradient(135deg,#B91C1C_0%,#991B1B_100%)] py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(185,28,28,0.4)]"
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
      <div className="citizen-map-filter-bar px-4 py-3 bg-white border-b border-slate-100 flex gap-2 items-center flex-wrap">
        <div className="font-bold text-sm text-slate-900 flex-1">{t('citizen.dashboard.myReportMap')}</div>
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-1.5 rounded-[10px] border border-blue-200 bg-blue-50 text-[11px] font-bold text-primary cursor-pointer ${
            isMobileViewport ? 'px-3 py-2' : 'px-[10px] py-1.5'
          }`}
        >
          <ArrowLeft size={12} />
          {t('citizen.dashboard.backToDashboard')}
        </button>
        {(['all', 'active', 'responding'] as const).map((f) => (
          <button
            className={`citizen-map-filter-chip border-0 rounded-full font-semibold capitalize cursor-pointer ${
              isMobileViewport ? 'px-[14px] py-2 text-xs' : 'px-3 py-[5px] text-[11px]'
            } ${filter === f ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        {selectedIncident ? (
          <button
            type="button"
            onClick={() => setSelectedIncident(null)}
            className={`citizen-map-clear-btn ml-auto border border-slate-200 bg-white text-slate-600 font-bold text-[11px] rounded-[10px] cursor-pointer ${
              isMobileViewport ? 'px-3 py-2' : 'px-[10px] py-1.5'
            }`}
          >
            {t('citizen.dashboard.clearSelection')}
          </button>
        ) : null}
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
          showSelectedPopup
        />
        {!hasPinsForFilter ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gradient-to-b from-white/[0.16] to-white/[0.42]">
            <div className="citizen-map-empty-card pointer-events-auto bg-white/[0.96] border border-slate-200 rounded-xl px-3 py-2.5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              <div className="text-xs font-bold text-slate-900 mb-1">
                {t('citizen.dashboard.noMapPins')}
              </div>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="border border-blue-200 bg-blue-50 text-primary rounded-lg text-[11px] font-bold px-2.5 py-1.5 cursor-pointer"
              >
                {t('citizen.dashboard.showAllPins')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Details now appear in popup anchored to selected pin. */}
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
      <div className="font-bold text-sm text-slate-900 mb-2.5">Submitted Reports</div>
      <div className="bg-white rounded-[14px] px-3.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-slate-100 mb-4">
        {myReports.map((report) => (
          <MyReportRow key={report.id} report={report} />
        ))}
      </div>

      {/* Status guide */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
        <div className="font-bold text-[13px] text-slate-900 mb-2.5">Report Status Guide</div>
        {[
          { status: 'active' as const, desc: 'Received, awaiting assignment' },
          { status: 'responding' as const, desc: 'Responders have been deployed' },
          { status: 'contained' as const, desc: 'Situation is under control' },
          { status: 'resolved' as const, desc: 'Incident fully resolved' },
        ].map(({ status, desc }) => (
          <div key={status} className="flex items-center gap-2.5 mb-2">
            <StatusBadge status={status} size="sm" />
            <span className="text-xs text-slate-500">{desc}</span>
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
  myReports,
  verificationPreview,
}: {
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
  const resolvedCount = myReports.filter((report) => report.status === 'resolved').length;
  const pendingCount = myReports.filter((report) => report.status !== 'resolved').length;
  const verificationSummary = getVerificationSummary(verificationPreview);

  const _handleSettingAction = (action: 'personal' | 'notifications' | 'verification' | 'barangay' | 'contact') => {
    if (action === 'personal') {
      setEditOpen(true);
      setSettingMessage('');
      return;
    }

    if (action === 'notifications') {
      setSettingMessage('Use the bell icon on the top-right to view recent report updates and alerts.');
      return;
    }

    if (action === 'verification') {
      if (verificationPreview.isVerified) {
        setSettingMessage('Your account is already ID-verified. No further action is required.');
      } else {
        navigate('/citizen/verification');
      }
      return;
    }

    if (action === 'barangay') {
      navigate('/citizen?tab=map');
      return;
    }

    if (action === 'contact') {
      if (!phoneDigits) {
        setSettingMessage('No valid contact number is available for this account.');
        return;
      }
      window.location.href = `tel:${phoneDigits}`;
    }
  };

  return (
    <div className="citizen-content-shell pt-4 pb-4">
      {/* Profile card */}
      <div className="bg-primary rounded-[20px] px-5 py-6 text-white mb-5 flex flex-col items-center gap-2.5 text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-severity-medium flex items-center justify-center text-[28px] font-extrabold text-white border-[3px] border-white/30">
          {initials}
        </div>
        <div>
          <div className="font-extrabold text-xl">{fullName}</div>
          <div className="text-xs text-blue-200 mt-0.5">{phoneNumber}</div>
          <div className="text-[11px] text-blue-300 mt-1">{barangayLabel} - Tondo, Manila</div>
        </div>
        <div className="bg-white/15 rounded-full py-[5px] px-3.5 text-[11px] font-bold flex items-center gap-[5px] border border-white/20">
          <Shield size={12} /> {verificationSummary.statusLabel}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 mb-5">
        {[
          { label: t('citizen.dashboard.reportsFiled'), value: myReports.length, icon: <FileText size={16} />, accent: 'var(--primary)' },
          { label: t('status.resolved'), value: resolvedCount, icon: <CheckCircle2 size={16} />, accent: '#059669' },
          { label: t('citizen.dashboard.pending'), value: pendingCount, icon: <Clock size={16} />, accent: 'var(--severity-medium)' },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} accent={s.accent} />
        ))}
      </div>

      {/* Verification preview */}
      <div className="font-bold text-sm text-slate-900 mb-2.5">{t('citizen.dashboard.verificationPreview')}</div>
      <div
        className={`mb-4 rounded-[14px] px-3.5 py-3 ${verificationSummary.surfaceClass}`}
      >
        <div className={`font-bold text-[13px] ${verificationSummary.titleClass}`}>
          {verificationSummary.title}
        </div>
        <div className="text-xs text-slate-600 mt-1 leading-[1.5]">{verificationSummary.detail}</div>
        {verificationPreview.idImageUrl ? (
          <a
            href={verificationPreview.idImageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-2 no-underline text-primary text-xs font-bold"
          >
            {t('citizen.dashboard.viewLatestId')}
          </a>
        ) : null}
      </div>

      {/* Account info */}
      <div className="font-bold text-sm text-slate-900 mb-2.5">{t('citizen.dashboard.accountInformation')}</div>
      <div className="bg-white rounded-[14px] overflow-hidden border border-slate-100 mb-4">
        {[
          { icon: <User size={16} />, label: t('settings.personalInfo'), sub: fullName, action: 'personal' as const },
          { icon: <Bell size={16} />, label: t('common.notifications'), sub: t('citizen.dashboard.alertsSubLabel'), action: 'notifications' as const },
          { icon: <Shield size={16} />, label: t('citizen.dashboard.verificationStatus'), sub: verificationSummary.statusLabel, action: 'verification' as const },
          { icon: <MapPin size={16} />, label: t('citizen.dashboard.homeBarangay'), sub: barangayLabel, action: 'barangay' as const },
          { icon: <Phone size={16} />, label: t('citizen.dashboard.contactNumber'), sub: phoneNumber, action: 'contact' as const },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-default text-left bg-white ${
              idx < arr.length - 1 ? 'border-b border-slate-50' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 text-primary flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[13px] text-slate-900">{item.label}</div>
              <div className="text-[11px] text-slate-400 mt-px">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-3.5 text-slate-600 text-xs leading-[1.5]">
        Your profile details are tied to your registered and verified account. For account corrections, contact your barangay administrator.
      </div>

      {!session?.user.isPhoneVerified ? (
        <button
          onClick={() => navigate('/auth/register')}
          className="w-full py-3 rounded-xl border-[1.5px] border-blue-200 bg-blue-50 text-primary font-bold text-[13px] cursor-pointer mb-3"
        >
          {t('citizen.dashboard.verifyPhoneNumber')}
        </button>
      ) : null}

      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <button
          onClick={() => navigate('/citizen/verification')}
          className="w-full py-3 rounded-xl border-[1.5px] border-blue-200 bg-blue-50 text-primary font-bold text-[13px] cursor-pointer mb-3"
        >
          {t('citizen.dashboard.openVerificationStatus')}
        </button>
      ) : null}

      {/* Sign out */}
      <button
        onClick={() => {
          clearAuthSession();
          navigate('/auth/login', { replace: true });
        }}
        className="w-full py-3.5 rounded-xl border-[1.5px] border-red-100 bg-red-50 text-red-700 font-bold text-sm cursor-pointer"
      >
        {t('common.signOut')}
      </button>
    </div>
  );
}
