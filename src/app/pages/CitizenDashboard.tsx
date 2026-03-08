import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, Bell, Home, MapPin, FileText, User, Plus,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
  Flame, Droplets, Car, Activity, Zap, AlertCircle,
  Phone, Info, CloudRain, Eye, Search, Filter,
  ArrowRight, TrendingUp, Map,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { IncidentMap } from '../components/IncidentMap';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import {
  incidents,
  incidentTypeConfig,
  Incident,
  IncidentType,
} from '../data/incidents';

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const activeIncidents = incidents.filter(
  (i) => i.status === 'active' || i.status === 'responding',
);
const criticalCount = activeIncidents.filter((i) => i.severity === 'critical').length;

const MY_REPORTS = [
  {
    id: 'MY-2026-003',
    type: 'infrastructure' as IncidentType,
    description: 'Broken street light near Purok 4 entrance',
    status: 'responding' as const,
    reportedAt: '2026-03-06T07:15:00',
    location: 'Purok 4, Brgy. San Antonio',
  },
  {
    id: 'MY-2026-002',
    type: 'flood' as IncidentType,
    description: 'Flooded drainage causing road block',
    status: 'resolved' as const,
    reportedAt: '2026-03-05T14:30:00',
    location: 'Main Road, Brgy. Poblacion',
  },
  {
    id: 'MY-2026-001',
    type: 'accident' as IncidentType,
    description: 'Minor vehicular accident at intersection',
    status: 'resolved' as const,
    reportedAt: '2026-03-04T09:00:00',
    location: 'Junction Ave., District II',
  },
];

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
function AlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || criticalCount === 0) return null;
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #B91C1C 0%, #991B1B 100%)',
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
          borderRadius: '50%',
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
          {criticalCount} Critical Incident{criticalCount > 1 ? 's' : ''}
        </span>{' '}
        active in your municipality. Stay alert.
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
        flex: 1,
        minWidth: 0,
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
        background: featured
          ? `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`
          : '#fff',
        border: featured ? 'none' : `1.5px solid #E2E8F0`,
        borderRadius: 16,
        padding: '18px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        boxShadow: featured
          ? `0 6px 20px ${accent}44`
          : '0 1px 4px rgba(0,0,0,0.07)',
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

function RecentIncidentRow({ incident }: { incident: Incident }) {
  const cfg = incidentTypeConfig[incident.type];
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
        {typeIcon[incident.type]}
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
          {cfg.label} - {incident.barangay}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
          {timeAgo(incident.reportedAt)} - {incident.location}
        </div>
      </div>
      <StatusBadge status={incident.status} size="sm" pulse />
    </div>
  );
}

