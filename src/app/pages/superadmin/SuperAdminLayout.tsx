import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart2,
  Bell,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';
import { clearAuthSession, getAuthSession } from '../../utils/authSession';

const NAV_ITEMS = [
  { path: '/superadmin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/superadmin/map', label: 'Barangay Map', icon: Map },
  { path: '/superadmin/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/superadmin/users', label: 'Users', icon: Users },
  { path: '/superadmin/audit-logs', label: 'Audit Logs', icon: Activity },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
    </span>
  );
}

const SIDEBAR_BG = '#1E3A8A';

type MonitoringItem = {
  code: string;
  name: string;
  incidents: number;
  color: string;
};

function getMonitoringColor(incidents: number): string {
  if (incidents >= 10) {
    return '#B91C1C';
  }
  if (incidents >= 5) {
    return '#F59E0B';
  }
  return '#22C55E';
}

export default function SuperAdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [monitoringItems, setMonitoringItems] = useState<MonitoringItem[]>([
    { code: '251', name: 'Brgy 251', incidents: 0, color: '#22C55E' },
    { code: '252', name: 'Brgy 252', incidents: 0, color: '#22C55E' },
    { code: '256', name: 'Brgy 256', incidents: 0, color: '#22C55E' },
  ]);
  const navigate = useNavigate();
  const location = useLocation();
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
        if (!mounted) {
          return;
        }

        const next = payload.barangays
          .filter((barangay) => ['251', '252', '256'].includes(barangay.code))
          .sort((a, b) => Number(a.code) - Number(b.code))
          .map((barangay) => ({
            code: barangay.code,
            name: `Brgy ${barangay.code}`,
            incidents: barangay.activeReports,
            color: getMonitoringColor(barangay.activeReports),
          }));

        if (next.length > 0) {
          setMonitoringItems(next);
        }
      } catch {
        // Keep zeroed fallback values if monitoring fetch fails.
      }
    };

    void loadMonitoring();

    return () => {
      mounted = false;
    };
  }, []);

  const currentPage = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
  ) || NAV_ITEMS[0];

  const handleSignOut = () => {
    clearAuthSession();
    setDrawerOpen(false);
    navigate('/auth/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="sa-mobile-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'none' }}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className="sa-sidebar-desktop"
        style={{
          width: 248,
          background: SIDEBAR_BG,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10,
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink
            to="/superadmin"
            onClick={() => setDrawerOpen(false)}
            aria-label="Go to TUGON super admin overview"
            style={{ display: 'inline-flex', marginBottom: 10 }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ width: 166, maxWidth: '100%', height: 'auto' }}
            />
          </NavLink>

          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ color: '#BFDBFE', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              SUPER ADMIN CONSOLE
            </span>
            <Wifi size={10} color="#93C5FD" style={{ marginLeft: 'auto' }} />
          </div>
        </div>

        {/* Barangay quick status */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Monitoring</div>
          {monitoringItems.map(b => (
            <div key={b.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 6px', borderRadius: 5, marginBottom: 2,
              background: 'rgba(255,255,255,0.05)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 5px ${b.color}` }} />
              <span style={{ color: '#BFDBFE', fontSize: 11, flex: 1 }}>{b.name}</span>
              <span style={{
                background: `${b.color}22`, color: b.color,
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              }}>{b.incidents} active</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
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
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderLeft: '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={16} color={isActive ? '#BFDBFE' : '#93C5FD'} />
                <span style={{ color: isActive ? '#DBEAFE' : '#BFDBFE', fontSize: 13, fontWeight: 400, flex: 1 }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={12} color="#93C5FD" />}
              </NavLink>
            );
          })}

          <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              System
            </div>
            {[
              { label: 'Audit Logs', icon: Activity, path: '/superadmin/audit-logs' },
            ].map((it) => (
              <NavLink
                key={it.label}
                to={it.path}
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 8, textDecoration: 'none', marginBottom: 2, borderLeft: '3px solid transparent',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <it.icon size={15} color="#93C5FD" />
                <span style={{ color: '#BFDBFE', fontSize: 12 }}>{it.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User profile */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontWeight: 700, color: 'white', fontSize: 13,
            }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userFullName}
              </div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>Super Admin</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LogOut size={15} color="#93C5FD" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          background: SIDEBAR_BG,
          padding: '0 20px', height: 56,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
        }}>
          <div className="sa-mobile-logo" style={{ display: 'none', alignItems: 'center' }}>
            <NavLink
              to="/superadmin"
              onClick={() => setDrawerOpen(false)}
              aria-label="Go to TUGON super admin overview"
              style={{ display: 'inline-flex' }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ width: 124, maxWidth: '100%', height: 'auto' }}
              />
            </NavLink>
          </div>

          {/* Desktop breadcrumb */}
          <div className="sa-header-breadcrumb" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4, padding: '1px 7px',
                color: '#BFDBFE', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                SUPER ADMIN
              </span>
              <ChevronRight size={12} color="#93C5FD" />
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{currentPage?.label}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 10 }}>
              Tondo Tri-Barangay Super Admin Console
            </div>
          </div>

          {/* Mobile page label */}
          <div className="sa-mobile-page-label" style={{ display: 'none', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, lineHeight: '56px', display: 'block' }}>
              {currentPage?.label}
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sa-header-datetime" style={{ textAlign: 'right' }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}><LiveClock /></div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* System status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <Wifi size={11} color="#22C55E" />
              <span style={{ color: '#22C55E', fontSize: 10, fontWeight: 600 }}>ALL SYSTEMS ONLINE</span>
            </div>

            {/* Alerts */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="No notifications"
                title="No notifications yet"
                disabled
                className="icon-btn-square"
                style={{
                lineHeight: 0,
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, minWidth: 34, minHeight: 34, padding: 0,
                opacity: 0.8,
              }}>
                <Bell size={18} color="white" />
              </button>
            </div>

            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="sa-mobile-menu-btn icon-btn-square"
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'none',
              }}
            >
              <Menu size={20} color="white" />
            </button>

            <div className="sa-header-avatar" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: 12, cursor: 'default', flexShrink: 0,
            }}>{userInitials}</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 0 }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile right drawer */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 280,
          background: SIDEBAR_BG, zIndex: 1400, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <NavLink
              to="/superadmin"
              onClick={() => setDrawerOpen(false)}
              aria-label="Go to TUGON super admin overview"
              style={{ display: 'inline-flex' }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ width: 148, maxWidth: '100%', height: 'auto' }}
              />
            </NavLink>
            <button onClick={() => setDrawerOpen(false)} className="icon-btn-square" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              <X size={18} color="white" />
            </button>
          </div>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #B4730A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>{userInitials}</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{userFullName}</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>Super Admin</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>
              Navigation
            </div>
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const exactActive = location.pathname === '/superadmin';
              const isActive = item.exact ? exactActive : active;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    marginBottom: 6,
                    background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                    border: isActive ? '1px solid rgba(191,219,254,0.65)' : '1px solid transparent',
                  }}
                >
                  <item.icon size={20} color={isActive ? '#DBEAFE' : '#93C5FD'} />
                  <span style={{ color: isActive ? '#DBEAFE' : '#BFDBFE', fontSize: 14, fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>
                More
              </div>
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(185,28,28,0.15)', border: 'none', width: '100%', cursor: 'pointer', minHeight: 48 }}
                >
                  <LogOut size={18} color="#FCA5A5" />
                  <span style={{ color: '#FCA5A5', fontSize: 14, fontWeight: 600 }}>Sign Out</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sa-sidebar-desktop   { display: none !important; }
          .sa-mobile-menu-btn   { display: flex !important; }
          .sa-mobile-logo       { display: flex !important; }
          .sa-header-breadcrumb { display: none !important; }
          .sa-header-datetime   { display: none !important; }
          .sa-header-avatar     { display: none !important; }
          .sa-mobile-page-label { display: flex !important; align-items: center !important; }
          .sa-mobile-overlay    { display: block !important; }
        }
        @media (min-width: 769px) {
          .sa-mobile-page-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}