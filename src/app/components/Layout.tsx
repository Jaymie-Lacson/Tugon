import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { useTranslation } from '../i18n';
import { officialSidebarNavDefs } from '../data/navigationConfig';

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('tugon-sidebar-collapsed') === 'true'; } catch { return false; }
  });
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
    try { localStorage.setItem('tugon-sidebar-collapsed', String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setMobileSearchOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileSearchOpen) {
      const timer = setTimeout(() => mobileSearchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileDrawerOpen) setMobileDrawerOpen(false);
      if (mobileSearchOpen) setMobileSearchOpen(false);
      if (profileMenuOpen) setProfileMenuOpen(false);
      if (notificationsOpen) setNotificationsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen, mobileSearchOpen, notificationsOpen, profileMenuOpen]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/app/incidents?search=${encodeURIComponent(q)}`);
    setSearchQuery('');
    setMobileSearchOpen(false);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

      {/* Desktop sidebar */}
      <aside className={`hidden ${sidebarCollapsed ? 'w-[68px]' : 'w-72'} shrink-0 flex-col overflow-hidden border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] transition-[width] duration-300 ease-in-out lg:flex`}>
        <div className={sidebarCollapsed ? 'px-3 pb-3 pt-4' : 'px-5 pb-5 pt-6'}>
          <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="no-underline">
            {sidebarCollapsed ? (
              <div className="flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="TUGON"
                  className="h-9 w-9 object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center">
                <img
                  src="/tugon-wordmark-blue.svg"
                  alt="TUGON"
                  className="h-9 w-auto object-contain"
                />
              </div>
            )}
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {!sidebarCollapsed && (
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
              {t('nav.navigation')}
            </div>
          )}
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
                title={t('nav.openPage', { page: item.label })}
                className={`mb-1.5 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2.5 no-underline transition-colors ${
                  active
                    ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                }`}
              >
                <item.icon size={16} className={`shrink-0 ${active ? 'text-primary' : 'text-[var(--outline)]'}`} />
                {!sidebarCollapsed && (
                  <span className={`text-[13px] whitespace-nowrap ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="mt-3 border-t border-[var(--outline-variant)]/35 pt-3">
            <NavLink
              to="/app/settings"
              title={t('nav.openSettingsPage')}
              className={`mb-1.5 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2.5 no-underline transition-colors ${
                settingsActive
                  ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
              }`}
            >
              <Settings size={16} className={`shrink-0 ${settingsActive ? 'text-primary' : 'text-[var(--outline)]'}`} />
              {!sidebarCollapsed && (
                <span className={`text-[13px] whitespace-nowrap ${settingsActive ? 'font-bold' : 'font-medium'}`}>
                  {t('common.settings')}
                </span>
              )}
            </NavLink>
          </div>
        </nav>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full cursor-pointer items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl border-none bg-transparent py-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]`}
          >
            {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!sidebarCollapsed && <span className="text-[13px] font-medium whitespace-nowrap">Collapse</span>}
          </button>
        </div>

        <div className={`border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] ${sidebarCollapsed ? 'px-2' : 'px-4'} py-3`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div
              className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white"
              title={sidebarCollapsed ? userFullName : undefined}
            >
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <>
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
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="relative z-[90] flex h-16 shrink-0 items-center gap-3 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
          {/* Mobile: page name */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[17px] font-bold text-primary">{currentPage?.label}</span>
          </div>

          {/* Desktop: breadcrumb + functional search */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 text-xs text-[var(--outline)]">
              <span className="font-semibold text-primary">TUGON</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-[var(--on-surface)]">{currentPage?.label}</span>
            </div>
            <form onSubmit={handleSearch} className="ml-3 flex min-w-0 flex-1 items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2">
              <Search size={14} className="shrink-0 text-[var(--outline)]" />
              <input
                type="search"
                placeholder="Search incidents, barangays, or reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-none bg-transparent px-2 text-xs text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
              />
            </form>
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

            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => { setMobileSearchOpen((v) => !v); setMobileDrawerOpen(false); }}
              aria-label="Search"
              className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] text-[var(--on-surface)] transition-[background,transform] duration-150 ease-out lg:hidden${mobileSearchOpen ? ' scale-[0.97] bg-[var(--surface-container-high)]' : ''}`}
            >
              {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>

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

            {/* Mobile hamburger (upper right) */}
            <button
              type="button"
              onClick={() => { setMobileDrawerOpen((v) => !v); setMobileSearchOpen(false); setProfileMenuOpen(false); setNotificationsOpen(false); }}
              aria-label={mobileDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileDrawerOpen}
              className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] text-[var(--on-surface)] transition-[background,transform] duration-150 ease-out lg:hidden${mobileDrawerOpen ? ' scale-[0.97] bg-[var(--surface-container-high)]' : ''}`}
            >
              <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
                {mobileDrawerOpen ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>
          </div>

          {/* Mobile search bar dropdown */}
          <div
            className="absolute inset-x-0 top-full z-[2] overflow-hidden border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-lg lg:hidden"
            style={{
              maxHeight: mobileSearchOpen ? 80 : 0,
              opacity: mobileSearchOpen ? 1 : 0,
              pointerEvents: mobileSearchOpen ? 'auto' : 'none',
              transition: 'max-height 250ms cubic-bezier(0.2,0.65,0.3,1), opacity 200ms ease',
            }}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-3">
              <div className="flex flex-1 items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2.5">
                <Search size={14} className="shrink-0 text-[var(--outline)]" />
                <input
                  ref={mobileSearchRef}
                  type="search"
                  placeholder="Search incidents, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-none bg-transparent px-2 text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
                />
              </div>
            </form>
          </div>

          {/* Mobile navigation dropdown (landing page style) */}
          <div
            className="nav-mobile-panel absolute inset-x-0 top-full z-[1] overflow-hidden border-t border-white/[0.08] bg-[rgba(15,23,42,0.98)] lg:hidden"
            aria-hidden={!mobileDrawerOpen}
            style={{
              padding: mobileDrawerOpen ? '12px 20px 20px' : '0 20px',
              maxHeight: mobileDrawerOpen ? 500 : 0,
              opacity: mobileDrawerOpen ? 1 : 0,
              transform: mobileDrawerOpen ? 'translateY(0)' : 'translateY(-10px)',
              pointerEvents: mobileDrawerOpen ? 'auto' : 'none',
              transition: 'max-height 320ms cubic-bezier(0.2,0.65,0.3,1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
            }}
          >
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
                  className={`flex w-full items-center gap-3 border-b border-white/[0.06] px-0 py-3 no-underline text-[15px] font-semibold ${
                    active ? 'text-white' : 'text-white/[0.7]'
                  }`}
                  style={{
                    opacity: mobileDrawerOpen ? 1 : 0,
                    transform: mobileDrawerOpen ? 'translateY(0)' : 'translateY(-6px)',
                    transition: 'opacity 180ms ease, transform 180ms ease',
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <NavLink
              to="/app/settings"
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex w-full items-center gap-3 border-b border-white/[0.06] px-0 py-3 no-underline text-[15px] font-semibold ${
                settingsActive ? 'text-white' : 'text-white/[0.7]'
              }`}
              style={{
                opacity: mobileDrawerOpen ? 1 : 0,
                transform: mobileDrawerOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <Settings size={16} />
              <span>{t('common.settings')}</span>
            </NavLink>

            <button
              type="button"
              onClick={() => { setMobileDrawerOpen(false); handleSignOut(); }}
              className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-white/[0.08] px-3 py-3 text-[15px] font-semibold text-red-400"
              style={{
                opacity: mobileDrawerOpen ? 1 : 0,
                transform: mobileDrawerOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <LogOut size={16} />
              <span>{t('common.signOut')}</span>
            </button>
          </div>

          <style>{`
            .nav-mobile-panel > *:nth-child(1) { transition-delay: 40ms; }
            .nav-mobile-panel > *:nth-child(2) { transition-delay: 80ms; }
            .nav-mobile-panel > *:nth-child(3) { transition-delay: 120ms; }
            .nav-mobile-panel > *:nth-child(4) { transition-delay: 160ms; }
            .nav-mobile-panel > *:nth-child(5) { transition-delay: 200ms; }
            .nav-mobile-panel > *:nth-child(6) { transition-delay: 240ms; }
            .nav-mobile-panel > *:nth-child(7) { transition-delay: 280ms; }
            .nav-mobile-panel > *:nth-child(8) { transition-delay: 320ms; }
            @media (prefers-reduced-motion: reduce) {
              .nav-mobile-panel, .nav-mobile-panel > * { transition: none !important; }
            }
          `}</style>
        </header>

        <main className="flex-1 overflow-y-auto" onClick={closeOverlays} onScroll={closeOverlays}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { Layout };
export default Layout;