function MyReportRow({
  report,
}: {
  report: (typeof MY_REPORTS)[number];
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

/* â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const navItems: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'home', icon: <Home size={22} />, label: 'Home' },
    { key: 'report', icon: <Plus size={22} />, label: 'Report' },
    { key: 'map', icon: <Map size={22} />, label: 'Map' },
    { key: 'myreports', icon: <FileText size={22} />, label: 'My Reports' },
    { key: 'profile', icon: <User size={22} />, label: 'Profile' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab setActiveTab={setActiveTab} selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} />;
      case 'report':
        return null;
      case 'map':
        return <MapTab selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} />;
      case 'myreports':
        navigate('/citizen/my-reports');
        return null;
      case 'profile':
        return <ProfileTab />;
    }
  };

  return (
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
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 2px 12px rgba(30,58,138,0.4)',
          }}
        >
          <div
            className="citizen-web-header-inner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 16px',
              height: '100%',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                }}
              >
                <Shield size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 16, lineHeight: 1.1, letterSpacing: '0.03em' }}>
                  TUGON
                </div>
                <div style={{ color: '#BFDBFE', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Citizen Portal
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  position: 'relative',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <Bell size={18} />
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#B91C1C',
                    border: '1.5px solid #1E3A8A',
                  }}
                />
              </button>
              <div
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
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab('profile')}
              >
                JD
              </div>
            </div>

            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 66,
                  right: 16,
                  width: 300,
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  zIndex: 100,
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 14 }}>Notifications</span>
                  <span
                    style={{
                      background: '#B91C1C',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '1px 7px',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    3 New
                  </span>
                </div>
                {[
                  {
                    icon: <AlertTriangle size={14} />,
                    color: '#B91C1C',
                    bg: '#FEE2E2',
                    title: 'Critical Fire Alert',
                    desc: 'Active fire in Brgy. San Antonio',
                    time: '23m ago',
                  },
                  {
                    icon: <CheckCircle2 size={14} />,
                    color: '#059669',
                    bg: '#D1FAE5',
                    title: 'Report Updated',
                    desc: 'MY-2026-003 is now being responded to',
                    time: '1h ago',
                  },
                  {
                    icon: <Info size={14} />,
                    color: '#1E3A8A',
                    bg: '#DBEAFE',
                    title: 'Community Advisory',
                    desc: 'Flash flood warning in District I',
                    time: '2h ago',
                  },
                ].map((n, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none',
                      cursor: 'pointer',
                      background: i === 0 ? '#FFFBEB' : '#fff',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: n.bg,
                        color: n.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {n.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1E293B' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{n.desc}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>
      }
      beforeMain={
        <>
          <AlertBanner />
          <div
            className="citizen-only-desktop citizen-web-strip"
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 14,
              paddingBottom: 10,
              borderBottom: '1px solid #E2E8F0',
              background: 'rgba(255,255,255,0.86)',
              boxShadow: '0 1px 6px rgba(15,23,42,0.04)',
            }}
          >
            <div
              className="citizen-web-strip-inner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: 8,
                boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
              }}
            >
              {navItems.map((item) => {
                const isActionRoute = item.key === 'report' || item.key === 'myreports';
                const isActive = activeTab === item.key;

                return (
                  <button
                    key={`desktop-${item.key}`}
                    onClick={() => {
                      if (item.key === 'report') navigate('/citizen/report');
                      else if (item.key === 'myreports') navigate('/citizen/my-reports');
                      else setActiveTab(item.key);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isActive ? '#1E3A8A' : '#E2E8F0'}`,
                      background: isActive ? '#EFF6FF' : 'white',
                      color: isActive ? '#1E3A8A' : isActionRoute ? '#B91C1C' : '#334155',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      }
      afterMain={
        <nav
          className="citizen-only-mobile"
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 560,
            background: '#fff',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'stretch',
            height: 68,
            zIndex: 50,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {navItems.map((item) => {
            const isReport = item.key === 'report';
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (isReport) navigate('/citizen/report');
                  else if (item.key === 'myreports') navigate('/citizen/my-reports');
                  else setActiveTab(item.key);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isReport ? 0 : 3,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  position: 'relative',
                }}
              >
                {isReport ? (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(185,28,28,0.5)',
                      marginTop: -18,
                      border: '3px solid #fff',
                    }}
                  >
                    <Plus size={24} />
                  </div>
                ) : (
                  <div
                    style={{
                      color: isActive ? '#1E3A8A' : '#94A3B8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {item.icon}
                  </div>
                )}
                <span
                  style={{
                    fontSize: isReport ? 9 : 10,
                    fontWeight: isActive || isReport ? 700 : 500,
                    color: isReport ? '#B91C1C' : isActive ? '#1E3A8A' : '#94A3B8',
                    marginTop: isReport ? 2 : 0,
                  }}
                >
                  {item.label}
                </span>
                {isActive && !isReport && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 24,
                      height: 3,
                      borderRadius: '0 0 4px 4px',
                      background: '#1E3A8A',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      }
      mainOnClick={() => {
        if (notifOpen) {
          setNotifOpen(false);
        }
      }}
      mobileMainPaddingBottom={80}
      desktopMainPaddingBottom={24}
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
  setActiveTab,
  selectedIncident,
  setSelectedIncident,
}: {
  setActiveTab: (t: Tab) => void;
  selectedIncident: Incident | null;
  setSelectedIncident: (i: Incident | null) => void;
}) {
  const navigate = useNavigate();
  const recentActive = activeIncidents.slice(0, 3);

  return (
    <div style={{ padding: '0 0 8px' }}>
      {/* Welcome strip */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
          padding: '14px 16px 20px',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 13, color: '#BFDBFE', marginBottom: 2 }}>
          Good morning, Juan!
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 1 }}>
          Stay Safe, Stay Informed
        </div>
        <div style={{ fontSize: 11, color: '#93C5FD' }}>
          Brgy. San Antonio - District II - March 6, 2026
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ margin: '-14px 16px 0', display: 'flex', gap: 8 }}>
        <StatCard
          icon={<AlertTriangle size={16} />}
          value={activeIncidents.length}
          label="Active Incidents"
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
          value={MY_REPORTS.length}
          label="My Reports"
          accent="#1E3A8A"
        />
      </div>

      {/* Community Map */}
      <div style={{ margin: '20px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>
              Community Map
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                {activeIncidents.length} active incidents near you
              </span>
              <span style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '1px 6px', fontSize: 9, color: '#059669', fontWeight: 600 }}>
                OSM
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              background: '#EFF6FF',
              border: 'none',
              borderRadius: 8,
              padding: '5px 10px',
              color: '#1E3A8A',
              fontWeight: 600,
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Full Map <ArrowRight size={11} />
          </button>
        </div>

        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            border: '1.5px solid #E2E8F0',
          }}
        >
          <IncidentMap
            incidents={incidents}
            height={240}
            selectedId={selectedIncident?.id ?? null}
            onSelectIncident={setSelectedIncident}
            compact={false}
            zoom={14}
          />
        </div>

        {/* Selected incident detail chip */}
        {selectedIncident && (
          <div
            style={{
              marginTop: 8,
              background: '#fff',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 1px 6px rgba(0,0,0,0.09)',
              border: '1.5px solid #DBEAFE',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1E293B' }}>
                {selectedIncident.id}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedIncident.location}
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' }}>
                Pin: {selectedIncident.lat.toFixed(5)} deg N, {selectedIncident.lng.toFixed(5)} deg E
              </div>
            </div>
            <StatusBadge status={selectedIncident.status} size="sm" pulse />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B', marginBottom: 10 }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QuickActionCard
            icon={<Plus size={22} />}
            label="Submit Incident Report"
            sublabel="Report an emergency or concern"
            accent="#B91C1C"
            featured
            onClick={() => navigate('/citizen/report')}
          />
          <QuickActionCard
            icon={<FileText size={22} />}
            label="My Reports"
            sublabel="Track your submitted reports"
            accent="#1E3A8A"
            onClick={() => navigate('/citizen/my-reports')}
          />
          <QuickActionCard
            icon={<MapPin size={22} />}
            label="Community Map"
            sublabel="View incidents near you"
            accent="#059669"
            onClick={() => setActiveTab('map')}
          />
          <QuickActionCard
            icon={<User size={22} />}
            label="Profile Settings"
            sublabel="Manage your account"
            accent="#B4730A"
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </div>

      {/* Recent Incidents */}
      <div style={{ margin: '20px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>
            Active Near You
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#1E3A8A',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
            onClick={() => setActiveTab('map')}
          >
            See all <ChevronRight size={13} />
          </button>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '4px 14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            border: '1px solid #F1F5F9',
          }}
        >
          {recentActive.map((inc) => (
            <RecentIncidentRow key={inc.id} incident={inc} />
          ))}
          {recentActive.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>
              No active incidents nearby.
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B', marginBottom: 10 }}>
          Emergency Contacts
        </div>
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
                border: '1px solid #F1F5F9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
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
      </div>
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
            fontSize: 16,
          }}
        >
          MY-2026-004
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Redirecting you back shortly...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px' }}>
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
  selectedIncident,
  setSelectedIncident,
}: {
  selectedIncident: Incident | null;
  setSelectedIncident: (i: Incident | null) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const filtered =
    filter === 'all'
      ? incidents
      : filter === 'active'
      ? incidents.filter((i) => i.status !== 'resolved')
      : incidents.filter((i) => i.status === 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'clamp(500px, 70vh, 760px)' }}>
      {/* Filters */}
      <div
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', flex: 1 }}>
          Live Incident Map
        </div>
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: 'none',
              background: filter === f ? '#1E3A8A' : '#F1F5F9',
              color: filter === f ? '#fff' : '#64748B',
              fontWeight: 600,
              fontSize: 11,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <IncidentMap
          incidents={filtered}
          height="100%"
          selectedId={selectedIncident?.id ?? null}
          onSelectIncident={setSelectedIncident}
          compact={false}
          zoom={15}
        />
      </div>

      {/* Detail panel */}
      {selectedIncident && (
        <div
          style={{
            background: '#fff',
            borderTop: '1px solid #E2E8F0',
            padding: '14px 16px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <TypeBadge type={selectedIncident.type} size="sm" />
            <StatusBadge status={selectedIncident.status} size="sm" pulse />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 2 }}>
            {selectedIncident.id} - {selectedIncident.barangay}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
            {selectedIncident.description}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94A3B8' }}>
            <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {timeAgo(selectedIncident.reportedAt)}</span>
            <span><User size={10} style={{ verticalAlign: 'middle' }} /> {selectedIncident.responders} responders</span>
            {selectedIncident.affectedPersons !== undefined && (
              <span><AlertTriangle size={10} style={{ verticalAlign: 'middle' }} /> {selectedIncident.affectedPersons} affected</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MY REPORTS TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MyReportsTab() {
  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 18,
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>My Reports</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          You have submitted {MY_REPORTS.length} incident reports.
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {[
            { label: 'Submitted', value: MY_REPORTS.length, color: '#BFDBFE' },
            { label: 'Responding', value: MY_REPORTS.filter(r => r.status === 'responding').length, color: '#FDE68A' },
            { label: 'Resolved', value: MY_REPORTS.filter(r => r.status === 'resolved').length, color: '#A7F3D0' },
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
        {MY_REPORTS.map((report) => (
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
function ProfileTab() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '16px' }}>
      {/* Profile card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
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
            background: 'linear-gradient(135deg, #B4730A, #D97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            border: '3px solid rgba(255,255,255,0.3)',
          }}
        >
          JD
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Juan Dela Cruz</div>
          <div style={{ fontSize: 12, color: '#BFDBFE', marginTop: 2 }}>
            juan.delacruz@email.com
          </div>
          <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 4 }}>
            Brgy. San Antonio - District II
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
          <Shield size={12} /> Verified Citizen
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Reports Filed', value: '3', icon: <FileText size={16} />, accent: '#1E3A8A' },
          { label: 'Resolved', value: '2', icon: <CheckCircle2 size={16} />, accent: '#059669' },
          { label: 'Pending', value: '1', icon: <Clock size={16} />, accent: '#B4730A' },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} accent={s.accent} />
        ))}
      </div>

      {/* Settings list */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 10 }}>
        Account Settings
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
          { icon: <User size={16} />, label: 'Personal Information', sub: 'Name, address, contact' },
          { icon: <Bell size={16} />, label: 'Notifications', sub: 'Alerts, updates, advisories' },
          { icon: <Shield size={16} />, label: 'Privacy & Security', sub: 'Password, 2FA' },
          { icon: <MapPin size={16} />, label: 'Home Barangay', sub: 'Brgy. San Antonio' },
          { icon: <Phone size={16} />, label: 'Contact Numbers', sub: '+63 912 345 6789' },
        ].map((item, idx, arr) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              cursor: 'pointer',
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
            <ChevronRight size={16} color="#CBD5E1" />
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => navigate('/auth/login')}
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

