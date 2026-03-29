import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Shield, Bell, MapPin, FileText, User, Plus,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
  Droplets, Car, Activity, Zap, AlertCircle,
  Phone, Info, CloudRain, Eye, Search, Filter,
  ArrowRight, ArrowLeft, TrendingUp, Map, Menu,
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
    };
  }

  if (verification.isVerified || verification.verificationStatus === 'APPROVED') {
    return {
      title: 'Verified Citizen',
      detail: 'Your resident ID has been approved.',
      statusLabel: 'Verified',
      color: '#065F46',
      bg: '#DCFCE7',
    };
  }

  if (verification.verificationStatus === 'PENDING') {
    return {
      title: 'Verification Under Review',
      detail: 'Your submitted ID is currently being reviewed by barangay staff.',
      statusLabel: 'Pending Review',
      color: '#92400E',
      bg: '#FEF3C7',
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
    };
  }

  return {
    title: 'ID Verification Required',
    detail: 'Submit one valid ID photo so your account can be verified.',
    statusLabel: 'Not Submitted',
    color: 'var(--primary)',
    bg: '#DBEAFE',
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

/* ── sub-components ──────────────────────────────────────────────────── */
function AlertBanner({ incidents }: { incidents: Incident[] }) {
  const [dismissed, setDismissed] = useState(false);
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
        <span className="font-bold">
          {criticalCount} Critical Report{criticalCount > 1 ? 's' : ''}
        </span>{' '}
        in your submissions still needs attention.
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
  return (
    <div
      className="bg-white rounded-xl p-3 min-w-0 w-full flex flex-col gap-1 shadow-sm"
      style={{ border: `1.5px solid ${accent}22` }}
    >
      <div
        className="w-[30px] h-[30px] rounded-lg flex items-center justify-center mb-0.5"
        style={{ background: `${accent}18`, color: accent }}
      >
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
  return (
    <button
      onClick={onClick}
      className="rounded-xl cursor-pointer flex flex-col items-start gap-2 w-full text-left hover:-translate-y-0.5 transition-transform duration-150"
      style={{
        padding: '18px 16px',
        background: featured ? accent : '#fff',
        border: featured ? 'none' : '1.5px solid #E2E8F0',
        boxShadow: featured ? '0 8px 16px rgba(15,23,42,0.14)' : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          background: featured ? 'rgba(255,255,255,0.25)' : `${accent}18`,
          color: featured ? '#fff' : accent,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="font-bold text-sm mb-0.5"
          style={{ color: featured ? '#fff' : '#1E293B' }}
        >
          {label}
        </div>
        <div
          className="text-[11px] leading-snug"
          style={{ color: featured ? 'rgba(255,255,255,0.75)' : '#64748B' }}
        >
          {sublabel}
        </div>
      </div>
      <div
        className="mt-auto flex items-center gap-[3px] text-[11px] font-semibold"
        style={{ color: featured ? 'rgba(255,255,255,0.8)' : accent }}
      >
        Tap to open <ArrowRight size={11} />
      </div>
    </button>
  );
}

function RecentIncidentRow({ report }: { report: CitizenMyReport }) {
  const cfg = incidentTypeConfig[report.type];
  return (
    <div className="flex items-center gap-3 py-[11px] border-b border-slate-100">
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: cfg.bgColor, color: cfg.color }}
      >
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
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: cfg.bgColor, color: cfg.color }}
      >
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
  const greetingLabel = nowHour < 12 ? 'Good morning' : nowHour < 18 ? 'Good afternoon' : 'Good evening';
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [myReports, setMyReports] = useState<CitizenMyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        title: 'Critical Report Alert',
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
        time: 'Account',
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
      title: 'No new alerts',
      desc: 'You are all caught up for now.',
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
    setMobileMenuOpen(false);
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
      if (!silent) {
        setIncidents([]);
        setMyReports([]);
      }
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
      setMobileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
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
            style={{ padding: '0 var(--citizen-content-gutter)' }}
          >
            <div className="flex items-center gap-2.5">
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />
            </div>

            <div className="flex items-center gap-2.5">
              <CitizenMobileMenu
                activeKey={activeTab}
                open={mobileMenuOpen}
                onToggle={() => {
                  setMobileMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                  setProfileMenuOpen(false);
                }}
                onNavigate={(key) => {
                  setMobileMenuOpen(false);
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
                  setMobileMenuOpen(false);
                }}
              />
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open profile actions"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setMobileMenuOpen(false);
                  }}
                  className="w-9 h-9 rounded-[10px] bg-severity-medium flex items-center justify-center text-white font-extrabold text-sm cursor-pointer border-0"
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
                      Open profile page
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
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }}
      mainOnScroll={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
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
        <div className="font-extrabold text-[28px] leading-[1.15] mt-1">Citizen Dashboard</div>
        <div className="text-[13px] text-indigo-200 mt-0.5">
          Track your submitted reports and stay updated on response progress.
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
          className="grid gap-2.5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}
        >
          <StatCard
            icon={<AlertTriangle size={16} />}
            value={activeIncidents.length}
            label="Active Reports"
            accent="var(--severity-critical)"
          />
          <StatCard
            icon={<Clock size={16} />}
            value={criticalCount}
            label="Critical"
            accent="var(--severity-medium)"
          />
          <StatCard
            icon={<CheckCircle2 size={16} />}
            value={myReports.length}
            label="Total My Reports"
            accent="var(--primary)"
          />
        </div>
      </section>

      {/* Verification prompt */}
      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <section
          className="rounded-2xl p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
          style={{
            background: verificationSummary.bg,
            border: `1px solid ${verificationSummary.color}33`,
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold text-[15px]" style={{ color: verificationSummary.color }}>
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
              Open Verification
            </button>
          </div>
        </section>
      ) : null}

      {/* Map preview */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <div className="font-bold text-slate-950 text-base">My Report Map</div>
            <div className="text-xs text-slate-500">Pins and activity based on your submitted reports only.</div>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-[7px] text-primary font-bold text-xs cursor-pointer inline-flex items-center gap-[5px]"
          >
            Open Full Map <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <aside className="flex-[1_1_320px] max-w-full min-w-0 flex flex-col gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5">
              <div className="text-[11px] font-semibold text-slate-600">Map Summary</div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <div className="text-[10px] text-slate-500">Total Pins</div>
                  <div className="text-lg font-extrabold text-primary">{incidents.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Needs Attention</div>
                  <div className="text-lg font-extrabold text-severity-medium">{criticalCount}</div>
                </div>
              </div>
            </div>

            {selectedIncident ? (
              <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-3 py-2.5">
                <div className="text-[11px] text-primary font-bold mb-1.5">Selected Pin</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: incidentTypeConfig[selectedIncident.type].bgColor,
                      color: incidentTypeConfig[selectedIncident.type].color,
                    }}
                  >
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
                Tap any map pin to see details.
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
        <div className="font-bold text-base text-slate-900 mb-2.5">Quick Actions</div>
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          <QuickActionCard
            icon={<Plus size={22} />}
            label="Submit Incident Report"
            sublabel="Create a new report with map pin and evidence"
            accent="var(--severity-critical)"
            featured
            onClick={() => navigate('/citizen/report')}
          />
          <QuickActionCard
            icon={<FileText size={22} />}
            label="My Reports"
            sublabel="View and track your report statuses"
            accent="var(--primary)"
            onClick={() => navigate('/citizen/my-reports')}
          />
          <QuickActionCard
            icon={<MapPin size={22} />}
            label="My Report Map"
            sublabel="Inspect your pinned report locations"
            accent="#059669"
            onClick={() => setActiveTab('map')}
          />
          <QuickActionCard
            icon={<User size={22} />}
            label="Profile Settings"
            sublabel="Update your account information"
            accent="var(--severity-medium)"
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-bold text-base text-slate-900">Recent Report Activity</div>
          <button
            className="bg-transparent border-0 text-primary text-xs font-bold cursor-pointer inline-flex items-center gap-1"
            onClick={() => navigate('/citizen/my-reports')}
          >
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div className="border border-slate-100 rounded-xl px-3 py-1">
          {myReports.slice(0, 3).map((report) => (
            <RecentIncidentRow key={report.id} report={report} />
          ))}
          {myReports.length === 0 && (
            <div className="text-center py-5 text-slate-400 text-[13px]">
              No submitted reports yet.
            </div>
          )}
        </div>
      </section>

      {/* Emergency contacts */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3">
        <div className="font-bold text-base text-slate-900 mb-2.5">Emergency Contacts</div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Emergency Hotline', number: '911', color: 'var(--severity-critical)', bg: '#FEE2E2' },
            { label: 'MDRRMO Office', number: '(02) 123-4567', color: 'var(--primary)', bg: '#DBEAFE' },
            { label: 'Barangay Hotline', number: '(02) 765-4321', color: '#059669', bg: '#D1FAE5' },
          ].map((contact) => (
            <a
              key={contact.label}
              href={`tel:${contact.number.replace(/\D/g, '')}`}
              className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3 no-underline border border-slate-200"
            >
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: contact.bg, color: contact.color }}
              >
                <Phone size={17} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[13px] text-slate-900">{contact.label}</div>
                <div className="text-xs font-bold mt-px" style={{ color: contact.color }}>{contact.number}</div>
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

function ReportTab() {
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
        className="rounded-2xl p-4 mb-5 text-white"
        style={{ background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' }}
      >
        <div className="font-extrabold text-lg mb-1">Submit Incident Report</div>
        <div className="text-xs text-white/75">
          Help keep your community safe by reporting incidents promptly.
        </div>
        <div className="flex gap-1.5 mt-3.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-sm transition-[background] duration-300"
              style={{ background: s <= step ? '#fff' : 'rgba(255,255,255,0.3)' }}
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
              const cfg = incidentTypeConfig[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="rounded-[14px] cursor-pointer flex items-center gap-2.5 transition-all duration-200"
                  style={{
                    padding: '14px 12px',
                    background: isSelected ? cfg.color : '#fff',
                    border: `2px solid ${isSelected ? cfg.color : '#E2E8F0'}`,
                    boxShadow: isSelected ? `0 4px 12px ${cfg.color}44` : '0 1px 4px rgba(0,0,0,0.07)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.25)' : cfg.bgColor,
                      color: isSelected ? '#fff' : cfg.color,
                    }}
                  >
                    {icon}
                  </div>
                  <span
                    className="font-semibold text-[13px]"
                    style={{ color: isSelected ? '#fff' : '#1E293B' }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => selectedType && setStep(2)}
            disabled={!selectedType}
            className="mt-5 w-full border-0 rounded-xl py-3.5 font-bold text-sm transition-colors duration-200"
            style={{
              background: selectedType ? 'var(--primary)' : '#E2E8F0',
              color: selectedType ? '#fff' : '#94A3B8',
              cursor: selectedType ? 'pointer' : 'not-allowed',
            }}
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
                { key: 'low', label: 'Low', color: '#059669', bg: '#D1FAE5' },
                { key: 'medium', label: 'Medium', color: 'var(--severity-medium)', bg: '#FEF3C7' },
                { key: 'high', label: 'High', color: '#C2410C', bg: '#FFEDD5' },
                { key: 'critical', label: 'Critical', color: 'var(--severity-critical)', bg: '#FEE2E2' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSeverity(s.key)}
                  className="py-2 px-1 rounded-lg font-bold text-[11px] cursor-pointer transition-all duration-150"
                  style={{
                    border: `2px solid ${severity === s.key ? s.color : '#E2E8F0'}`,
                    background: severity === s.key ? s.bg : '#fff',
                    color: severity === s.key ? s.color : '#94A3B8',
                  }}
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
              className="flex-[2] border-0 rounded-xl py-3.5 font-bold text-sm"
              style={{
                background: description && location && severity ? 'var(--primary)' : '#E2E8F0',
                color: description && location && severity ? '#fff' : '#94A3B8',
                cursor: description && location && severity ? 'pointer' : 'not-allowed',
              }}
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
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
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
              className="flex-[2] text-white border-0 rounded-xl py-3.5 font-bold text-sm cursor-pointer shadow-[0_4px_12px_rgba(185,28,28,0.4)]"
              style={{ background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' }}
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
  const mapShellMinHeight = isMobileViewport
    ? (isCompactMobileHeight ? 'calc(100dvh - 108px)' : 'calc(100dvh - 120px)')
    : 'calc(100dvh - 176px)';

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
    <div className="flex flex-col" style={{ minHeight: mapShellMinHeight }}>
      {/* Filters */}
      <div className="citizen-map-filter-bar px-4 py-3 bg-white border-b border-slate-100 flex gap-2 items-center flex-wrap">
        <div className="font-bold text-sm text-slate-900 flex-1">My Report Map</div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-[10px] border border-blue-200 bg-blue-50 text-primary font-bold text-[11px] cursor-pointer inline-flex items-center gap-1.5"
          style={{ padding: isMobileViewport ? '8px 12px' : '6px 10px' }}
        >
          <ArrowLeft size={12} />
          Back to Dashboard
        </button>
        {(['all', 'active', 'responding'] as const).map((f) => (
          <button
            className="citizen-map-filter-chip border-0 rounded-full font-semibold capitalize cursor-pointer"
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: isMobileViewport ? '8px 14px' : '5px 12px',
              background: filter === f ? 'var(--primary)' : '#F1F5F9',
              color: filter === f ? '#fff' : '#64748B',
              fontSize: isMobileViewport ? 12 : 11,
            }}
          >
            {f}
          </button>
        ))}
        {selectedIncident ? (
          <button
            className="citizen-map-clear-btn ml-auto border border-slate-200 bg-white text-slate-600 font-bold text-[11px] rounded-[10px] cursor-pointer"
            type="button"
            onClick={() => setSelectedIncident(null)}
            style={{ padding: isMobileViewport ? '8px 12px' : '6px 10px' }}
          >
            Clear Selection
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
                No map pins for this filter
              </div>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="border border-blue-200 bg-blue-50 text-primary rounded-lg text-[11px] font-bold px-2.5 py-1.5 cursor-pointer"
              >
                Show all pins
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
function MyReportsTab({ myReports }: { myReports: CitizenMyReport[] }) {
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

  const handleSettingAction = (action: 'personal' | 'notifications' | 'verification' | 'barangay' | 'contact') => {
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
          { label: 'Reports Filed', value: myReports.length, icon: <FileText size={16} />, accent: 'var(--primary)' },
          { label: 'Resolved', value: resolvedCount, icon: <CheckCircle2 size={16} />, accent: '#059669' },
          { label: 'Pending', value: pendingCount, icon: <Clock size={16} />, accent: 'var(--severity-medium)' },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} accent={s.accent} />
        ))}
      </div>

      {/* Verification preview */}
      <div className="font-bold text-sm text-slate-900 mb-2.5">Verification Preview</div>
      <div
        className="rounded-[14px] px-3.5 py-3 mb-4"
        style={{
          background: verificationSummary.bg,
          border: `1px solid ${verificationSummary.color}33`,
        }}
      >
        <div className="font-bold text-[13px]" style={{ color: verificationSummary.color }}>
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
            View latest uploaded ID
          </a>
        ) : null}
      </div>

      {/* Account info */}
      <div className="font-bold text-sm text-slate-900 mb-2.5">Account Information</div>
      <div className="bg-white rounded-[14px] overflow-hidden border border-slate-100 mb-4">
        {[
          { icon: <User size={16} />, label: 'Personal Information', sub: fullName, action: 'personal' as const },
          { icon: <Bell size={16} />, label: 'Notifications', sub: 'Alerts, updates, advisories', action: 'notifications' as const },
          { icon: <Shield size={16} />, label: 'Verification Status', sub: verificationSummary.statusLabel, action: 'verification' as const },
          { icon: <MapPin size={16} />, label: 'Home Barangay', sub: barangayLabel, action: 'barangay' as const },
          { icon: <Phone size={16} />, label: 'Contact Number', sub: phoneNumber, action: 'contact' as const },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            className="w-full flex items-center gap-3 px-4 py-3.5 cursor-default text-left bg-white"
            style={{ borderBottom: idx < arr.length - 1 ? '1px solid #F8FAFC' : 'none' }}
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
          Verify Phone Number
        </button>
      ) : null}

      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <button
          onClick={() => navigate('/citizen/verification')}
          className="w-full py-3 rounded-xl border-[1.5px] border-blue-200 bg-blue-50 text-primary font-bold text-[13px] cursor-pointer mb-3"
        >
          Open Verification Status
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
        Sign Out
      </button>
    </div>
  );
}
