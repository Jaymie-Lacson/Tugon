import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
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

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path) && n.path !== '/app',
  ) || NAV_ITEMS[0];
  const settingsActive = location.pathname === '/app/settings' || location.pathname.startsWith('/app/settings/');

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
    <div className="flex h-dvh overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] lg:flex">
        <div className="px-5 pb-5 pt-6">
          <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="no-underline">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
              Tondo Command
            </div>
            <div className="mt-1 text-[31px] font-black leading-none tracking-[-0.04em] text-primary">
              TUGON
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--on-surface-variant)]">
              District Operations Console
            </div>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
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
                className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
                  active
                    ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                }`}
              >
                <item.icon size={16} className={active ? 'text-primary' : 'text-[var(--outline)]'} />
                <span className={`text-[13px] ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          <div className="mt-3 border-t border-[var(--outline-variant)]/35 pt-3">
            <NavLink
              to="/app/settings"
              className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
                settingsActive
                  ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
              }`}
            >
              <Settings size={16} className={settingsActive ? 'text-primary' : 'text-[var(--outline)]'} />
              <span className={`text-[13px] ${settingsActive ? 'font-bold' : 'font-medium'}`}>
                {t('common.settings')}
              </span>
            </NavLink>
          </div>
        </nav>

        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/app/incidents')}
            className="btn-gradient-primary shadow-ambient w-full cursor-pointer rounded-xl border-none px-4 py-3 text-sm font-bold"
          >
            New Report
          </button>
        </div>

        <div className="border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[var(--on-surface)]">{userFullName}</div>
              <div className="text-[10px] text-[var(--outline)]">{userRoleLabel}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label={t('common.signOut')}
              title={t('common.signOut')}
              className="inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[var(--outline)]"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[3000] lg:hidden" aria-hidden={!mobileDrawerOpen}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawerOpen(false)} />
          <nav
            id="layout-mobile-drawer"
            role="navigation"
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-[var(--surface-container-low)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/35 px-4 pb-3 pt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
                  Tondo Command
                </div>
                <div className="text-[25px] font-black leading-none tracking-[-0.04em] text-primary">TUGON</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/50 bg-[var(--surface-container-lowest)] text-[var(--on-surface)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
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
                    className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
                      active
                        ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                        : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                    }`}
                  >
                    <item.icon size={16} className={active ? 'text-primary' : 'text-[var(--outline)]'} />
                    <span className={`text-[13px] ${active ? 'font-bold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}

              <div className="mt-3 border-t border-[var(--outline-variant)]/35 pt-3">
                <NavLink
                  to="/app/settings"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
                    settingsActive
                      ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                      : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                  }`}
                >
                  <Settings size={16} className={settingsActive ? 'text-primary' : 'text-[var(--outline)]'} />
                  <span className={`text-[13px] ${settingsActive ? 'font-bold' : 'font-medium'}`}>
                    {t('common.settings')}
                  </span>
                </NavLink>
              </div>
            </div>

            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/app/incidents');
                }}
                className="btn-gradient-primary shadow-ambient w-full cursor-pointer rounded-xl border-none px-4 py-3 text-sm font-bold"
              >
                New Report
              </button>
            </div>

            <div className="border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[var(--on-surface)]">{userFullName}</div>
                  <div className="text-[10px] text-[var(--outline)]">{userRoleLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label={t('common.signOut')}
                  className="inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[var(--outline)]"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="relative z-[90] flex h-16 shrink-0 items-center gap-3 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
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
              className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] text-[var(--on-surface)]"
            >
              <Menu size={18} />
            </button>
            <span className="text-[17px] font-bold text-primary">{currentPage?.label}</span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 text-xs text-[var(--outline)]">
              <span className="font-semibold text-primary">TUGON</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-[var(--on-surface)]">{currentPage?.label}</span>
            </div>
            <div className="ml-3 flex min-w-0 flex-1 items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2">
              <Search size={14} className="shrink-0 text-[var(--outline)]" />
              <input
                type="search"
                placeholder="Search incidents, barangays, or reports..."
                className="w-full border-none bg-transparent px-2 text-xs text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[10px] font-semibold text-[var(--on-surface-variant)] xl:flex xl:items-center xl:gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
              System Online
            </div>
            <div className="hidden text-right lg:block">
              <div className="text-[13px] font-semibold text-[var(--on-surface)]"><LiveClock /></div>
              <div className="text-[10px] text-[var(--outline)]">
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <AdminNotifications
              open={notificationsOpen}
              loading={notificationsLoading}
              unreadCount={unreadCount}
              items={notificationItems}
              panelLabel="Official notifications"
              panelTop={48}
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

            <div className="relative z-[2200] hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-label="Open profile actions"
                aria-haspopup="menu"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-xs font-bold text-white"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  className="absolute right-0 top-11 z-[2300] w-[190px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/app/settings'); }}
                    className="w-full cursor-pointer border-none border-b border-[var(--outline-variant)]/30 bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)]"
                  >
                    {t('common.profile')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-bold text-destructive"
                  >
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0" onClick={closeOverlays} onScroll={closeOverlays}>
          <Outlet />
        </main>

        <BottomNav items={BOTTOM_NAV_ITEMS} />
      </div>
    </div>
  );
}

export { Layout };
export default Layout;
