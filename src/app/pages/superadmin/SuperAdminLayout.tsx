import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { superAdminApi, type ApiAdminNotification } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';
import { AdminNotifications, type AdminNotificationItem } from '../../components/AdminNotifications';
import { BottomNav, type BottomNavItem } from '../../components/BottomNav';
import { useTranslation } from '../../i18n';

const NAV_ITEM_DEFS = [
  { path: '/superadmin', labelKey: 'nav.overview' as const, icon: LayoutDashboard, exact: true },
  { path: '/superadmin/map', labelKey: 'nav.barangayMap' as const, icon: Map },
  { path: '/superadmin/analytics', labelKey: 'nav.analytics' as const, icon: BarChart2 },
  { path: '/superadmin/users', labelKey: 'nav.users' as const, icon: Users },
  { path: '/superadmin/audit-logs', labelKey: 'nav.auditLogs' as const, icon: Activity },
  { path: '/superadmin/settings', labelKey: 'nav.settings' as const, icon: Settings },
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
  const NAV_ITEMS = NAV_ITEM_DEFS.map((item) => ({ ...item, label: t(item.labelKey) }));
  const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
    { key: 'overview',  icon: <LayoutDashboard size={20} />, label: t('nav.overview'),   path: '/superadmin',           exact: true },
    { key: 'map',       icon: <Map size={20} />,             label: t('nav.barangayMap'), path: '/superadmin/map' },
    { key: 'analytics', icon: <BarChart2 size={20} />,       label: t('nav.analytics'),   path: '/superadmin/analytics' },
    { key: 'users',     icon: <Users size={20} />,           label: t('nav.users'),       path: '/superadmin/users' },
    { key: 'settings',  icon: <Settings size={20} />,        label: t('nav.settings'),    path: '/superadmin/settings' },
  ];
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
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
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

  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-[248px] flex-col shrink-0 z-10 border-r border-white/10 bg-primary">
        {/* Logo */}
        <div className="px-[18px] pt-[18px] pb-3.5 border-b border-white/10">
          <NavLink to="/superadmin" aria-label={t('superadmin.layout.ariaOverview')} className="inline-flex">
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              className="w-[166px] max-w-full h-auto"
            />
          </NavLink>
        </div>

        {/* Barangay quick status */}
        <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
          <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase mb-1.5">{t('nav.monitoring')}</div>
          {monitoringItems.map((b) => (
            <div key={b.code} className="flex items-center gap-2 px-1.5 py-1 rounded-[5px] mb-0.5 bg-white/5">
              <span
                className="size-1.5 rounded-full inline-block shrink-0"
                style={{ background: b.color, boxShadow: `0 0 5px ${b.color}` }}
              />
              <span className="text-blue-200 text-[11px] flex-1">{b.name}</span>
              <span
                className="text-[9px] font-bold px-[5px] py-px rounded-[3px]"
                style={{ background: `${b.color}22`, color: b.color }}
              >
                {b.incidents} active
              </span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase px-2 mb-1">
            {t('nav.navigation')}
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg no-underline mb-0.5 border-l-[3px] transition-colors duration-150 ${
                  isActive ? 'border-white/50 bg-white/[0.14]' : 'border-transparent hover:bg-white/[0.08]'
                }`}
              >
                <item.icon size={16} className={isActive ? 'text-white' : 'text-blue-300'} />
                <span className={`text-[13px] flex-1 ${isActive ? 'font-semibold text-white' : 'text-blue-200'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/15">
          <div className="flex items-center gap-2.5">
            <div className="size-[34px] rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] flex items-center justify-center shrink-0 font-bold text-white text-[13px]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{userFullName}</div>
              <div className="text-blue-300 text-[10px]">{t('role.superAdmin')}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label={t('common.signOut')}
              title={t('common.signOut')}
              className="border-none bg-transparent p-0 cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <LogOut size={15} className="text-blue-300" />
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
            id="superadmin-mobile-drawer"
            role="navigation"
            aria-label={t('superadmin.layout.ariaNavigation')}
            className="absolute inset-y-0 left-0 w-[270px] bg-primary flex flex-col shadow-2xl"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="w-[140px] h-auto"
              />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t('superadmin.layout.ariaCloseNav')}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Barangay monitoring */}
            <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
              <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase mb-1.5">{t('nav.monitoring')}</div>
              {monitoringItems.map((b) => (
                <div key={b.code} className="flex items-center gap-2 px-1.5 py-1 rounded-[5px] mb-0.5 bg-white/5">
                  <span
                    className="size-1.5 rounded-full inline-block shrink-0"
                    style={{ background: b.color, boxShadow: `0 0 5px ${b.color}` }}
                  />
                  <span className="text-blue-200 text-[11px] flex-1">{b.name}</span>
                  <span
                    className="text-[9px] font-bold px-[5px] py-px rounded-[3px]"
                    style={{ background: `${b.color}22`, color: b.color }}
                  >
                    {t('superadmin.barangayMap.activeReports', { count: b.incidents })}
                  </span>
                </div>
              ))}
            </div>

            {/* Drawer nav items */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-blue-300 text-[9px] font-bold tracking-widest uppercase px-2 mb-1">
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
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg no-underline mb-0.5 border-l-[3px] transition-colors duration-150 ${
                      isActive ? 'border-white/50 bg-white/[0.14]' : 'border-transparent hover:bg-white/[0.08]'
                    }`}
                  >
                    <item.icon size={16} className={isActive ? 'text-white' : 'text-blue-300'} />
                    <span className={`text-[13px] flex-1 ${isActive ? 'font-semibold text-white' : 'text-blue-200'}`}>
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>

            {/* Drawer user profile */}
            <div className="px-4 py-3 border-t border-white/10 bg-black/15">
              <div className="flex items-center gap-2.5">
                <div className="size-[34px] rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] flex items-center justify-center shrink-0 font-bold text-white text-[13px]">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{userFullName}</div>
                  <div className="text-blue-300 text-[10px]">{t('role.superAdmin')}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label={t('common.signOut')}
                  className="border-none bg-transparent p-0 cursor-pointer inline-flex"
                >
                  <LogOut size={15} className="text-blue-300" />
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-primary px-5 h-14 flex items-center gap-3 shrink-0 border-b border-white/10 shadow-[0_2px_8px_rgba(30,58,138,0.3)] relative z-[2600]">
          {/* Mobile hamburger + logo */}
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
              className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <NavLink to="/superadmin" aria-label={t('superadmin.layout.ariaOverview')} className="inline-flex">
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
              <span className="bg-white/15 border border-white/20 rounded px-[7px] py-px text-blue-200 text-[9px] font-bold tracking-widest uppercase">
                {t('role.superAdmin').toUpperCase()}
              </span>
              <ChevronRight size={12} className="text-blue-300" />
              <span className="text-white text-[13px] font-semibold">{currentPage?.label}</span>
            </div>
            <div className="text-blue-300 text-[10px]">
              {t('superadmin.layout.consoleSubtitle')}
            </div>
          </div>

          {/* Mobile page label */}
          <div className="flex flex-1 min-w-0 items-center lg:hidden">
            <span className="text-white text-[17px] font-bold leading-[56px]">
              {currentPage?.label}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden lg:block text-right">
              <div className="text-white text-[13px] font-semibold"><LiveClock /></div>
              <div className="text-blue-300 text-[10px]">
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Alerts */}
            <AdminNotifications
              open={notificationsOpen}
              loading={notificationsLoading}
              unreadCount={unreadCount}
              items={notificationItems}
              panelLabel={t('superadmin.layout.ariaNotifications')}
              panelTop={44}
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

            {/* User avatar — desktop only */}
            <div className="hidden lg:block relative z-[2200]">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-label={t('superadmin.layout.ariaProfileActions')}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="size-9 rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] flex items-center justify-center font-bold text-white text-xs cursor-pointer shrink-0 border-none"
              >
                {userInitials}
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  className="absolute top-11 right-0 w-[200px] bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-[2300] divide-y divide-slate-100"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/superadmin/settings'); }}
                    className="w-full text-left px-3 py-[11px] bg-white border-none text-slate-800 text-[13px] font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    {t('superadmin.layout.openSettings')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full text-left px-3 py-[11px] bg-white border-none text-destructive text-[13px] font-bold cursor-pointer hover:bg-red-50"
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
