import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronRight,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { superAdminApi, type ApiAdminNotification } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';
import { AdminNotifications, type AdminNotificationItem } from '../../components/AdminNotifications';
import { BottomNav, type BottomNavItem } from '../../components/BottomNav';
import { useTranslation } from '../../i18n';
import { superAdminBottomNavDefs, superAdminSidebarNavDefs } from '../../data/navigationConfig';

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
  const [monitoringItems, setMonitoringItems] = useState<MonitoringItem[]>([
    { code: '251', name: 'Brgy 251', incidents: 0, color: '#22C55E' },
    { code: '252', name: 'Brgy 252', incidents: 0, color: '#22C55E' },
    { code: '256', name: 'Brgy 256', incidents: 0, color: '#22C55E' },
  ]);
  const navigate = useNavigate();
  const location = useLocation();
  const NAV_ITEMS = superAdminSidebarNavDefs.map((item) => ({ ...item, label: t(item.labelKey) }));
  const BOTTOM_NAV_ITEMS: BottomNavItem[] = superAdminBottomNavDefs.map((item) => {
    const Icon = item.icon;
    return {
      key: item.key,
      icon: <Icon size={20} />,
      label: t(item.labelKey),
      path: item.path,
      exact: item.exact,
    };
  });
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
      } catch {
        // Keep zeroed fallback values if monitoring fetch fails.
      }
    };

    void loadMonitoring();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (mounted) setNotificationsLoading(true);
      try {
        const payload = await superAdminApi.getNotifications({ limit: 15 });
        if (!mounted) return;
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount);
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setNotificationsLoading(false);
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => { void loadNotifications(); }, 30000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path),
  ) || NAV_ITEMS[0];

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
    if (unreadCount <= 0) return;
    try {
      await superAdminApi.markAllNotificationsRead();
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
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    readAt: item.readAt,
  }));

  const closeOverlays = () => {
    if (profileMenuOpen) setProfileMenuOpen(false);
    if (notificationsOpen) setNotificationsOpen(false);
  };

  const renderNavLinks = (onClick?: () => void) => NAV_ITEMS.map((item) => {
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
        className={`mb-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors ${
          isActive
            ? 'bg-[var(--surface-container-high)] text-primary shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
            : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
        }`}
      >
        <item.icon size={16} className={isActive ? 'text-primary' : 'text-[var(--outline)]'} />
        <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>
          {item.label}
        </span>
      </NavLink>
    );
  });

  const renderMonitoringStrip = () => (
    <div className="mb-3 rounded-xl bg-[var(--surface-container)] p-2.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
        {t('nav.monitoring')}
      </div>
      {monitoringItems.map((barangay) => (
        <div key={barangay.code} className="mb-1 flex items-center gap-2 rounded-lg bg-[var(--surface-container-lowest)] px-2 py-1.5 last:mb-0">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: barangay.color }} />
          <span className="flex-1 text-[11px] font-medium text-[var(--on-surface)]">{barangay.name}</span>
          <span
            className="rounded-[5px] px-1.5 py-px text-[9px] font-bold"
            style={{ color: barangay.color, background: `${barangay.color}20` }}
          >
            {t('superadmin.barangayMap.activeReports', { count: barangay.incidents })}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] lg:flex">
        <div className="px-5 pb-5 pt-6">
          <NavLink to="/superadmin" aria-label={t('superadmin.layout.ariaOverview')} className="no-underline">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
              Super Admin
            </div>
            <div className="mt-1 text-[31px] font-black leading-none tracking-[-0.04em] text-primary">
              TUGON
            </div>
            <div className="mt-1 text-xs font-medium text-[var(--on-surface-variant)]">
              Command and Compliance Suite
            </div>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {renderMonitoringStrip()}
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
            {t('nav.navigation')}
          </div>
          {renderNavLinks()}
        </nav>

        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin')}
            className="btn-gradient-primary shadow-ambient w-full cursor-pointer rounded-xl border-none px-4 py-3 text-sm font-bold"
          >
            District Overview
          </button>
        </div>

        <div className="border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[var(--on-surface)]">{userFullName}</div>
              <div className="text-[10px] text-[var(--outline)]">{t('role.superAdmin')}</div>
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
            id="superadmin-mobile-drawer"
            role="navigation"
            aria-label={t('superadmin.layout.ariaNavigation')}
            className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-[var(--surface-container-low)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/35 px-4 pb-3 pt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
                  Super Admin
                </div>
                <div className="text-[25px] font-black leading-none tracking-[-0.04em] text-primary">TUGON</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t('superadmin.layout.ariaCloseNav')}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/50 bg-[var(--surface-container-lowest)] text-[var(--on-surface)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {renderMonitoringStrip()}
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
                {t('nav.navigation')}
              </div>
              {renderNavLinks(() => setMobileDrawerOpen(false))}
            </div>

            <div className="border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[var(--on-surface)]">{userFullName}</div>
                  <div className="text-[10px] text-[var(--outline)]">{t('role.superAdmin')}</div>
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
        <header className="relative z-[2600] flex h-16 shrink-0 items-center gap-3 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] px-4 lg:px-5">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-controls="superadmin-mobile-drawer"
              aria-expanded={mobileDrawerOpen}
              aria-label={t('superadmin.layout.ariaOpenNav')}
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
              <span className="font-semibold text-primary">{t('role.superAdmin')}</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-[var(--on-surface)]">{currentPage?.label}</span>
            </div>
            <div className="ml-3 flex min-w-0 flex-1 items-center rounded-xl bg-[var(--surface-container-high)] px-3 py-2">
              <Search size={14} className="shrink-0 text-[var(--outline)]" />
              <input
                type="search"
                placeholder="Search users, barangays, or audits..."
                className="w-full border-none bg-transparent px-2 text-xs text-[var(--on-surface)] outline-none placeholder:text-[var(--outline)]"
              />
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

            <div className="relative z-[2200] hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-label={t('superadmin.layout.ariaProfileActions')}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-xs font-bold text-white"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  className="absolute right-0 top-11 z-[2300] w-[200px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/superadmin/settings'); }}
                    className="w-full cursor-pointer border-none border-b border-[var(--outline-variant)]/30 bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)]"
                  >
                    {t('superadmin.layout.openSettings')}
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
