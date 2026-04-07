import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { isAuthExpiredError, superAdminApi, type ApiAdminNotification } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';
import { AdminNotifications, type AdminNotificationItem } from '../../components/AdminNotifications';
import { useTranslation } from '../../i18n';
import { LanguageToggle } from '../../i18n';
import { superAdminSidebarNavDefs } from '../../data/navigationConfig';
import { usePretextBlockMetrics } from '../../hooks/usePretextBlockMetrics';

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

type MonitoringItem = {
  code: string;
  name: string;
  incidents: number;
  color: string;
};

function getMonitoringColor(incidents: number): string {
  if (incidents >= 10) return 'var(--severity-critical)';
  if (incidents >= 5) return '#F59E0B';
  return '#22C55E';
}

export default function SuperAdminLayout() {
  const { t } = useTranslation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [monitoringItems, setMonitoringItems] = useState<MonitoringItem[]>([
    { code: '251', name: 'Brgy 251', incidents: 0, color: '#22C55E' },
    { code: '252', name: 'Brgy 252', incidents: 0, color: '#22C55E' },
    { code: '256', name: 'Brgy 256', incidents: 0, color: '#22C55E' },
  ]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNavResults, setSearchNavResults] = useState<typeof NAV_ITEMS>([]);
  const [searchUserResults, setSearchUserResults] = useState<{ id: string; fullName: string; role: string; barangayCode: string | null }[]>([]);
  const [searchBarangayResults, setSearchBarangayResults] = useState<MonitoringItem[]>([]);
  const [searchResultsLoading, setSearchResultsLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const NAV_ITEMS = superAdminSidebarNavDefs.map((item) => ({ ...item, label: t(item.labelKey) }));
  const session = getAuthSession();
  const userFullName = session?.user.fullName?.trim() || 'Super Admin';
  const userInitials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'SA';

  const handleAuthFailure = React.useCallback((error: unknown) => {
    if (!isAuthExpiredError(error)) {
      return false;
    }

    clearAuthSession();
    setAuthRedirecting(true);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    navigate('/auth/login', { replace: true });
    return true;
  }, [navigate]);

  useEffect(() => {
    if (getAuthSession()?.user.role === 'SUPER_ADMIN') {
      return;
    }

    setAuthRedirecting(true);
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const loadMonitoring = async () => {
      if (authRedirecting) {
        return;
      }

      try {
        const payload = await superAdminApi.getBarangays();
        if (!mounted) return;

        const next = payload.barangays
          .filter((barangay) => ['251', '252', '256'].includes(barangay.code))
          .sort((a, b) => Number(a.code) - Number(b.code))
          .map((barangay) => ({
            code: barangay.code,
            name: `Brgy ${barangay.code}`,
            incidents: barangay.activeReports,
            color: getMonitoringColor(barangay.activeReports),
          }));

        if (next.length > 0) setMonitoringItems(next);
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

        // Keep zeroed fallback values if monitoring fetch fails.
      }
    };

    void loadMonitoring();
    return () => { mounted = false; };
  }, [authRedirecting, handleAuthFailure]);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (authRedirecting) {
        return;
      }

      if (mounted) setNotificationsLoading(true);
      try {
        const payload = await superAdminApi.getNotifications({ limit: 15 });
        if (!mounted) return;
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount);
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

        if (!mounted) return;
      } finally {
        if (mounted) setNotificationsLoading(false);
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => { void loadNotifications(); }, 30000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, [authRedirecting, handleAuthFailure]);

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path),
  ) || NAV_ITEMS[0];
  const currentPageLabel = currentPage?.label ?? '';
  const mobileTitleMetrics = usePretextBlockMetrics<HTMLSpanElement>(currentPageLabel, {
    font: '700 17px "IBM Plex Sans"',
    lineHeight: 22,
    maxLines: 2,
  });
  const breadcrumbTitleMetrics = usePretextBlockMetrics<HTMLSpanElement>(currentPageLabel, {
    font: '600 12px "IBM Plex Sans"',
    lineHeight: 16,
    maxLines: 1,
  });
  const handleSignOut = () => {
    clearAuthSession();
    setProfileMenuOpen(false);
    navigate('/auth/login', { replace: true });
  };

  useEffect(() => {
    setMobileDrawerOpen(false);
    setMobileSearchOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    setSearchDropdownOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    if (mobileSearchOpen) {
      const timer = setTimeout(() => mobileSearchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchNavResults([]);
      setSearchUserResults([]);
      setSearchBarangayResults([]);
      setSearchDropdownOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      const ql = q.toLowerCase();
      const navMatches = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(ql));
      setSearchNavResults(navMatches);
      const barangayMatches = monitoringItems.filter(
        (b) => b.name.toLowerCase().includes(ql) || b.code.includes(ql),
      );
      setSearchBarangayResults(barangayMatches);
      setSearchDropdownOpen(true);
      setSearchResultsLoading(true);
      try {
        const { users } = await superAdminApi.getUsers({ search: q });
        setSearchUserResults(
          users.slice(0, 5).map((u) => ({ id: u.id, fullName: u.fullName, role: u.role, barangayCode: u.barangayCode })),
        );
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

        setSearchUserResults([]);
      } finally {
        setSearchResultsLoading(false);
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, authRedirecting, handleAuthFailure]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileDrawerOpen) setMobileDrawerOpen(false);
      if (mobileSearchOpen) setMobileSearchOpen(false);
      if (profileMenuOpen) setProfileMenuOpen(false);
      if (notificationsOpen) setNotificationsOpen(false);
      if (searchDropdownOpen) { setSearchDropdownOpen(false); setSearchQuery(''); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen, mobileSearchOpen, notificationsOpen, profileMenuOpen, searchDropdownOpen]);

  useEffect(() => {
    if (!mobileDrawerOpen) {
      return;
    }

    const closeMenuOnScroll = () => {
      setMobileDrawerOpen(false);
    };

    const closeMenuOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && headerRef.current?.contains(target)) {
        return;
      }

      setMobileDrawerOpen(false);
    };

    window.addEventListener('scroll', closeMenuOnScroll, { passive: true });
    window.addEventListener('pointerdown', closeMenuOnOutsideTap, true);

    return () => {
      window.removeEventListener('scroll', closeMenuOnScroll);
      window.removeEventListener('pointerdown', closeMenuOnOutsideTap, true);
    };
  }, [mobileDrawerOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/superadmin/audit-logs?search=${encodeURIComponent(q)}`);
    setSearchQuery('');
    setMobileSearchOpen(false);
    setMobileDrawerOpen(false);
    setSearchDropdownOpen(false);
  };

  const handleSearchResultClick = (path: string) => {
    setSearchQuery('');
    setSearchDropdownOpen(false);
    setMobileSearchOpen(false);
    navigate(path);
  };

  const handleNotificationClick = async (item: ApiAdminNotification) => {
    if (!item.readAt) {
      try {
        await superAdminApi.markNotificationRead(item.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

        // Keep UI usable even if mark-read fails.
      }
    }
    setNotificationsOpen(false);
    if (item.reportId) {
      navigate('/superadmin', { state: { focusReportId: item.reportId } });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0) return;
    try {
      await superAdminApi.markAllNotificationsRead();
      const nowIso = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })),
      );
      setUnreadCount(0);
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

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

  const closeOverlays = (options?: { includeMobileDrawer?: boolean; includeSearch?: boolean }) => {
    const includeMobileDrawer = options?.includeMobileDrawer ?? true;
    const includeSearch = options?.includeSearch ?? true;
    if (includeMobileDrawer && mobileDrawerOpen) setMobileDrawerOpen(false);
    if (includeSearch && mobileSearchOpen) setMobileSearchOpen(false);
    if (includeSearch && searchDropdownOpen) setSearchDropdownOpen(false);
    if (profileMenuOpen) setProfileMenuOpen(false);
    if (notificationsOpen) setNotificationsOpen(false);
  };

  const renderNavLinks = (onClick?: () => void, collapsed = false) => NAV_ITEMS.map((item) => {
    const active = item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path) && !item.exact;
    const exactActive = location.pathname === '/superadmin';
    const isActive = item.exact ? exactActive : active;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClick}
        title={t('nav.openPage', { page: item.label })}
        className={`mb-1.5 flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 no-underline transition-colors ${
          isActive
            ? 'border-l-2 border-[#2563EB] bg-slate-50 text-[#2563EB]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <item.icon size={16} className={`shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
        {!collapsed ? (
          <span className={`text-[13px] whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
            {item.label}
          </span>
        ) : null}
      </NavLink>
    );
  });

  const renderMonitoringStrip = () => (
    <div className="mb-3 border border-slate-200 bg-white p-2.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {t('nav.monitoring')}
      </div>
      {monitoringItems.map((barangay) => (
        <div key={barangay.code} className="mb-0 flex items-center gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: barangay.color }} />
          <span className="flex-1 text-[11px] font-medium text-[#0F172A]">{barangay.name}</span>
          <span
            className="font-mono text-[9px] font-bold"
            style={{ color: barangay.color }}
          >
            {t('superadmin.barangayMap.activeReports', { count: barangay.incidents })}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="app-shell-height flex overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

      {/* Desktop sidebar */}
      <aside className={`hidden ${desktopSidebarOpen ? 'w-72' : 'w-[68px]'} shrink-0 flex-col overflow-hidden overflow-x-clip border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] transition-[width] duration-200 ease-out lg:flex`}>
        <div className={desktopSidebarOpen ? 'overflow-x-hidden px-5 pb-5 pt-6' : 'overflow-x-hidden px-3 pb-3 pt-4'}>
          {desktopSidebarOpen ? (
            <div className="flex items-start justify-between gap-2 overflow-x-hidden">
              <NavLink to="/superadmin" aria-label={t('superadmin.layout.ariaOverview')} className="block min-w-0 flex-1 no-underline">
                <div className="flex min-w-0 items-center">
                  <img
                    src="/tugon-wordmark-blue.svg"
                    alt="TUGON"
                    className="h-9 w-auto max-w-full object-contain"
                  />
                </div>
              </NavLink>
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(false)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/45 bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
              >
                <ChevronsLeft size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <img
                src="/favicon.svg"
                alt="TUGON"
                className="h-9 w-9 object-contain"
              />
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {!desktopSidebarOpen ? (
            <button
              type="button"
              onClick={() => setDesktopSidebarOpen(true)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="mb-1.5 flex w-full cursor-pointer items-center justify-center rounded-xl border-none bg-transparent px-2 py-2.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
            >
              <ChevronsRight size={16} className="shrink-0" />
            </button>
          ) : null}
          {desktopSidebarOpen ? renderMonitoringStrip() : null}
          {desktopSidebarOpen ? (
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
              {t('nav.navigation')}
            </div>
          ) : null}
          {renderNavLinks(undefined, !desktopSidebarOpen)}
        </nav>

        <div className={`overflow-x-hidden border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] ${desktopSidebarOpen ? 'px-4' : 'px-2'} py-3`}>
          <div className={`flex min-w-0 items-center ${desktopSidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
            <div
              className="flex size-[34px] shrink-0 items-center justify-center bg-[#0F172A] text-[13px] font-bold text-white"
            >
              {userInitials}
            </div>
            {desktopSidebarOpen ? (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-[var(--on-surface)]">{userFullName}</div>
                  <div className="truncate text-[9px] leading-tight text-[var(--outline)]">{t('role.superAdmin')}</div>
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
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header ref={headerRef} className="relative z-[2600] flex h-16 shrink-0 items-center gap-3 overflow-x-clip border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
          {/* Mobile: page name */}
          <div className="flex items-center gap-2 lg:hidden">
            <span
              ref={mobileTitleMetrics.ref}
              style={mobileTitleMetrics.minHeight ? { minHeight: mobileTitleMetrics.minHeight } : undefined}
              className="block text-[17px] font-bold text-primary"
            >
              {currentPageLabel}
            </span>
          </div>

          {/* Desktop: breadcrumb + functional search */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 text-xs text-[var(--outline)]">
              <span className="font-semibold text-primary">{t('role.superAdmin')}</span>
              <ChevronRight size={12} />
              <span
                ref={breadcrumbTitleMetrics.ref}
                style={breadcrumbTitleMetrics.minHeight ? { minHeight: breadcrumbTitleMetrics.minHeight } : undefined}
                className="block font-semibold text-[var(--on-surface)]"
              >
                {currentPageLabel}
              </span>
            </div>
            <div className="relative ml-3 min-w-0 flex-1">
              <form onSubmit={handleSearch} className="flex items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2">
                <Search size={14} className="shrink-0 text-[var(--outline)]" />
                <input
                  type="search"
                  placeholder="Search users, barangays, or audits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim().length >= 2) setSearchDropdownOpen(true); }}
                  onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 150)}
                  className="w-full border-none bg-transparent px-2 text-xs text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
                />
              </form>
              {searchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container-lowest)] shadow-elevated">
                  <div className="max-h-80 overflow-y-auto">
                    {searchNavResults.length > 0 && (
                      <div>
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Navigation</div>
                        {searchNavResults.map((item) => (
                          <button
                            key={item.path}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick(item.path)}
                            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left text-[13px] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)]"
                          >
                            <item.icon size={14} className="shrink-0 text-primary" />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchBarangayResults.length > 0 && (
                      <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Barangays</div>
                        {searchBarangayResults.map((barangay) => (
                          <button
                            key={barangay.code}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick('/superadmin/map')}
                            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                          >
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: barangay.color }} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium text-[var(--on-surface)]">{barangay.name}</div>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold" style={{ color: barangay.color }}>{barangay.incidents} active</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {(searchResultsLoading || searchUserResults.length > 0) && (
                      <div className={(searchNavResults.length > 0 || searchBarangayResults.length > 0) ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Users</div>
                        {searchResultsLoading && searchUserResults.length === 0 && (
                          <div className="px-3 py-2 text-xs text-[var(--outline)]">Searching…</div>
                        )}
                        {searchUserResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick('/superadmin/users')}
                            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                          >
                            <div className="flex size-6 shrink-0 items-center justify-center bg-[#0F172A] text-[10px] font-bold text-white">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold text-[var(--on-surface)]">{user.fullName}</div>
                              <div className="truncate text-[11px] text-[var(--outline)]">{user.role}{user.barangayCode ? ` · Brgy ${user.barangayCode}` : ''}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchResultsLoading && searchNavResults.length === 0 && searchBarangayResults.length === 0 && searchUserResults.length === 0 && (
                      <div className="px-3 py-3 text-xs text-[var(--outline)]">No results for "{searchQuery.trim()}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden rounded-full bg-[var(--surface-container-low)] px-2.5 py-1 text-[10px] font-semibold text-[var(--on-surface-variant)] xl:flex xl:items-center xl:gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
              Monitoring Online
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

            <div className="order-3 relative z-[2200] hidden lg:block">
              {profileMenuOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationsOpen(false);
                  }}
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  aria-haspopup="menu"
                  aria-expanded="true"
                  className="flex size-9 cursor-pointer items-center justify-center bg-[#0F172A] text-xs font-bold text-white"
                >
                  {userInitials}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationsOpen(false);
                  }}
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  aria-haspopup="menu"
                  aria-expanded="false"
                  className="flex size-9 cursor-pointer items-center justify-center bg-[#0F172A] text-xs font-bold text-white"
                >
                  {userInitials}
                </button>
              )}

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  className="absolute right-0 top-11 z-[2300] w-[220px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated divide-y divide-[var(--outline-variant)]/30"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/superadmin/settings'); }}
                    className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] focus-visible:bg-[var(--surface-container-high)] focus-visible:outline-none active:bg-[var(--surface-container)]"
                  >
                    {t('superadmin.layout.openSettings')}
                  </button>
                  <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.language')}</div>
                    <LanguageToggle compact />
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-bold text-destructive transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none active:bg-red-100/70"
                  >
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger (upper right) */}
            {mobileDrawerOpen ? (
              <button
                type="button"
                onClick={() => { setMobileDrawerOpen((v) => !v); setMobileSearchOpen(false); setProfileMenuOpen(false); setNotificationsOpen(false); }}
                aria-label={t('superadmin.layout.ariaCloseNav')}
                aria-expanded="true"
                aria-controls="superadmin-mobile-drawer"
                className="order-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-high)] text-[var(--on-surface)] transition-[background,transform] duration-150 ease-out scale-[0.97] lg:hidden"
              >
                <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
                  <X size={18} />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileDrawerOpen((v) => !v); setMobileSearchOpen(false); setProfileMenuOpen(false); setNotificationsOpen(false); }}
                aria-label={t('superadmin.layout.ariaOpenNav')}
                aria-expanded="false"
                aria-controls="superadmin-mobile-drawer"
                className="order-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] text-[var(--on-surface)] transition-[background,transform] duration-150 ease-out lg:hidden"
              >
                <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
                  <Menu size={18} />
                </span>
              </button>
            )}

            <div className="order-2 lg:order-none">
              <AdminNotifications
                open={notificationsOpen}
                loading={notificationsLoading}
                unreadCount={unreadCount}
                items={notificationItems}
                panelLabel={t('superadmin.layout.ariaNotifications')}
                panelTop={48}
                panelRight={0}
                panelZIndex={2300}
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
            </div>
          </div>

          {/* Mobile search bar dropdown */}
          <div
            className="absolute inset-x-0 top-full z-[2] box-border max-w-full overflow-x-hidden overflow-y-hidden border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-lg lg:hidden"
            style={{
              maxHeight: mobileSearchOpen ? 600 : 0,
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
                  placeholder="Search users, barangays, or audits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-none bg-transparent px-2 text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
                />
              </div>
            </form>
            {searchQuery.trim().length >= 2 && (
              <div className="border-t border-[var(--outline-variant)]/20 pb-2">
                {searchNavResults.length > 0 && (
                  <div>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Navigation</div>
                    {searchNavResults.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleSearchResultClick(item.path)}
                        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-4 py-2.5 text-left text-[14px] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)]"
                      >
                        <item.icon size={15} className="shrink-0 text-primary" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchBarangayResults.length > 0 && (
                  <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Barangays</div>
                    {searchBarangayResults.map((barangay) => (
                      <button
                        key={barangay.code}
                        type="button"
                        onClick={() => handleSearchResultClick('/superadmin/map')}
                        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                      >
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: barangay.color }} />
                        <span className="flex-1 text-[14px] font-medium text-[var(--on-surface)]">{barangay.name}</span>
                        <span className="shrink-0 text-[12px] font-semibold" style={{ color: barangay.color }}>{barangay.incidents} active</span>
                      </button>
                    ))}
                  </div>
                )}
                {(searchResultsLoading || searchUserResults.length > 0) && (
                  <div className={(searchNavResults.length > 0 || searchBarangayResults.length > 0) ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Users</div>
                    {searchResultsLoading && searchUserResults.length === 0 && (
                      <div className="px-4 py-2 text-sm text-[var(--outline)]">Searching…</div>
                    )}
                    {searchUserResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSearchResultClick('/superadmin/users')}
                        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container-high)]"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[11px] font-bold text-white">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-[var(--on-surface)]">{user.fullName}</div>
                          <div className="truncate text-[12px] text-[var(--outline)]">{user.role}{user.barangayCode ? ` · Brgy ${user.barangayCode}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!searchResultsLoading && searchNavResults.length === 0 && searchBarangayResults.length === 0 && searchUserResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-[var(--outline)]">No results for "{searchQuery.trim()}"</div>
                )}
              </div>
            )}
          </div>

          {/* Mobile navigation dropdown (landing page style) */}
          <div
            id="superadmin-mobile-drawer"
            className="nav-mobile-panel absolute inset-x-0 top-full z-[1] box-border max-w-full overflow-x-hidden overflow-y-hidden border-t border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] lg:hidden"
            style={{
              padding: mobileDrawerOpen ? '12px 20px 20px' : '0 20px',
              maxHeight: mobileDrawerOpen ? 600 : 0,
              opacity: mobileDrawerOpen ? 1 : 0,
              transform: mobileDrawerOpen ? 'translateY(0)' : 'translateY(-10px)',
              pointerEvents: mobileDrawerOpen ? 'auto' : 'none',
              transition: 'max-height 320ms cubic-bezier(0.2,0.65,0.3,1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
            }}
          >
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
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex w-full items-center gap-3 border-b border-[var(--outline-variant)]/25 px-0 py-3 no-underline text-[15px] font-semibold ${
                    isActive ? 'text-primary' : 'text-[var(--on-surface-variant)]'
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

            <button
              type="button"
              onClick={() => { setMobileDrawerOpen(false); handleSignOut(); }}
              className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-[var(--surface-container-high)] px-3 py-3 text-[15px] font-semibold text-destructive"
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

        <main
          className="flex-1 overflow-x-hidden overflow-y-auto"
          onClick={() => closeOverlays({ includeMobileDrawer: true })}
          onScroll={() => closeOverlays({ includeMobileDrawer: true })}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
