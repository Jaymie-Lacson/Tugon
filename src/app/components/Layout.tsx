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
} from 'lucide-react';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';
import { officialReportsApi, type ApiCrossBorderAlert } from '../services/officialReportsApi';
import type { ApiCitizenReport } from '../services/citizenReportsApi';
import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';
import { useTranslation } from '../i18n';
import { LanguageToggle } from '../i18n';
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
  const [searchNavResults, setSearchNavResults] = useState<typeof NAV_ITEMS>([]);
  const [searchIncidentResults, setSearchIncidentResults] = useState<Pick<ApiCitizenReport, 'id' | 'category' | 'location' | 'status' | 'description' | 'barangay'>[]>([]);
  const [searchResultsLoading, setSearchResultsLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
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
      setSearchNavResults(navMatches);
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
      return;
    }

    const closeMenuOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && headerRef.current?.contains(target)) {
        return;
      }

      setMobileDrawerOpen(false);
    };

    window.addEventListener('pointerdown', closeMenuOnOutsideTap, true);

    return () => {
      window.removeEventListener('pointerdown', closeMenuOnOutsideTap, true);
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

  const hasSearchInput = searchQuery.length > 0;

  return (
    <div className="app-shell-height flex overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

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
              className="flex size-[34px] shrink-0 items-center justify-center bg-[#0F172A] font-mono text-[13px] font-bold text-white"
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
        <header ref={headerRef} className="relative z-[2400] flex h-16 shrink-0 items-center gap-3 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
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
            <div className="relative ml-3 min-w-0 flex-1">
              <form onSubmit={handleSearch} className="flex items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2">
                <Search size={14} className="shrink-0 text-[var(--outline)]" />
                <input
                  type="search"
                  placeholder="Search incidents, barangays, or reports..."
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
                    {(searchResultsLoading || searchIncidentResults.length > 0) && (
                      <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Incidents</div>
                        {searchResultsLoading && searchIncidentResults.length === 0 && (
                          <div className="px-3 py-2 text-xs text-[var(--outline)]">Searching…</div>
                        )}
                        {searchIncidentResults.map((incident) => (
                          <button
                            key={incident.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearchResultClick(`/app/incidents?incident=${encodeURIComponent(incident.id)}`)}
                            className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-[var(--surface-container-high)]"
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
                        ))}
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
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-xs font-bold text-white"
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
            <button
              type="button"
              onClick={() => { setMobileDrawerOpen((v) => !v); setMobileSearchOpen(false); setProfileMenuOpen(false); setNotificationsOpen(false); }}
              aria-label={mobileDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileDrawerOpen}
              className={`order-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-low)] text-[var(--on-surface)] transition-[background,transform] duration-150 ease-out lg:hidden${mobileDrawerOpen ? ' scale-[0.97] bg-[var(--surface-container-high)]' : ''}`}
            >
              <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
                {mobileDrawerOpen ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>

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
            className="absolute inset-x-0 top-full z-[2] overflow-hidden border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-lg lg:hidden"
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
                  placeholder="Search incidents, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {(searchResultsLoading || searchIncidentResults.length > 0) && (
                  <div className={searchNavResults.length > 0 ? 'border-t border-[var(--outline-variant)]/20' : ''}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Incidents</div>
                    {searchResultsLoading && searchIncidentResults.length === 0 && (
                      <div className="px-4 py-2 text-sm text-[var(--outline)]">Searching…</div>
                    )}
                    {searchIncidentResults.map((incident) => (
                      <button
                        key={incident.id}
                        type="button"
                        onClick={() => handleSearchResultClick(`/app/incidents?incident=${encodeURIComponent(incident.id)}`)}
                        className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container-high)]"
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
                    ))}
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
            className="nav-mobile-panel absolute inset-x-0 top-full z-[1] overflow-hidden border-t border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] lg:hidden"
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
                  className={`flex w-full items-center gap-3 border-b border-[var(--outline-variant)]/25 px-0 py-3 no-underline text-[15px] font-semibold ${
                    active ? 'text-primary' : 'text-[var(--on-surface-variant)]'
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
              className={`flex w-full items-center gap-3 border-b border-[var(--outline-variant)]/25 px-0 py-3 no-underline text-[15px] font-semibold ${
                settingsActive ? 'text-primary' : 'text-[var(--on-surface-variant)]'
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
