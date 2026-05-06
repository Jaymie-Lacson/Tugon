import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  AlertTriangle,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
  User,
  Shield,
  Globe,
  Monitor
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';
import { citizenReportsApi, type ApiCitizenReport, type ApiReportStreamEvent } from '../services/citizenReportsApi';
import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from '../i18n';
import { LanguageToggle } from '../i18n';
import { citizenNavDefs } from '../data/navigationConfig';
import { usePretextBlockMetrics } from '../hooks/usePretextBlockMetrics';
import { useImmersiveThemeColor } from '../hooks/useImmersiveThemeColor';
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  useImmersiveThemeColor(isDark ? '#091728' : '#ffffff');

  const { t } = useTranslation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiCrossBorderAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNavResults, setSearchNavResults] = useState<typeof NAV_ITEMS>([]);
  const [searchIncidentResults, setSearchIncidentResults] = useState<Pick<ApiCitizenReport, 'id' | 'category' | 'location' | 'status' | 'description' | 'barangay'>[]>([]);
  const [searchResultsLoading, setSearchResultsLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
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

  const handleAuthFailure = React.useCallback((error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }

    const normalized = error.message.trim().toLowerCase();
    if (
      normalized !== 'your session has expired. please log in again.' &&
      !normalized.includes('must be logged in')
    ) {
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
    if (getAuthSession()?.user) {
      return;
    }

    setAuthRedirecting(true);
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const NAV_ITEMS = officialSidebarNavDefs.map((item) => ({ ...item, label: t(item.labelKey) }));

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path) && n.path !== '/app',
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
  const settingsActive = location.pathname === '/app/settings' || location.pathname.startsWith('/app/settings/');
  const mobileDrawerItemMotionClass = mobileDrawerOpen
    ? 'opacity-100 translate-y-0'
    : 'pointer-events-none opacity-0 -translate-y-1.5';

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
      setSearchIncidentResults([]);
      setSearchDropdownOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      if (authRedirecting) {
        return;
      }

      const ql = q.toLowerCase();
      const navMatches = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(ql));
      
      const settingsSubItems = [
        { path: '/app/settings?tab=account', label: t('nav.settings') + ' - Account', icon: User, keywords: ['account', 'profile', 'name'] },
        { path: '/app/settings?tab=access', label: t('nav.settings') + ' - Access Status', icon: Shield, keywords: ['access', 'authorization', 'verification', 'security'] },
        { path: '/app/settings?tab=language', label: t('nav.settings') + ' - ' + t('settings.language'), icon: Globe, keywords: ['language', 'locale', 'translation', 'english', 'tagalog'] },
        { path: '/app/settings?tab=appearance', label: t('nav.settings') + ' - Appearance', icon: Monitor, keywords: ['appearance', 'theme', 'dark mode', 'light mode'] },
      ];
      
      const settingsMatches = settingsSubItems.filter(item => 
        item.label.toLowerCase().includes(ql) || 
        item.keywords.some(kw => kw.includes(ql) || ql.includes(kw))
      );

      setSearchNavResults([...navMatches, ...settingsMatches] as any);
      setSearchDropdownOpen(true);
      setSearchResultsLoading(true);
      try {
        const { reports } = await officialReportsApi.getReports({ search: q });
        setSearchIncidentResults(
          reports.slice(0, 5).map((r) => ({ id: r.id, category: r.category, location: r.location, status: r.status, description: r.description, barangay: r.barangay })),
        );
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

        setSearchIncidentResults([]);
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
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (authRedirecting) {
        return;
      }

      if (active) setNotificationsLoading(true);
      try {
        const payload = await officialReportsApi.getAlerts();
        if (!active) return;
        setNotifications(payload.alerts);
        setUnreadCount(payload.alerts.filter((alert) => !alert.readAt).length);
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

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
  }, [authRedirecting, handleAuthFailure]);

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
      } catch (error) {
        if (handleAuthFailure(error)) {
          return;
        }

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
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

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

  const closeOverlays = (options?: { includeMobileDrawer?: boolean; includeSearch?: boolean }) => {
    const includeMobileDrawer = options?.includeMobileDrawer ?? true;
    const includeSearch = options?.includeSearch ?? true;
    if (includeMobileDrawer && mobileDrawerOpen) setMobileDrawerOpen(false);
    if (includeSearch && mobileSearchOpen) setMobileSearchOpen(false);
    if (includeSearch && searchDropdownOpen) setSearchDropdownOpen(false);
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
    setSearchDropdownOpen(false);
  };

  const handleSearchResultClick = (path: string) => {
    setSearchQuery('');
    setSearchDropdownOpen(false);
    setMobileSearchOpen(false);
    navigate(path);
  };


  const searchCombinedResults = React.useMemo(() => {
    return [
      ...searchNavResults.map(item => ({ type: 'nav', data: item })),
      ...searchIncidentResults.map(item => ({ type: 'incident', data: item }))
    ];
  }, [searchNavResults, searchIncidentResults]);

  useEffect(() => {
    setSearchSelectedIndex(-1);
  }, [searchQuery, searchNavResults, searchIncidentResults]);

  useEffect(() => {
    if (searchSelectedIndex >= 0) {
      const el = document.getElementById(`search-result-${searchSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [searchSelectedIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchDropdownOpen && !mobileSearchOpen) return;
    if (searchCombinedResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev < searchCombinedResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (searchSelectedIndex >= 0 && searchSelectedIndex < searchCombinedResults.length) {
        e.preventDefault();
        const selected = searchCombinedResults[searchSelectedIndex];
        if (selected.type === 'nav') {
          handleSearchResultClick(selected.data.path);
        } else {
          handleSearchResultClick(`/app/incidents?incident=${encodeURIComponent(selected.data.id)}`);
        }
      }
    }
  };

  const hasSearchInput = searchQuery.length > 0;


  return (
    <div className="app-shell-height flex overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

      {/* Desktop sidebar */}
      <aside className={`hidden ${desktopSidebarOpen ? 'w-72' : 'w-[68px]'} shrink-0 flex-col overflow-hidden overflow-x-clip border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] transition-[width] duration-200 ease-out lg:flex`}>
        <div className={desktopSidebarOpen ? 'overflow-x-hidden px-5 pb-5 pt-6' : 'overflow-x-hidden px-3 pb-3 pt-4'}>
          {desktopSidebarOpen ? (
            <div className="flex items-start justify-between gap-2 overflow-x-hidden">
              <NavLink to={roleHomePath} aria-label="Go to TUGON home" className="block min-w-0 flex-1 no-underline">
                <div className="flex min-w-0 items-center">
                  <img
                    src="/tugon-wordmark-blue.svg"
                    alt="TUGON"
                    className="h-9 w-auto max-w-full object-contain dark:hidden"
                  />
                  <img
                    src="/tugon-header-logo.svg"
                    alt="TUGON"
                    className="hidden h-9 w-auto max-w-full object-contain dark:block"
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
          {desktopSidebarOpen ? (
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
              {t('nav.navigation')}
            </div>
          ) : null}
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
                className={`mb-1.5 flex items-center ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} rounded-xl py-2.5 no-underline transition-colors ${
                  active
                    ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                }`}
              >
                <item.icon size={16} className={`shrink-0 ${active ? 'text-primary' : 'text-[var(--outline)]'}`} />
                {desktopSidebarOpen ? (
                  <span className={`text-[13px] whitespace-nowrap ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                ) : null}
              </NavLink>
            );
          })}

          <div className="mt-3 border-t border-[var(--outline-variant)]/35 pt-3">
            <NavLink
              to="/app/settings"
              title={t('nav.openSettingsPage')}
              className={`mb-1.5 flex items-center ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} rounded-xl py-2.5 no-underline transition-colors ${
                settingsActive
                  ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
              }`}
            >
              <Settings size={16} className={`shrink-0 ${settingsActive ? 'text-primary' : 'text-[var(--outline)]'}`} />
              {desktopSidebarOpen ? (
                <span className={`text-[13px] whitespace-nowrap ${settingsActive ? 'font-bold' : 'font-medium'}`}>
                  {t('common.settings')}
                </span>
              ) : null}
            </NavLink>
          </div>
        </nav>

        <div className={`overflow-x-hidden border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] ${desktopSidebarOpen ? 'px-4' : 'px-2'} py-3`}>
          <div className={`flex min-w-0 items-center ${desktopSidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
            <div
              className="flex size-[34px] shrink-0 items-center justify-center bg-[#0F172A] font-mono text-[13px] font-bold text-white"
            >
              {userInitials}
            </div>
            {desktopSidebarOpen ? (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-[var(--on-surface)]">{userFullName}</div>
                  <div className="truncate text-[9px] leading-tight text-[var(--outline)]">{userRoleLabel}</div>
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
        <header ref={headerRef} className="relative z-[2400] flex h-16 shrink-0 items-center gap-3 overflow-x-clip border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
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
              <span className="font-semibold text-primary">TUGON</span>
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
                  placeholder="Search incidents, barangays, or reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
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
                        {searchNavResults.map((item, idx) => {
                          const globalIdx = idx;
                          const isSelected = searchSelectedIndex === globalIdx;
                          return (
                          <button
                            key={item.path}
                            id={`search-result-${globalIdx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick(item.path)}
                            className={`flex w-full cursor-pointer items-center gap-2.5 border-none px-3 py-2 text-left text-[13px] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] ${isSelected ? 'bg-[var(--surface-container-high)] ring-inset ring-2 ring-primary/30' : 'bg-transparent'}`}
                          >
                            <item.icon size={14} className="shrink-0 text-primary" />
                            <span className="font-medium">{item.label}</span>
                          </button>
                          );
                        })}
                      </div>
                    )}
                    {(searchResultsLoading || searchIncidentResults.length > 0) && (
                      <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Incidents</div>
                        {searchResultsLoading && searchIncidentResults.length === 0 && (
                          <div className="px-3 py-2 text-xs text-[var(--outline)]">Searching…</div>
                        )}
                        {searchIncidentResults.map((incident, idx) => {
                          const globalIdx = searchNavResults.length + idx;
                          const isSelected = searchSelectedIndex === globalIdx;
                          return (
                          <button
                            key={incident.id}
                            id={`search-result-${globalIdx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick(`/app/incidents?incident=${encodeURIComponent(incident.id)}`)}
                            className={`flex w-full cursor-pointer items-center gap-3 border-none px-3 py-2 text-left transition-colors hover:bg-[var(--surface-container-high)] ${isSelected ? 'bg-[var(--surface-container-high)] ring-inset ring-2 ring-primary/30' : 'bg-transparent'}`}
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-high)]">
                              <AlertTriangle size={12} className="text-destructive" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-[13px] font-semibold text-[var(--on-surface)]">{incident.category}</span>
                                <span className="shrink-0 text-[10px] text-[var(--outline)]">·</span>
                                <span className="shrink-0 text-[10px] text-[var(--outline)]">{incident.barangay}</span>
                              </div>
                              <div className="truncate text-[11px] text-[var(--outline)]">{incident.location}</div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              incident.status === 'Submitted' ? 'bg-blue-50 text-blue-700' :
                              incident.status === 'Under Review' ? 'bg-yellow-50 text-yellow-700' :
                              incident.status === 'In Progress' ? 'bg-orange-50 text-orange-700' :
                              incident.status === 'Resolved' || incident.status === 'Closed' ? 'bg-green-50 text-green-700' :
                              'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'
                            }`}>{incident.status}</span>
                          </button>
                          );
                        })}
                      </div>
                    )}
                    {!searchResultsLoading && searchNavResults.length === 0 && searchIncidentResults.length === 0 && (
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

            <div className="order-3 relative z-[2200] hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-label="Open profile actions"
                aria-haspopup="menu"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#B4730A] text-xs font-bold text-white"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  className="absolute right-0 top-11 z-[2300] w-[220px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated divide-y divide-[var(--outline-variant)]/30"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/app/settings'); }}
                    className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] focus-visible:bg-[var(--surface-container-high)] focus-visible:outline-none active:bg-[var(--surface-container)]"
                  >
                    {t('common.profile')}
                  </button>
                  <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.language')}</div>
                    <LanguageToggle compact />
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.theme')}</div>
                    <ThemeToggle compact />
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
                aria-label="Close navigation menu"
                aria-expanded="true"
                aria-controls="layout-mobile-drawer"
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
                aria-label="Open navigation menu"
                aria-expanded="false"
                aria-controls="layout-mobile-drawer"
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
            </div>
          </div>

          {/* Mobile search bar dropdown */}
          <div
            className={`absolute inset-x-0 top-full z-[2] box-border max-w-full overflow-x-hidden overflow-y-hidden border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-lg transition-[max-height,opacity] duration-[250ms,200ms] ease-[cubic-bezier(0.2,0.65,0.3,1),ease] lg:hidden ${
              mobileSearchOpen
                ? 'max-h-[600px] opacity-100 pointer-events-auto'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
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
                  onKeyDown={handleSearchKeyDown}
                  className="w-full border-none bg-transparent px-2 text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
                />
                {hasSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      mobileSearchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--outline)] transition-colors hover:bg-[var(--surface-container)] hover:text-[var(--on-surface)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>
            {searchQuery.trim().length >= 2 && (
              <div className="border-t border-[var(--outline-variant)]/20 pb-2">
                {searchNavResults.length > 0 && (
                  <div>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Navigation</div>
                    {searchNavResults.map((item, idx) => {
                      const globalIdx = idx;
                      const isSelected = searchSelectedIndex === globalIdx;
                      return (
                      <button
                        key={item.path}
                        id={`search-result-${globalIdx}`}
                        type="button"
                        onClick={() => handleSearchResultClick(item.path)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 border-none px-4 py-2.5 text-left text-[14px] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] ${isSelected ? 'bg-[var(--surface-container-high)] ring-inset ring-2 ring-primary/30' : 'bg-transparent'}`}
                      >
                        <item.icon size={15} className="shrink-0 text-primary" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                      );
                    })}
                  </div>
                )}
                {(searchResultsLoading || searchIncidentResults.length > 0) && (
                  <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Incidents</div>
                    {searchResultsLoading && searchIncidentResults.length === 0 && (
                      <div className="px-4 py-2 text-sm text-[var(--outline)]">Searching…</div>
                    )}
                    {searchIncidentResults.map((incident, idx) => {
                      const globalIdx = searchNavResults.length + idx;
                      const isSelected = searchSelectedIndex === globalIdx;
                      return (
                      <button
                        key={incident.id}
                        id={`search-result-${globalIdx}`}
                        type="button"
                        onClick={() => handleSearchResultClick(`/app/incidents?incident=${encodeURIComponent(incident.id)}`)}
                        className={`flex w-full cursor-pointer items-center gap-3 border-none px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container-high)] ${isSelected ? 'bg-[var(--surface-container-high)] ring-inset ring-2 ring-primary/30' : 'bg-transparent'}`}
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-high)]">
                          <AlertTriangle size={13} className="text-destructive" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-semibold text-[var(--on-surface)]">{incident.category}</span>
                            <span className="shrink-0 text-[11px] text-[var(--outline)]">· {incident.barangay}</span>
                          </div>
                          <div className="truncate text-[12px] text-[var(--outline)]">{incident.location}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          incident.status === 'Submitted' ? 'bg-blue-50 text-blue-700' :
                          incident.status === 'Under Review' ? 'bg-yellow-50 text-yellow-700' :
                          incident.status === 'In Progress' ? 'bg-orange-50 text-orange-700' :
                          incident.status === 'Resolved' || incident.status === 'Closed' ? 'bg-green-50 text-green-700' :
                          'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'
                        }`}>{incident.status}</span>
                      </button>
                      );
                    })}
                  </div>
                )}
                {!searchResultsLoading && searchNavResults.length === 0 && searchIncidentResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-[var(--outline)]">No results for "{searchQuery.trim()}"</div>
                )}
              </div>
            )}
          </div>

          {/* Mobile navigation dropdown (landing page style) */}
          <div
            id="layout-mobile-drawer"
            className={`nav-mobile-panel fixed inset-x-0 top-[64px] z-50 box-border max-w-full overflow-x-hidden overflow-y-auto border-t border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] transition-[max-height,opacity,transform,padding] duration-[320ms,220ms,220ms,220ms] ease-[cubic-bezier(0.2,0.65,0.3,1),ease,ease,ease] lg:hidden flex flex-col ${
              mobileDrawerOpen
                ? 'pointer-events-auto h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] translate-y-0 px-5 pt-3 pb-5 opacity-100'
                : 'pointer-events-none h-[calc(100dvh-64px)] max-h-0 -translate-y-2.5 px-5 py-0 opacity-0'
            }`}
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
                  className={`flex w-full items-center gap-3 border-b border-[var(--outline-variant)]/25 px-0 py-3 no-underline text-[15px] font-semibold ${
                    active ? 'text-primary' : 'text-[var(--on-surface-variant)]'
                  } ${mobileDrawerItemMotionClass} transition-[opacity,transform] duration-[180ms] ease-out`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <NavLink
              to="/app/settings"
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex w-full items-center gap-3 border-b border-[var(--outline-variant)]/25 px-0 py-3 no-underline text-[15px] font-semibold ${
                settingsActive ? 'text-primary' : 'text-[var(--on-surface-variant)]'
              } ${mobileDrawerItemMotionClass} transition-[opacity,transform] duration-[180ms] ease-out`}
            >
              <Settings size={16} />
              <span>{t('common.settings')}</span>
            </NavLink>

            <button
              type="button"
              onClick={() => { setMobileDrawerOpen(false); handleSignOut(); }}
              className={`mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-[var(--surface-container-high)] px-3 py-3 text-[15px] font-semibold text-destructive ${mobileDrawerItemMotionClass} transition-[opacity,transform] duration-[180ms] ease-out`}
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
          onScroll={() => closeOverlays({ includeMobileDrawer: false })}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { Layout };
export default Layout;
