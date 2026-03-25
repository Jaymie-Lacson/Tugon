import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { superAdminApi, type ApiAdminNotification } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';
import { AdminNotifications, type AdminNotificationItem } from '../../components/AdminNotifications';

const NAV_ITEMS = [
  { path: '/superadmin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/superadmin/map', label: 'Barangay Map', icon: Map },
  { path: '/superadmin/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/superadmin/users', label: 'Users', icon: Users },
  { path: '/superadmin/audit-logs', label: 'Audit Logs', icon: Activity },
  { path: '/superadmin/settings', label: 'Settings', icon: Settings },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
    </span>
  );
}

const SIDEBAR_BG = '#1E3A8A';

type MonitoringItem = {
  code: string;
  name: string;
  incidents: number;
  color: string;
};

function getMonitoringColor(incidents: number): string {
  if (incidents >= 10) {
    return '#B91C1C';
  }
  if (incidents >= 5) {
    return '#F59E0B';
  }
  return '#22C55E';
}

export default function SuperAdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [monitoringItems, setMonitoringItems] = useState<MonitoringItem[]>([
    { code: '251', name: 'Brgy 251', incidents: 0, color: '#22C55E' },
    { code: '252', name: 'Brgy 252', incidents: 0, color: '#22C55E' },
    { code: '256', name: 'Brgy 256', incidents: 0, color: '#22C55E' },
  ]);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const userFullName = session?.user.fullName?.trim() || 'Super Admin';
  const userInitials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'SA';

  useEffect(() => {
    let mounted = true;

    const loadMonitoring = async () => {
      try {
        const payload = await superAdminApi.getBarangays();
        if (!mounted) {
          return;
        }

        const next = payload.barangays
          .filter((barangay) => ['251', '252', '256'].includes(barangay.code))
          .sort((a, b) => Number(a.code) - Number(b.code))
          .map((barangay) => ({
            code: barangay.code,
            name: `Brgy ${barangay.code}`,
            incidents: barangay.activeReports,
            color: getMonitoringColor(barangay.activeReports),
          }));

        if (next.length > 0) {
          setMonitoringItems(next);
        }
      } catch {
        // Keep zeroed fallback values if monitoring fetch fails.
      }
    };

    void loadMonitoring();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (mounted) {
        setNotificationsLoading(true);
      }

      try {
        const payload = await superAdminApi.getNotifications({ limit: 15 });
        if (!mounted) {
          return;
        }

        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount);
      } catch {
        if (!mounted) {
          return;
        }
      } finally {
        if (mounted) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
  ) || NAV_ITEMS[0];

  const handleSignOut = () => {
    clearAuthSession();
    setDrawerOpen(false);
    setProfileMenuOpen(false);
    navigate('/auth/login', { replace: true });
  };

  useEffect(() => {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (profileMenuOpen) {
        setProfileMenuOpen(false);
      }

      if (notificationsOpen) {
        setNotificationsOpen(false);
      }

      if (drawerOpen) {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, notificationsOpen, profileMenuOpen]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const closeMenuOnScroll = () => {
      setDrawerOpen(false);
    };

    const closeMenuOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && mobileHeaderRef.current?.contains(target)) {
        return;
      }
      setDrawerOpen(false);
    };

    window.addEventListener('scroll', closeMenuOnScroll, { passive: true });
    window.addEventListener('pointerdown', closeMenuOnOutsideTap, true);

    return () => {
      window.removeEventListener('scroll', closeMenuOnScroll);
      window.removeEventListener('pointerdown', closeMenuOnOutsideTap, true);
    };
  }, [drawerOpen]);

  const handleNotificationClick = async (item: ApiAdminNotification) => {
    if (!item.readAt) {
      try {
        await superAdminApi.markNotificationRead(item.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  readAt: new Date().toISOString(),
                }
              : entry,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Keep UI usable even if mark-read fails.
      }
    }

    setNotificationsOpen(false);
    if (item.reportId) {
      navigate('/superadmin', { state: { focusReportId: item.reportId } });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0) {
      return;
    }

    try {
      await superAdminApi.markAllNotificationsRead();
      const nowIso = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? nowIso,
        })),
      );
      setUnreadCount(0);
    } catch {
      // Keep menu open; next poll can recover latest state.
    }
  };

  const notificationItems: AdminNotificationItem[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    readAt: item.readAt,
  }));

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Desktop Sidebar */}
      <aside
        className="sa-sidebar-desktop"
        style={{
          width: 248,
          background: SIDEBAR_BG,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10,
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink
            to="/superadmin"
            onClick={() => setDrawerOpen(false)}
            aria-label="Go to TUGON super admin overview"
            style={{ display: 'inline-flex' }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ width: 166, maxWidth: '100%', height: 'auto' }}
            />
          </NavLink>
        </div>

        {/* Barangay quick status */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Monitoring</div>
          {monitoringItems.map((b) => (
            <div key={b.code} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 6px', borderRadius: 5, marginBottom: 2,
              background: 'rgba(255,255,255,0.05)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 5px ${b.color}` }} />
              <span style={{ color: '#BFDBFE', fontSize: 11, flex: 1 }}>{b.name}</span>
              <span style={{
                background: `${b.color}22`, color: b.color,
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              }}>{b.incidents} active</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && !item.exact;
            const exactActive = location.pathname === '/superadmin';
            const isActive = item.exact ? exactActive : active;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderLeft: '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={16} color={isActive ? '#BFDBFE' : '#93C5FD'} />
                <span style={{ color: isActive ? '#DBEAFE' : '#BFDBFE', fontSize: 13, fontWeight: 400, flex: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

        </nav>

        {/* User profile */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontWeight: 700, color: 'white', fontSize: 13,
            }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userFullName}
              </div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>Super Admin</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LogOut size={15} color="#93C5FD" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div ref={mobileHeaderRef} style={{ position: 'relative', zIndex: 2600 }}>
        {/* Header */}
        <header style={{
          background: SIDEBAR_BG,
          padding: '0 20px', height: 56,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
          position: 'relative',
          zIndex: 2600,
        }}>
          <div className="sa-mobile-logo" style={{ display: 'none', alignItems: 'center' }}>
            <NavLink
              to="/superadmin"
              onClick={() => setDrawerOpen(false)}
              aria-label="Go to TUGON super admin overview"
              style={{ display: 'inline-flex' }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ width: 124, maxWidth: '100%', height: 'auto' }}
              />
            </NavLink>
          </div>

          {/* Desktop breadcrumb */}
          <div className="sa-header-breadcrumb" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4, padding: '1px 7px',
                color: '#BFDBFE', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                SUPER ADMIN
              </span>
              <ChevronRight size={12} color="#93C5FD" />
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{currentPage?.label}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 10 }}>
              Tondo Tri-Barangay Super Admin Console
            </div>
          </div>

          {/* Mobile page label */}
          <div className="sa-mobile-page-label" style={{ display: 'none', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, lineHeight: '56px', display: 'block' }}>
              {currentPage?.label}
            </span>
          </div>

          {/* Right */}
          <div className="sa-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <div className="sa-header-datetime" style={{ textAlign: 'right' }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}><LiveClock /></div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Alerts */}
            <AdminNotifications
              open={notificationsOpen}
              loading={notificationsLoading}
              unreadCount={unreadCount}
              items={notificationItems}
              panelLabel="Super admin notifications"
              panelTop={44}
              panelRight={0}
              panelZIndex={2300}
              onToggle={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              onMarkAllRead={() => {
                void handleMarkAllRead();
              }}
              onItemClick={(item) => {
                const target = notifications.find((entry) => entry.id === item.id);
                if (target) {
                  void handleNotificationClick(target);
                }
              }}
            />

            <button
              type="button"
              onClick={() => {
                setDrawerOpen((prev) => !prev);
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
              aria-controls="superadmin-mobile-nav"
              className={drawerOpen ? 'sa-mobile-menu-btn icon-btn-square is-open' : 'sa-mobile-menu-btn icon-btn-square'}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'none',
              }}
            >
              <span className={drawerOpen ? 'sa-mobile-menu-icon is-open' : 'sa-mobile-menu-icon'}>
                {drawerOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
              </span>
            </button>

            <div className="sa-header-avatar-wrap" style={{ position: 'relative', zIndex: 2200 }}>
              <button
                type="button"
                className="sa-header-avatar"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setDrawerOpen(false);
                  setNotificationsOpen(false);
                }}
                aria-label="Open profile actions"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                }}
              >
                {userInitials}
              </button>

              {profileMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    width: 200,
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    zIndex: 2300,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/superadmin/settings');
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
                    Open settings
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
              ) : null}
            </div>
          </div>
        </header>

        <div
          id="superadmin-mobile-nav"
          className={drawerOpen ? 'sa-mobile-dropdown-panel is-open' : 'sa-mobile-dropdown-panel'}
          aria-hidden={!drawerOpen}
          style={{
            background: 'rgba(30,58,138,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            padding: drawerOpen ? '12px 14px 16px' : '0 14px',
            maxHeight: drawerOpen ? 450 : 0,
            opacity: drawerOpen ? 1 : 0,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: drawerOpen ? 'auto' : 'none',
            overflow: 'hidden',
            transition: 'max-height 320ms cubic-bezier(0.2, 0.65, 0.3, 1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
          }}
        >
          <div
            className={drawerOpen ? 'sa-mobile-dropdown-item is-open' : 'sa-mobile-dropdown-item'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
              opacity: drawerOpen ? 1 : 0,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #B4730A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 11, flexShrink: 0 }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userFullName}</div>
              <div style={{ color: '#BFDBFE', fontSize: 10 }}>Super Admin</div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && !item.exact;
            const exactActive = location.pathname === '/superadmin';
            const isActive = item.exact ? exactActive : active;

            return (
              <NavLink
                key={`sa-mobile-dropdown-${item.path}`}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={drawerOpen ? 'sa-mobile-dropdown-item is-open' : 'sa-mobile-dropdown-item'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textDecoration: 'none',
                  padding: '11px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  color: isActive ? '#DBEAFE' : '#BFDBFE',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  opacity: drawerOpen ? 1 : 0,
                  transform: drawerOpen ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                }}
              >
                <item.icon size={16} color={isActive ? '#DBEAFE' : '#93C5FD'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={handleSignOut}
            className={drawerOpen ? 'sa-mobile-dropdown-item is-open' : 'sa-mobile-dropdown-item'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              padding: '11px 0 4px',
              background: 'none',
              border: 'none',
              color: '#FCA5A5',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              opacity: drawerOpen ? 1 : 0,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            <LogOut size={16} color="#FCA5A5" />
            <span>Sign out</span>
          </button>
        </div>
        </div>

        <main
          style={{ flex: 1, overflowY: 'auto', paddingBottom: 0 }}
          onClick={() => {
            if (profileMenuOpen) {
              setProfileMenuOpen(false);
            }
            if (notificationsOpen) {
              setNotificationsOpen(false);
            }
          }}
          onScroll={() => {
            if (profileMenuOpen) {
              setProfileMenuOpen(false);
            }
            if (notificationsOpen) {
              setNotificationsOpen(false);
            }
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        .sa-mobile-menu-icon {
          display: inline-flex;
          transition: transform 180ms ease;
        }

        .sa-mobile-menu-icon.is-open {
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .sa-sidebar-desktop   { display: none !important; }
          .sa-mobile-menu-btn   { display: flex !important; }
          .sa-mobile-menu-btn.is-open {
            transform: scale(0.97);
            background: rgba(255,255,255,0.2) !important;
          }
          .sa-mobile-logo       { display: flex !important; }
          .sa-header-actions    { margin-left: auto !important; }
          .sa-header-breadcrumb { display: none !important; }
          .sa-header-datetime   { display: none !important; }
          .sa-header-avatar     { display: none !important; }
          .sa-header-avatar-wrap { display: none !important; }
          .sa-mobile-page-label { display: none !important; }

          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(1) { transition-delay: 40ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(2) { transition-delay: 80ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(3) { transition-delay: 120ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(4) { transition-delay: 160ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(5) { transition-delay: 200ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(6) { transition-delay: 240ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(7) { transition-delay: 280ms; }
          .sa-mobile-dropdown-panel .sa-mobile-dropdown-item:nth-child(8) { transition-delay: 320ms; }
        }
        @media (min-width: 769px) {
          .sa-mobile-menu-btn { display: none !important; }
          .sa-mobile-page-label { display: none !important; }
          .sa-mobile-dropdown-panel { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sa-mobile-menu-icon,
          .sa-mobile-dropdown-panel,
          .sa-mobile-dropdown-item,
          .sa-mobile-menu-btn {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}