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
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';

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

function getMonitoringBadgeVariant(incidents: number): 'destructive' | 'secondary' | 'outline' {
  if (incidents >= 10) return 'destructive';
  if (incidents >= 5) return 'secondary';
  return 'outline';
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
        className="no-underline"
      >
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={`mb-1 w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-[13px] ${
            isActive
              ? 'bg-accent font-bold text-primary'
              : 'font-medium text-muted-foreground'
          }`}
        >
          <item.icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
          {item.label}
        </Button>
      </NavLink>
    );
  });

  const renderMonitoringStrip = () => (
    <Card className="mb-3 border-border/50">
      <CardContent className="p-2.5">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t('nav.monitoring')}
        </div>
        {monitoringItems.map((barangay) => (
          <div key={barangay.code} className="mb-1 flex items-center gap-2 rounded-lg bg-background px-2 py-1.5 last:mb-0">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: barangay.color }} />
            <span className="flex-1 text-[11px] font-medium text-foreground">{barangay.name}</span>
            <Badge variant={getMonitoringBadgeVariant(barangay.incidents)} className="text-[9px] font-bold px-1.5 py-px">
              {t('superadmin.barangayMap.activeReports', { count: barangay.incidents })}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border/50 bg-card lg:flex">
        <div className="px-5 pb-5 pt-6">
          <NavLink to="/superadmin" aria-label={t('superadmin.layout.ariaOverview')} className="no-underline">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Super Admin
            </div>
            <div className="mt-1 text-[31px] font-black leading-none tracking-[-0.04em] text-primary">
              TUGON
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              Command and Compliance Suite
            </div>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {renderMonitoringStrip()}
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t('nav.navigation')}
          </div>
          {renderNavLinks()}
        </nav>

        <div className="px-4 pb-3">
          <Button
            onClick={() => navigate('/superadmin')}
            className="w-full rounded-xl font-bold"
          >
            District Overview
          </Button>
        </div>

        <Separator />
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-[34px]">
              <AvatarFallback className="bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{userFullName}</div>
              <div className="text-[10px] text-muted-foreground">{t('role.superAdmin')}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label={t('common.signOut')}
              title={t('common.signOut')}
              className="size-8 text-muted-foreground"
            >
              <LogOut size={15} />
            </Button>
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
            className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 pb-3 pt-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Super Admin
                </div>
                <div className="text-[25px] font-black leading-none tracking-[-0.04em] text-primary">TUGON</div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t('superadmin.layout.ariaCloseNav')}
                className="size-8"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {renderMonitoringStrip()}
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t('nav.navigation')}
              </div>
              {renderNavLinks(() => setMobileDrawerOpen(false))}
            </div>

            <Separator />
            <div className="bg-card px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-[34px]">
                  <AvatarFallback className="bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-[13px] font-bold text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">{userFullName}</div>
                  <div className="text-[10px] text-muted-foreground">{t('role.superAdmin')}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  aria-label={t('common.signOut')}
                  className="size-8 text-muted-foreground"
                >
                  <LogOut size={15} />
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="relative z-[2600] flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-card px-4 lg:px-5">
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="outline"
              size="icon"
              aria-controls="superadmin-mobile-drawer"
              aria-expanded={mobileDrawerOpen}
              aria-label={t('superadmin.layout.ariaOpenNav')}
              onClick={() => {
                setMobileDrawerOpen((prev) => !prev);
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              className="size-9"
            >
              <Menu size={18} />
            </Button>
            <span className="text-[17px] font-bold text-primary">{currentPage?.label}</span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t('role.superAdmin')}</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-foreground">{currentPage?.label}</span>
            </div>
            <div className="ml-3 flex min-w-0 flex-1 items-center gap-2">
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users, barangays, or audits..."
                className="h-8 border-0 bg-muted/50 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <Badge variant="outline" className="hidden gap-2 xl:inline-flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
              Monitoring Online
            </Badge>
            <div className="hidden text-right lg:block">
              <div className="text-[13px] font-semibold text-foreground"><LiveClock /></div>
              <div className="text-[10px] text-muted-foreground">
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
                className="cursor-pointer border-0 bg-transparent p-0"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-xs font-bold text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label={t('superadmin.layout.ariaProfileActions')}
                  className="absolute right-0 top-11 z-[2300] w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); navigate('/superadmin/settings'); }}
                    className="w-full cursor-pointer border-0 border-b border-border bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-foreground hover:bg-accent"
                  >
                    {t('superadmin.layout.openSettings')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    className="w-full cursor-pointer border-0 bg-transparent px-3 py-[11px] text-left text-[13px] font-bold text-destructive hover:bg-accent"
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
