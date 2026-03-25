import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  BarChart2,
  FileText,
  UserCheck,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import { officialReportsApi, type ApiCrossBorderAlert } from '../services/officialReportsApi';
import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';

const NAV_ITEMS = [
  { path: '/app',            label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/app/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { path: '/app/map',        label: 'Map',        icon: Map },
  { path: '/app/analytics',  label: 'Analytics',  icon: BarChart2 },
  { path: '/app/reports',    label: 'Reports',    icon: FileText },
  { path: '/app/verifications', label: 'Verifications', icon: UserCheck },
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

function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiCrossBorderAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const userFullName = session?.user.fullName?.trim() || 'Barangay Official';
  const userInitials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'BO';
  const userRoleLabel = session?.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Barangay Official';

  const currentPage = NAV_ITEMS.find(n =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path) && n.path !== '/app'
  ) || NAV_ITEMS[0];
  const settingsActive = location.pathname === '/app/settings' || location.pathname.startsWith('/app/settings/');
  const isMapRoute = location.pathname === '/app/map' || location.pathname.startsWith('/app/map/');

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

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (active) {
        setNotificationsLoading(true);
      }

      try {
        const payload = await officialReportsApi.getAlerts();
        if (!active) {
          return;
        }
        setNotifications(payload.alerts);
        setUnreadCount(payload.alerts.filter((alert) => !alert.readAt).length);
      } catch {
        if (active) {
          setUnreadCount(0);
          setNotifications([]);
        }
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const handleNotificationClick = async (item: ApiCrossBorderAlert) => {
    if (!item.readAt) {
      try {
        await officialReportsApi.markAlertRead(item.id);
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
    navigate('/app/incidents', { state: { focusReportId: item.reportId } });
  };

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0) {
      return;
    }

    const pending = notifications.filter((item) => !item.readAt);
    if (pending.length === 0) {
      setUnreadCount(0);
      return;
    }

    try {
      await Promise.all(pending.map((item) => officialReportsApi.markAlertRead(item.id)));
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
    title: `${item.report.category} incident nearby`,
    message: item.alertReason || `Cross-border update for ${item.report.location}`,
    createdAt: item.createdAt,
    readAt: item.readAt,
  }));

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 240, background: '#1E3A8A', display: 'flex',
          flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink
            to="/app"
            aria-label="Go to TUGON dashboard"
            style={{ display: 'inline-flex', marginBottom: 8 }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ width: 166, maxWidth: '100%', height: 'auto' }}
            />
          </NavLink>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/app';
            const exactActive = location.pathname === '/app';
            const active = item.exact ? exactActive : isActive;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderLeft: '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={17} color={active ? '#BFDBFE' : '#93C5FD'} />
                <span style={{ color: active ? '#DBEAFE' : '#BFDBFE', fontSize: 13, fontWeight: 400, flex: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              System
            </div>
            <NavLink
              to="/app/settings"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 2, borderLeft: '3px solid transparent',
                background: settingsActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!settingsActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = settingsActive ? 'rgba(255,255,255,0.06)' : 'transparent';
              }}
            >
              <Settings size={16} color="#93C5FD" />
              <span style={{ color: settingsActive ? '#DBEAFE' : '#BFDBFE', fontSize: 13 }}>Settings</span>
            </NavLink>
          </div>
        </nav>

        {/* User profile */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontWeight: 700, color: 'white', fontSize: 13,
            }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userFullName}</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>{userRoleLabel}</div>
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

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        <div ref={mobileHeaderRef} style={{ position: 'relative', zIndex: isMapRoute ? 2500 : 90 }}>
        {/* Header */}
        <header style={{
          background: '#1E3A8A', padding: '0 16px', height: 56,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center' }}>
            <NavLink
              to="/app"
              aria-label="Go to TUGON dashboard"
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
          <div className="header-breadcrumb" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#93C5FD', fontSize: 12 }}>TUGON</span>
              <ChevronRight size={12} color="#93C5FD" />
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{currentPage?.label}</span>
            </div>
          </div>

          {/* Mobile page label */}
          <div className="mobile-page-label" style={{ display: 'none', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, lineHeight: '56px', display: 'block' }}>
              {currentPage?.label}
            </span>
          </div>

          {/* Right area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Date / Time — desktop only */}
            <div className="header-datetime" style={{ textAlign: 'right' }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}><LiveClock /></div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Alert bell */}
            <AdminNotifications
              open={notificationsOpen}
              loading={notificationsLoading}
              unreadCount={unreadCount}
              items={notificationItems}
              panelLabel="Official notifications"
              panelTop={44}
              panelRight={0}
              panelZIndex={2200}
              onToggle={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
                setDrawerOpen(false);
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

            {/* Mobile hamburger — on the right of the bell */}
            <button
              type="button"
              onClick={() => {
                setDrawerOpen((prev) => !prev);
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
              aria-controls="layout-mobile-nav"
              className={drawerOpen ? 'mobile-menu-btn icon-btn-square is-open' : 'mobile-menu-btn icon-btn-square'}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'none',
              }}
            >
              <span className={drawerOpen ? 'mobile-menu-icon is-open' : 'mobile-menu-icon'}>
                {drawerOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
              </span>
            </button>

            {/* User avatar */}
            <div className="header-avatar-wrap" style={{ position: 'relative', zIndex: 2200 }}>
              <button
                type="button"
                className="header-avatar"
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
                    width: 190,
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
                      navigate('/app/settings');
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
              ) : null}
            </div>
          </div>
        </header>

        <div
          id="layout-mobile-nav"
          className={drawerOpen ? 'mobile-dropdown-panel is-open' : 'mobile-dropdown-panel'}
          aria-hidden={!drawerOpen}
          style={{
            background: 'rgba(30,58,138,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            padding: drawerOpen ? '12px 14px 16px' : '0 14px',
            maxHeight: drawerOpen ? 420 : 0,
            opacity: drawerOpen ? 1 : 0,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: drawerOpen ? 'auto' : 'none',
            overflow: 'hidden',
            transition: 'max-height 320ms cubic-bezier(0.2, 0.65, 0.3, 1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
          }}
        >
          <div
            className={drawerOpen ? 'mobile-dropdown-item is-open' : 'mobile-dropdown-item'}
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
              <div style={{ color: '#BFDBFE', fontSize: 10 }}>{userRoleLabel}</div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/app';
            const exactActive = location.pathname === '/app';
            const isActive = item.exact ? exactActive : active;

            return (
              <NavLink
                key={`mobile-dropdown-${item.path}`}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={drawerOpen ? 'mobile-dropdown-item is-open' : 'mobile-dropdown-item'}
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

          <NavLink
            to="/app/settings"
            onClick={() => setDrawerOpen(false)}
            className={drawerOpen ? 'mobile-dropdown-item is-open' : 'mobile-dropdown-item'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              padding: '11px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              color: '#BFDBFE',
              fontSize: 14,
              fontWeight: 500,
              opacity: drawerOpen ? 1 : 0,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            <Settings size={16} color="#93C5FD" />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={handleSignOut}
            className={drawerOpen ? 'mobile-dropdown-item is-open' : 'mobile-dropdown-item'}
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

        {/* Page content */}
        <main
          className="page-content"
          style={{ flex: 1, overflowY: 'auto' }}
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
        .mobile-menu-btn { display: none !important; }

        .mobile-menu-icon {
          display: inline-flex;
          transition: transform 180ms ease;
        }

        .mobile-menu-icon.is-open {
          transform: rotate(90deg);
        }

        a:focus-visible,
        button:focus-visible {
          outline: 3px solid #FCD34D;
          outline-offset: 2px;
        }

        @media (max-width: 1024px) {
          .sidebar-desktop    { display: none !important; }
          .mobile-menu-btn    { display: flex !important; }
          .mobile-menu-btn.is-open {
            transform: scale(0.97);
            background: rgba(255,255,255,0.2) !important;
          }
          .mobile-logo        { display: flex !important; }
          .header-breadcrumb  { display: none !important; }
          .header-datetime    { display: none !important; }
          .header-avatar      { display: none !important; }
          .header-avatar-wrap { display: none !important; }
          .mobile-page-label  { display: flex !important; align-items: center !important; }
          .page-content       { padding-bottom: 0 !important; }

          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(1) { transition-delay: 40ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(2) { transition-delay: 80ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(3) { transition-delay: 120ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(4) { transition-delay: 160ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(5) { transition-delay: 200ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(6) { transition-delay: 240ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(7) { transition-delay: 280ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(8) { transition-delay: 320ms; }
          .mobile-dropdown-panel .mobile-dropdown-item:nth-child(9) { transition-delay: 360ms; }
        }

        @media (min-width: 1025px) {
          .mobile-page-label  { display: none !important; }
          .mobile-dropdown-panel { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-icon,
          .mobile-dropdown-panel,
          .mobile-dropdown-item,
          .mobile-menu-btn {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export { Layout };
export default Layout;
