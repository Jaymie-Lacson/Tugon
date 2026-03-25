import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart2,
  Bell,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { superAdminApi, type ApiAdminNotification } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';

const NAV_ITEMS = [
  { path: '/superadmin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/superadmin/map', label: 'Barangay Map', icon: Map },
  { path: '/superadmin/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/superadmin/users', label: 'Users', icon: Users },
  { path: '/superadmin/audit-logs', label: 'Audit Logs', icon: Activity },
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

function formatNotificationTimestamp(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const elapsedMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsedMs < minute) {
    return 'Just now';
  }
  if (elapsedMs < hour) {
    return `${Math.floor(elapsedMs / minute)}m ago`;
  }
  if (elapsedMs < day) {
    return `${Math.floor(elapsedMs / hour)}h ago`;
  }

  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="sa-mobile-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'none' }}
        />
      )}

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
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Open notifications"
                title="Open notifications"
                className="icon-btn-square"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                style={{
                lineHeight: 0,
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}>
                <Bell size={18} color="white" />
                {unreadCount > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: '#B91C1C',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div
                  role="menu"
                  aria-label="Super admin notifications"
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    width: 320,
                    maxHeight: 360,
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                    border: '1px solid #E2E8F0',
                    zIndex: 2300,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderBottom: '1px solid #E2E8F0',
                    }}
                  >
                    <span style={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>Notifications</span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleMarkAllRead();
                      }}
                      disabled={unreadCount === 0}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: unreadCount === 0 ? '#94A3B8' : '#1E3A8A',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: unreadCount === 0 ? 'default' : 'pointer',
                      }}
                    >
                      Mark all read
                    </button>
                  </div>

                  {notificationsLoading ? (
                    <div style={{ padding: 12, color: '#64748B', fontSize: 12 }}>Loading notifications...</div>
                  ) : null}

                  {!notificationsLoading && notifications.length === 0 ? (
                    <div style={{ padding: 12, color: '#64748B', fontSize: 12 }}>No notifications yet.</div>
                  ) : null}

                  {!notificationsLoading
                    ? notifications.map((item) => {
                        const isUnread = !item.readAt;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              void handleNotificationClick(item);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 12px',
                              border: 'none',
                              borderBottom: '1px solid #F1F5F9',
                              background: isUnread ? '#EFF6FF' : '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ color: '#1E293B', fontSize: 12, fontWeight: 700, flex: 1 }}>{item.title}</span>
                              {isUnread ? (
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B91C1C', flexShrink: 0 }} />
                              ) : null}
                            </div>
                            <div style={{ color: '#334155', fontSize: 12, lineHeight: 1.35 }}>{item.message}</div>
                            <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>
                              {formatNotificationTimestamp(item.createdAt)}
                            </div>
                          </button>
                        );
                      })
                    : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(!drawerOpen);
                setProfileMenuOpen(false);
              }}
              aria-label={drawerOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              aria-expanded={drawerOpen}
              aria-controls="superadmin-mobile-drawer"
              className="sa-mobile-menu-btn icon-btn-square"
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'none',
              }}
            >
              <Menu size={20} color="white" />
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
                      navigate('/superadmin/users');
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
                    Open user management
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

      {/* Mobile right drawer */}
      {drawerOpen && (
        <div
          id="superadmin-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Super admin mobile navigation drawer"
          style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 280,
          background: SIDEBAR_BG, zIndex: 1400, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <NavLink
              to="/superadmin"
              onClick={() => setDrawerOpen(false)}
              aria-label="Go to TUGON super admin overview"
              style={{ display: 'inline-flex' }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ width: 148, maxWidth: '100%', height: 'auto' }}
              />
            </NavLink>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation drawer"
              className="icon-btn-square"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              <X size={18} color="white" />
            </button>
          </div>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #B4730A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>{userInitials}</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{userFullName}</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>Super Admin</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>
              Navigation
            </div>
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const exactActive = location.pathname === '/superadmin';
              const isActive = item.exact ? exactActive : active;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    marginBottom: 6,
                    background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                    border: isActive ? '1px solid rgba(191,219,254,0.65)' : '1px solid transparent',
                  }}
                >
                  <item.icon size={20} color={isActive ? '#DBEAFE' : '#93C5FD'} />
                  <span style={{ color: isActive ? '#DBEAFE' : '#BFDBFE', fontSize: 14, fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>
                More
              </div>
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(185,28,28,0.15)', border: 'none', width: '100%', cursor: 'pointer', minHeight: 48 }}
                >
                  <LogOut size={18} color="#FCA5A5" />
                  <span style={{ color: '#FCA5A5', fontSize: 14, fontWeight: 600 }}>Sign Out</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sa-sidebar-desktop   { display: none !important; }
          .sa-mobile-menu-btn   { display: flex !important; }
          .sa-mobile-logo       { display: flex !important; }
          .sa-header-actions    { margin-left: auto !important; }
          .sa-header-breadcrumb { display: none !important; }
          .sa-header-datetime   { display: none !important; }
          .sa-header-avatar     { display: none !important; }
          .sa-header-avatar-wrap { display: none !important; }
          .sa-mobile-page-label { display: none !important; }
          .sa-mobile-overlay    { display: block !important; }
        }
        @media (min-width: 769px) {
          .sa-mobile-menu-btn { display: none !important; }
          .sa-mobile-page-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}