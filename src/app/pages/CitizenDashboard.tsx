import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Shield, Bell, MapPin, FileText, User, Plus,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
  Flame, Droplets, Car, Activity, Zap, AlertCircle,
  Phone, Info, CloudRain, Eye, Search, Filter,
  ArrowRight, ArrowLeft, TrendingUp, Map, Menu,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
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

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      color: '#B91C1C',
      bg: '#FEE2E2',
    };
  }

  return {
    title: 'ID Verification Required',
    detail: 'Submit one valid ID photo so your account can be verified.',
    statusLabel: 'Not Submitted',
    color: '#1E3A8A',
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
  fire: <Flame size={14} />,
  flood: <Droplets size={14} />,
  accident: <Car size={14} />,
  medical: <Activity size={14} />,
  crime: <AlertCircle size={14} />,
  infrastructure: <Zap size={14} />,
  typhoon: <CloudRain size={14} />,
};

/* â”€â”€ sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AlertBanner({ incidents }: { incidents: Incident[] }) {
  const [dismissed, setDismissed] = useState(false);
  const criticalCount = incidents.filter(
    (item) => (item.status === 'active' || item.status === 'responding') && item.severity === 'critical',
  ).length;
  if (dismissed || criticalCount === 0) return null;
  return (
    <div
      style={{
        background: '#B91C1C',
        borderBottom: '1px solid #991B1B',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
      }}
    >
      <span
        style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 8,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={15} />
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ fontWeight: 700 }}>
          {criticalCount} Critical Report{criticalCount > 1 ? 's' : ''}
        </span>{' '}
        in your submissions still needs attention.
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
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
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '12px 14px',
        minWidth: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: `1.5px solid ${accent}22`,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${accent}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          marginBottom: 2,
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 800, color: '#1E293B', fontSize: 20, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>{label}</div>
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
      style={{
        background: featured ? accent : '#fff',
        border: featured ? 'none' : `1.5px solid #E2E8F0`,
        borderRadius: 12,
        padding: '18px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        boxShadow: featured
          ? '0 8px 16px rgba(15,23,42,0.14)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseOver={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)')
      }
      onMouseOut={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)')
      }
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: featured ? 'rgba(255,255,255,0.25)' : `${accent}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: featured ? '#fff' : accent,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: featured ? '#fff' : '#1E293B',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: featured ? 'rgba(255,255,255,0.75)' : '#64748B',
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </div>
      </div>
      <div
        style={{
          marginTop: 'auto',
          color: featured ? 'rgba(255,255,255,0.8)' : accent,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Tap to open <ArrowRight size={11} />
      </div>
    </button>
  );
}

function RecentIncidentRow({ report }: { report: CitizenMyReport }) {
  const cfg = incidentTypeConfig[report.type];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: cfg.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cfg.color,
          flexShrink: 0,
        }}
      >
        {typeIcon[report.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#1E293B',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cfg.label} - {report.id}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: cfg.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cfg.color,
          flexShrink: 0,
        }}
      >
        {typeIcon[report.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#1E293B',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {report.description}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
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

/* â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        color: '#B91C1C',
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
      color: '#1E3A8A',
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

  useEffect(() => {
    const load = async () => {
      setReportsLoading(true);
      try {
        const payload = await citizenReportsApi.getMyReports();
        const mappedIncidents = payload.reports.map((report) => reportToIncident(report));
        setIncidents(mappedIncidents);
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
        setReportsLoading(false);
      }
    };

    void load();
  }, []);

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
        <header
          className="citizen-web-header"
          style={{
            background: '#1E3A8A',
            display: 'flex',
            alignItems: 'center',
            height: 60,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 2px 8px rgba(15,23,42,0.14)',
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
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Citizen Portal"
                style={{ height: 38, width: 'auto', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <div style={{ position: 'relative' }}>
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
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#B4730A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    border: 'none',
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
                      boxShadow: '0 8px 18px rgba(15,23,42,0.12)',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      zIndex: 110,
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActiveTab('profile');
                        setProfileMenuOpen(false);
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HOME TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
      <div className="citizen-content-shell" style={{ paddingTop: 16, paddingBottom: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
    <div className="citizen-content-shell" style={{ paddingTop: 16, paddingBottom: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section
        style={{
          background: '#1E3A8A',
          borderRadius: 12,
          padding: '16px 16px 14px',
          color: '#fff',
          boxShadow: '0 8px 16px rgba(15,23,42,0.14)',
        }}
      >
        <div style={{ fontSize: 13, color: '#BFDBFE' }}>{greetingLabel}, {firstName}.</div>
        <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.15, marginTop: 4 }}>Citizen Dashboard</div>
        <div style={{ fontSize: 13, color: '#C7D2FE', marginTop: 2 }}>
          Track your submitted reports and stay updated on response progress.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <span style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600 }}>
            {barangayLabel}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600 }}>
            {todayLabel}
          </span>
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: 12,
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          }}
        >
          <StatCard
            icon={<AlertTriangle size={16} />}
            value={activeIncidents.length}
            label="Active Reports"
            accent="#B91C1C"
          />
          <StatCard
            icon={<Clock size={16} />}
            value={criticalCount}
            label="Critical"
            accent="#B4730A"
          />
          <StatCard
            icon={<CheckCircle2 size={16} />}
            value={myReports.length}
            label="Total My Reports"
            accent="#1E3A8A"
          />
        </div>
      </section>

      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <section
          style={{
            background: verificationSummary.bg,
            borderRadius: 16,
            border: `1px solid ${verificationSummary.color}33`,
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: verificationSummary.color }}>
                {verificationSummary.title}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {verificationSummary.detail}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/citizen/verification')}
              style={{
                border: 'none',
                borderRadius: 10,
                background: '#1E3A8A',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                padding: '10px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Open Verification
            </button>
          </div>
        </section>
      ) : null}

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 16 }}>My Report Map</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Pins and activity based on your submitted reports only.</div>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 8,
              padding: '7px 10px',
              color: '#1E3A8A',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            Open Full Map <ArrowRight size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <aside
            style={{
              flex: '1 1 320px',
              maxWidth: '100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Map Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Total Pins</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A8A' }}>{incidents.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Needs Attention</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#B4730A' }}>{criticalCount}</div>
                </div>
              </div>
            </div>

            {selectedIncident ? (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#1E3A8A', fontWeight: 700, marginBottom: 6 }}>Selected Pin</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: incidentTypeConfig[selectedIncident.type].bgColor,
                      color: incidentTypeConfig[selectedIncident.type].color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {typeIcon[selectedIncident.type]}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedIncident.id}</div>
                    <div style={{ fontSize: 10, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedIncident.location}</div>
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <StatusBadge status={selectedIncident.status} size="sm" pulse />
                </div>
              </div>
            ) : (
              <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#64748B' }}>
                Tap any map pin to see details.
              </div>
            )}
          </aside>

          <div style={{ flex: '1 1 420px', minWidth: 320 }}>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                background: '#fff',
                display: 'block',
                width: '100%',
                minHeight: 360,
              }}
            >
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

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1E293B', marginBottom: 10 }}>Quick Actions</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          <QuickActionCard
            icon={<Plus size={22} />}
            label="Submit Incident Report"
            sublabel="Create a new report with map pin and evidence"
            accent="#B91C1C"
            featured
            onClick={() => navigate('/citizen/report')}
          />
          <QuickActionCard
            icon={<FileText size={22} />}
            label="My Reports"
            sublabel="View and track your report statuses"
            accent="#1E3A8A"
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
            accent="#B4730A"
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1E293B' }}>Recent Report Activity</div>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#1E3A8A',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => navigate('/citizen/my-reports')}
          >
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div style={{ border: '1px solid #F1F5F9', borderRadius: 12, padding: '4px 12px' }}>
          {myReports.slice(0, 3).map((report) => (
            <RecentIncidentRow key={report.id} report={report} />
          ))}
          {myReports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>
              No submitted reports yet.
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1E293B', marginBottom: 10 }}>Emergency Contacts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Emergency Hotline', number: '911', color: '#B91C1C', bg: '#FEE2E2' },
            { label: 'MDRRMO Office', number: '(02) 123-4567', color: '#1E3A8A', bg: '#DBEAFE' },
            { label: 'Barangay Hotline', number: '(02) 765-4321', color: '#059669', bg: '#D1FAE5' },
          ].map((contact) => (
            <a
              key={contact.label}
              href={`tel:${contact.number.replace(/\D/g, '')}`}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                border: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: contact.bg,
                  color: contact.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                  {contact.label}
                </div>
                <div style={{ fontSize: 12, color: contact.color, fontWeight: 700, marginTop: 1 }}>
                  {contact.number}
                </div>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REPORT TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const REPORT_TYPES: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
  { type: 'fire', label: 'Fire', icon: <Flame size={20} /> },
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          padding: 32,
          textAlign: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
          }}
        >
          <CheckCircle2 size={40} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#1E293B' }}>
          Report Submitted!
        </div>
        <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Your incident report has been received. Our responders have been notified and will act accordingly. Track your report under "My Reports".
        </div>
        <div
          style={{
            background: '#EFF6FF',
            borderRadius: 12,
            padding: '10px 20px',
            color: '#1E3A8A',
            fontWeight: 700,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          Reference number will appear in My Reports after processing.
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Redirecting you back shortly...</div>
      </div>
    );
  }

  return (
    <div className="citizen-content-shell" style={{ paddingTop: 20, paddingBottom: 20 }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 20,
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          Submit Incident Report
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          Help keep your community safe by reporting incidents promptly.
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
          Step {step} of 3 - {step === 1 ? 'Incident Type' : step === 2 ? 'Details' : 'Review & Submit'}
        </div>
      </div>

      {/* Step 1: type */}
      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 12 }}>
            What type of incident?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {REPORT_TYPES.map(({ type, label, icon }) => {
              const cfg = incidentTypeConfig[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    background: isSelected ? cfg.color : '#fff',
                    border: `2px solid ${isSelected ? cfg.color : '#E2E8F0'}`,
                    borderRadius: 14,
                    padding: '14px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? `0 4px 12px ${cfg.color}44` : '0 1px 4px rgba(0,0,0,0.07)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isSelected ? 'rgba(255,255,255,0.25)' : cfg.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#fff' : cfg.color,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: isSelected ? '#fff' : '#1E293B',
                    }}
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
            style={{
              marginTop: 20,
              width: '100%',
              background: selectedType ? '#1E3A8A' : '#E2E8F0',
              color: selectedType ? '#fff' : '#94A3B8',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontWeight: 700,
              fontSize: 14,
              cursor: selectedType ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {'Continue ->'}
          </button>
        </div>
      )}

      {/* Step 2: details */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 2 }}>
            Describe the incident
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Location / Address *
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Purok 3, Brgy. San Antonio"
              style={{
                width: '100%',
                padding: '11px 13px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                fontFamily: 'Roboto, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Severity Level *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { key: 'low', label: 'Low', color: '#059669', bg: '#D1FAE5' },
                { key: 'medium', label: 'Medium', color: '#B4730A', bg: '#FEF3C7' },
                { key: 'high', label: 'High', color: '#C2410C', bg: '#FFEDD5' },
                { key: 'critical', label: 'Critical', color: '#B91C1C', bg: '#FEE2E2' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSeverity(s.key)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `2px solid ${severity === s.key ? s.color : '#E2E8F0'}`,
                    background: severity === s.key ? s.bg : '#fff',
                    color: severity === s.key ? s.color : '#94A3B8',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what is happening..."
              rows={4}
              style={{
                width: '100%',
                padding: '11px 13px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                fontFamily: 'Roboto, sans-serif',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                flex: 1,
                background: '#F1F5F9',
                color: '#475569',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {'<- Back'}
            </button>
            <button
              onClick={() => description && location && severity && setStep(3)}
              disabled={!description || !location || !severity}
              style={{
                flex: 2,
                background: description && location && severity ? '#1E3A8A' : '#E2E8F0',
                color: description && location && severity ? '#fff' : '#94A3B8',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontWeight: 700,
                fontSize: 14,
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
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 14 }}>
            Review your report
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '16px',
              border: '1.5px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: 'Incident Type', value: incidentTypeConfig[selectedType].label },
              { label: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1) },
              { label: 'Location', value: location },
              { label: 'Description', value: description },
              { label: 'Reported By', value: 'Juan Dela Cruz' },
              { label: 'Date & Time', value: new Date().toLocaleString('en-PH') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{value}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: '#FFFBEB',
              borderRadius: 10,
              padding: '10px 14px',
              border: '1px solid #FDE68A',
              marginBottom: 16,
              fontSize: 12,
              color: '#92400E',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            False reporting is punishable by law. Only submit genuine emergencies or concerns.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStep(2)}
              style={{
                flex: 1,
                background: '#F1F5F9',
                color: '#475569',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {'<- Edit'}
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(185,28,28,0.4)',
              }}
            >
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAP TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: mapShellMinHeight }}>
      {/* Filters */}
      <div
        className="citizen-map-filter-bar"
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', flex: 1 }}>
          My Report Map
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: isMobileViewport ? '8px 12px' : '6px 10px',
            borderRadius: 10,
            border: '1px solid #BFDBFE',
            background: '#EFF6FF',
            color: '#1E3A8A',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={12} />
          Back to Dashboard
        </button>
        {(['all', 'active', 'responding'] as const).map((f) => (
          <button
            className="citizen-map-filter-chip"
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: isMobileViewport ? '8px 14px' : '5px 12px',
              borderRadius: 20,
              border: 'none',
              background: filter === f ? '#1E3A8A' : '#F1F5F9',
              color: filter === f ? '#fff' : '#64748B',
              fontWeight: 600,
              fontSize: isMobileViewport ? 12 : 11,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
        {selectedIncident ? (
          <button
            className="citizen-map-clear-btn"
            type="button"
            onClick={() => setSelectedIncident(null)}
            style={{
              marginLeft: 'auto',
              padding: isMobileViewport ? '8px 12px' : '6px 10px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: '#fff',
              color: '#475569',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        ) : null}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.42))',
            }}
          >
            <div
              className="citizen-map-empty-card"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '10px 12px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                No map pins for this filter
              </div>
              <button
                type="button"
                onClick={() => setFilter('all')}
                style={{
                  border: '1px solid #BFDBFE',
                  background: '#EFF6FF',
                  color: '#1E3A8A',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MY REPORTS TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MyReportsTab({ myReports }: { myReports: CitizenMyReport[] }) {
  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div
        style={{
          background: '#1E3A8A',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 18,
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>My Reports</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          You have submitted {myReports.length} incident reports.
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {[
            { label: 'Submitted', value: myReports.length, color: '#BFDBFE' },
            { label: 'Responding', value: myReports.filter(r => r.status === 'responding').length, color: '#FDE68A' },
            { label: 'Resolved', value: myReports.filter(r => r.status === 'resolved').length, color: '#A7F3D0' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report list */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 10 }}>
        Submitted Reports
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '4px 14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          border: '1px solid #F1F5F9',
          marginBottom: 16,
        }}
      >
        {myReports.map((report) => (
          <MyReportRow key={report.id} report={report} />
        ))}
      </div>

      {/* Status guide */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: 12,
          padding: '14px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginBottom: 10 }}>
          Report Status Guide
        </div>
        {[
          { status: 'active' as const, desc: 'Received, awaiting assignment' },
          { status: 'responding' as const, desc: 'Responders have been deployed' },
          { status: 'contained' as const, desc: 'Situation is under control' },
          { status: 'resolved' as const, desc: 'Incident fully resolved' },
        ].map(({ status, desc }) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <StatusBadge status={status} size="sm" />
            <span style={{ fontSize: 12, color: '#64748B' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROFILE TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
    <div className="citizen-content-shell" style={{ paddingTop: 16, paddingBottom: 16 }}>
      {/* Profile card */}
      <div
        style={{
          background: '#1E3A8A',
          borderRadius: 20,
          padding: '24px 20px',
          color: '#fff',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#B4730A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            border: '3px solid rgba(255,255,255,0.3)',
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{fullName}</div>
          <div style={{ fontSize: 12, color: '#BFDBFE', marginTop: 2 }}>
            {phoneNumber}
          </div>
          <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 4 }}>
            {barangayLabel} - Tondo, Manila
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Shield size={12} /> {verificationSummary.statusLabel}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Reports Filed', value: myReports.length, icon: <FileText size={16} />, accent: '#1E3A8A' },
          { label: 'Resolved', value: resolvedCount, icon: <CheckCircle2 size={16} />, accent: '#059669' },
          { label: 'Pending', value: pendingCount, icon: <Clock size={16} />, accent: '#B4730A' },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} accent={s.accent} />
        ))}
      </div>

      {/* Read-only profile information */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 10 }}>
        Verification Preview
      </div>
      <div
        style={{
          background: verificationSummary.bg,
          borderRadius: 14,
          border: `1px solid ${verificationSummary.color}33`,
          padding: '12px 14px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: verificationSummary.color }}>
          {verificationSummary.title}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
          {verificationSummary.detail}
        </div>
        {verificationPreview.idImageUrl ? (
          <a
            href={verificationPreview.idImageUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              marginTop: 8,
              textDecoration: 'none',
              color: '#1E3A8A',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            View latest uploaded ID
          </a>
        ) : null}
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 10 }}>
        Account Information
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #F1F5F9',
          marginBottom: 16,
        }}
      >
        {[
          { icon: <User size={16} />, label: 'Personal Information', sub: fullName, action: 'personal' as const },
          { icon: <Bell size={16} />, label: 'Notifications', sub: 'Alerts, updates, advisories', action: 'notifications' as const },
          { icon: <Shield size={16} />, label: 'Verification Status', sub: verificationSummary.statusLabel, action: 'verification' as const },
          { icon: <MapPin size={16} />, label: 'Home Barangay', sub: barangayLabel, action: 'barangay' as const },
          { icon: <Phone size={16} />, label: 'Contact Number', sub: phoneNumber, action: 'contact' as const },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              cursor: 'default',
              textAlign: 'left',
              background: '#fff',
              borderBottom: idx < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#EFF6FF',
                color: '#1E3A8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '10px 12px',
          marginBottom: 14,
          color: '#475569',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Your profile details are tied to your registered and verified account. For account corrections, contact your barangay administrator.
      </div>

      {!session?.user.isPhoneVerified ? (
        <button
          onClick={() => navigate('/auth/register')}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: '1.5px solid #BFDBFE',
            background: '#EFF6FF',
            color: '#1E3A8A',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          Verify Phone Number
        </button>
      ) : null}

      {!verificationPreview.isVerified && !verificationPreview.isBanned ? (
        <button
          onClick={() => navigate('/citizen/verification')}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: '1.5px solid #BFDBFE',
            background: '#EFF6FF',
            color: '#1E3A8A',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 12,
          }}
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
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          border: '1.5px solid #FEE2E2',
          background: '#FFF5F5',
          color: '#B91C1C',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

