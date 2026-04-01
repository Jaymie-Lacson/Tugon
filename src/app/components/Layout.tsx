import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router';
import {
  Menu,
  X,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';
import { officialReportsApi, type ApiCrossBorderAlert } from '../services/officialReportsApi';
import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';
import { BottomNav, type BottomNavItem } from './BottomNav';
import { useTranslation } from '../i18n';
import { officialBottomNavDefs, officialSidebarNavDefs } from '../data/navigationConfig';

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
  const { t } = useTranslation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiCrossBorderAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const roleHomePath = resolveDefaultAppPath(session);
  const userFullName = session?.user.fullName?.trim() || t('role.official');
  const userInitials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'BO';
  const userRoleLabel = session?.user.role === 'SUPER_ADMIN' ? t('role.superAdmin') : t('role.official');

  const NAV_ITEMS = officialSidebarNavDefs.map((item) => ({ ...item, label: t(item.labelKey) }));
  const BOTTOM_NAV_ITEMS: BottomNavItem[] = officialBottomNavDefs.map((item) => {
    const Icon = item.icon;
    return {
      key: item.key,
      icon: <Icon size={20} />,
      label: t(item.labelKey),
      path: item.path,
      exact: item.exact,
    };
  });

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
    setMobileDrawerOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileDrawerOpen) setMobileDrawerOpen(false);
      if (profileMenuOpen) setProfileMenuOpen(false);
      if (notificationsOpen) setNotificationsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen, notificationsOpen, profileMenuOpen]);

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

      {/* ── Desktop Sidebar — Stitch: surface-container-low + primary-container accents */}
      <aside className="hidden lg:flex w-60 flex-col shrink-0 relative z-10" style={{ background: '#eff4ff', borderRight: '1px solid rgba(197,197,211,0.2)' }}>
        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(197,197,211,0.25)' }}>
          <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="inline-flex mb-2">
            <img
              src="/tugon-header-logo-dark.svg"
              alt="TUGON Tondo Emergency Response"
              className="w-[166px] max-w-full h-auto"
              onError={(e) => { (e.target as HTMLImageElement).src = '/tugon-header-logo.svg'; }}
            />
          </NavLink>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-[10px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: '#757682' }}>
            {t('nav.navigation')}
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] no-underline mb-0.5 transition-all duration-150 ${
                  active
                    ? 'font-semibold'
                    : 'hover:bg-[#dce9ff]'
                }`}
                style={active ? { background: '#1e3a8a', color: '#ffffff' } : { color: '#444651' }}
              >
                <item.icon size={17} style={active ? { color: '#ffffff' } : { color: '#4059aa' }} />
                <span className={`text-[13px] flex-1`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(197,197,211,0.25)' }}>
            <div className="text-[10px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: '#757682' }}>
              {t('nav.system')}
            </div>
            <NavLink
              to="/app/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] no-underline mb-0.5 transition-all duration-150 ${
                settingsActive ? 'font-semibold' : 'hover:bg-[#dce9ff]'
              }`}
              style={settingsActive ? { background: '#1e3a8a', color: '#ffffff' } : { color: '#444651' }}
            >
              <Settings size={16} style={settingsActive ? { color: '#ffffff' } : { color: '#4059aa' }} />
              <span className={`text-[13px]`}>{t('common.settings')}</span>
            </NavLink>
          </div>
        </nav>

        {/* User profile — tonal strip */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(197,197,211,0.25)', background: '#eff4ff' }}>
          <div className="flex items-center gap-2.5">
            <div className="size-[34px] rounded-full bg-gradient-to-br from-[#865300] to-[#b4730a] flex items-center justify-center shrink-0 font-bold text-white text-[13px]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: '#0d1c2e' }}>{userFullName}</div>
              <div className="text-[10px]" style={{ color: '#757682' }}>{userRoleLabel}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label={t('common.signOut')}
              title={t('common.signOut')}
              className="border-none bg-transparent p-0 cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <LogOut size={15} style={{ color: '#757682' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-[3000] lg:hidden"
          aria-hidden={!mobileDrawerOpen}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <nav
            id="layout-mobile-drawer"
            role="navigation"
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 w-[270px] flex flex-col shadow-2xl"
            style={{ background: '#eff4ff' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(197,197,211,0.25)' }}>
              <img
                src="/tugon-header-logo-dark.svg"
                alt="TUGON Tondo Emergency Response"
                className="w-[140px] h-auto"
                onError={(e) => { (e.target as HTMLImageElement).src = '/tugon-header-logo.svg'; }}
              />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="flex size-8 items-center justify-center rounded-lg cursor-pointer border-none"
                style={{ background: '#dce9ff', color: '#00236f' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer nav items */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-[10px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: '#757682' }}>
                {t('nav.navigation')}
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
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] no-underline mb-0.5 transition-all duration-150 ${
                      active ? 'font-semibold' : 'hover:bg-[#dce9ff]'
                    }`}
                    style={active ? { background: '#1e3a8a', color: '#ffffff' } : { color: '#444651' }}
                  >
                    <item.icon size={17} style={active ? { color: '#ffffff' } : { color: '#4059aa' }} />
                    <span className={`text-[13px] flex-1`}>
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}

              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(197,197,211,0.25)' }}>
                <div className="text-[10px] font-bold tracking-widest uppercase px-2 mb-2" style={{ color: '#757682' }}>
                  {t('nav.system')}
                </div>
                <NavLink
                  to="/app/settings"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] no-underline mb-0.5 transition-all duration-150 ${
                    settingsActive ? 'font-semibold' : 'hover:bg-[#dce9ff]'
                  }`}
                  style={settingsActive ? { background: '#1e3a8a', color: '#ffffff' } : { color: '#444651' }}
                >
                  <Settings size={16} style={settingsActive ? { color: '#ffffff' } : { color: '#4059aa' }} />
                  <span className="text-[13px]">{t('common.settings')}</span>
                </NavLink>
              </div>
            </div>

            {/* Drawer user profile — tonal strip */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(197,197,211,0.25)', background: '#eff4ff' }}>
              <div className="flex items-center gap-2.5">
                <div className="size-[34px] rounded-full bg-gradient-to-br from-[#865300] to-[#b4730a] flex items-center justify-center shrink-0 font-bold text-white text-[13px]">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: '#0d1c2e' }}>{userFullName}</div>
                  <div className="text-[10px]" style={{ color: '#757682' }}>{userRoleLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label={t('common.signOut')}
                  className="border-none bg-transparent p-0 cursor-pointer inline-flex"
                >
                  <LogOut size={15} style={{ color: '#757682' }} />
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header — Stitch surface-container-lowest glass + primary-container breadcrumb text */}
        <header
          className={`px-4 h-14 flex items-center gap-3 shrink-0 relative ${
            isMapRoute ? 'z-[2500]' : 'z-[90]'
          }`}
          style={{
            background: 'rgba(248,249,255,0.92)',
            borderBottom: '1px solid rgba(197,197,211,0.3)',
            boxShadow: '0 1px 12px rgba(13,28,46,0.06)',
            backdropFilter: 'saturate(110%) blur(12px)',
            WebkitBackdropFilter: 'saturate(110%) blur(12px)',
          }}
        >
          {/* Mobile hamburger + logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-controls="layout-mobile-drawer"
              aria-expanded={mobileDrawerOpen}
              aria-label="Open navigation menu"
              onClick={() => {
                setMobileDrawerOpen((prev) => !prev);
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex size-9 items-center justify-center rounded-lg cursor-pointer border-none"
              style={{ background: '#dce9ff', color: '#00236f' }}
            >
              <Menu size={18} />
            </button>
            <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="inline-flex">
              <img
                src="/tugon-header-logo-dark.svg"
                alt="TUGON Tondo Emergency Response"
                className="w-[124px] max-w-full h-auto"
                onError={(e) => { (e.target as HTMLImageElement).src = '/tugon-header-logo.svg'; }}
              />
            </NavLink>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden lg:block flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium" style={{ color: '#757682' }}>TUGON</span>
              <ChevronRight size={12} style={{ color: '#c5c5d3' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#0d1c2e' }}>{currentPage?.label}</span>
            </div>
          </div>

          {/* Mobile page label */}
          <div className="flex flex-1 min-w-0 items-center lg:hidden">
            <span className="text-[17px] font-bold leading-[56px]" style={{ color: '#0d1c2e' }}>
              {currentPage?.label}
            </span>
          </div>

          {/* Right area */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Date / Time — desktop only */}
            <div className="hidden lg:block text-right">
              <div className="text-[13px] font-semibold" style={{ color: '#0d1c2e' }}><LiveClock /></div>
              <div className="text-[10px]" style={{ color: '#757682' }}>
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
                className="size-9 rounded-full bg-gradient-to-br from-[#865300] to-[#b4730a] flex items-center justify-center font-bold text-white text-xs cursor-pointer shrink-0 border-none"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  className="absolute top-11 right-0 w-[190px] rounded-xl overflow-hidden z-[2300] divide-y"
                  style={{ background: '#ffffff', boxShadow: '0 8px 32px rgba(13,28,46,0.12)', border: '1px solid rgba(197,197,211,0.3)', ['--tw-divide-opacity' as string]: '1' }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/app/settings'); }}
                    className="w-full text-left px-3 py-[11px] border-none text-[13px] font-semibold cursor-pointer transition-colors"
                    style={{ background: '#ffffff', color: '#0d1c2e' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#eff4ff'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#ffffff'; }}
                  >
                    {t('common.profile')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full text-left px-3 py-[11px] border-none text-[13px] font-bold cursor-pointer transition-colors"
                    style={{ background: '#ffffff', color: '#ba1a1a' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#ffdad6'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#ffffff'; }}
                  >
                    {t('common.signOut')}
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
