import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';
import { officialReportsApi, type ApiCrossBorderAlert } from '../services/officialReportsApi';
import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';
import { BottomNav, type BottomNavItem } from './BottomNav';

const NAV_ITEMS = [
  { path: '/app',            label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/app/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { path: '/app/map',        label: 'Map',        icon: Map },
  { path: '/app/analytics',  label: 'Analytics',  icon: BarChart2 },
  { path: '/app/reports',    label: 'Reports',    icon: FileText },
  { path: '/app/verifications', label: 'Verifications', icon: UserCheck },
];

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { key: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home',      path: '/app',            exact: true },
  { key: 'incidents', icon: <AlertTriangle size={20} />,   label: 'Incidents',  path: '/app/incidents' },
  { key: 'map',       icon: <Map size={20} />,             label: 'Map',        path: '/app/map' },
  { key: 'reports',   icon: <FileText size={20} />,        label: 'Reports',    path: '/app/reports' },
  { key: 'settings',  icon: <Settings size={20} />,        label: 'Settings',   path: '/app/settings' },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
    </span>
  );
}

function Layout() {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiCrossBorderAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const roleHomePath = resolveDefaultAppPath(session);
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
    setProfileMenuOpen(false);
    navigate('/auth/login', { replace: true });
  };

  useEffect(() => {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (profileMenuOpen) setProfileMenuOpen(false);
      if (notificationsOpen) setNotificationsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [notificationsOpen, profileMenuOpen]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (active) setNotificationsLoading(true);
      try {
        const payload = await officialReportsApi.getAlerts();
        if (!active) return;
        setNotifications(payload.alerts);
        setUnreadCount(payload.alerts.filter((alert) => !alert.readAt).length);
      } catch {
        if (active) {
          setUnreadCount(0);
          setNotifications([]);
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    void loadNotifications();
    const timer = window.setInterval(() => { void loadNotifications(); }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const handleNotificationClick = async (item: ApiCrossBorderAlert) => {
    if (!item.readAt) {
      try {
        await officialReportsApi.markAlertRead(item.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
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
    if (unreadCount <= 0) return;
    const pending = notifications.filter((item) => !item.readAt);
    if (pending.length === 0) { setUnreadCount(0); return; }
    try {
      await Promise.all(pending.map((item) => officialReportsApi.markAlertRead(item.id)));
      const nowIso = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })),
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

  const closeOverlays = () => {
    if (profileMenuOpen) setProfileMenuOpen(false);
    if (notificationsOpen) setNotificationsOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-60 flex-col shrink-0 relative z-10 bg-primary">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="inline-flex mb-2">
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              className="w-[166px] max-w-full h-auto"
            />
          </NavLink>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase px-2 mb-1">
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg no-underline mb-0.5 border-l-[3px] transition-colors duration-150 ${
                  active ? 'border-white/50 bg-white/[0.14]' : 'border-transparent hover:bg-white/[0.08]'
                }`}
              >
                <item.icon size={17} className={active ? 'text-white' : 'text-blue-300'} />
                <span className={`text-[13px] flex-1 ${active ? 'font-semibold text-white' : 'text-blue-200'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase px-2 mb-1">
              System
            </div>
            <NavLink
              to="/app/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg no-underline mb-0.5 border-l-[3px] transition-colors duration-150 ${
                settingsActive ? 'border-white/50 bg-white/[0.14]' : 'border-transparent hover:bg-white/[0.08]'
              }`}
            >
              <Settings size={16} className={settingsActive ? 'text-white' : 'text-blue-300'} />
              <span className={`text-[13px] ${settingsActive ? 'font-semibold text-white' : 'text-blue-200'}`}>Settings</span>
            </NavLink>
          </div>
        </nav>

        {/* User profile */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/15">
          <div className="flex items-center gap-2.5">
            <div className="size-[34px] rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] flex items-center justify-center shrink-0 font-bold text-white text-[13px]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{userFullName}</div>
              <div className="text-blue-300 text-[10px]">{userRoleLabel}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="border-none bg-transparent p-0 cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <LogOut size={15} className="text-blue-300" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header
          className={`bg-primary px-4 h-14 flex items-center gap-3 shrink-0 border-b border-white/10 shadow-[0_2px_8px_rgba(30,58,138,0.3)] relative ${
            isMapRoute ? 'z-[2500]' : 'z-[90]'
          }`}
        >
          {/* Mobile logo */}
          <div className="flex items-center lg:hidden">
            <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="inline-flex">
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="w-[124px] max-w-full h-auto"
              />
            </NavLink>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden lg:block flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300 text-xs">TUGON</span>
              <ChevronRight size={12} className="text-blue-300" />
              <span className="text-white text-[13px] font-semibold">{currentPage?.label}</span>
            </div>
          </div>

          {/* Mobile page label */}
          <div className="flex flex-1 min-w-0 items-center lg:hidden">
            <span className="text-white text-[17px] font-bold leading-[56px]">
              {currentPage?.label}
            </span>
          </div>

          {/* Right area */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Date / Time — desktop only */}
            <div className="hidden lg:block text-right">
              <div className="text-white text-[13px] font-semibold"><LiveClock /></div>
              <div className="text-blue-300 text-[10px]">
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
              }}
              onMarkAllRead={() => { void handleMarkAllRead(); }}
              onItemClick={(item) => {
                const target = notifications.find((entry) => entry.id === item.id);
                if (target) { void handleNotificationClick(target); }
              }}
            />

            {/* User avatar — desktop only */}
            <div className="hidden lg:block relative z-[2200]">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-label="Open profile actions"
                aria-haspopup="menu"
                className="size-9 rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] flex items-center justify-center font-bold text-white text-xs cursor-pointer shrink-0 border-none"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  className="absolute top-11 right-0 w-[190px] bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-[2300] divide-y divide-slate-100"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/app/settings'); }}
                    className="w-full text-left px-3 py-[11px] bg-white border-none text-slate-800 text-[13px] font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    Open profile page
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full text-left px-3 py-[11px] bg-white border-none text-destructive text-[13px] font-bold cursor-pointer hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto pb-16 lg:pb-0"
          onClick={closeOverlays}
          onScroll={closeOverlays}
        >
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <BottomNav items={BOTTOM_NAV_ITEMS} />
      </div>
    </div>
  );
}

export { Layout };
export default Layout;
