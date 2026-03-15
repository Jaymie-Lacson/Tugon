import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router';
import {
  LayoutDashboard, Map, BarChart2, Users, Bell, ChevronRight,
  Shield, LogOut, Menu, X, Clock, Wifi, Settings, Activity,
  Lock, AlertCircle, Database,
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';

const NAV_ITEMS = [
  { path: '/superadmin',           label: 'SA Overview',    icon: LayoutDashboard, exact: true },
  { path: '/superadmin/map',       label: 'Barangay Map',   icon: Map },
  { path: '/superadmin/analytics', label: 'SA Analytics',   icon: BarChart2 },
  { path: '/superadmin/users',     label: 'User Management', icon: Users },
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
const SIDEBAR_ACCENT = '#1E40AF';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertCount] = useState(3);
  const [monitoringItems, setMonitoringItems] = useState<MonitoringItem[]>([
    { code: '251', name: 'Brgy 251', incidents: 0, color: '#22C55E' },
    { code: '252', name: 'Brgy 252', incidents: 0, color: '#22C55E' },
    { code: '256', name: 'Brgy 256', incidents: 0, color: '#22C55E' },
  ]);
  const location = useLocation();

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

  const currentPage = NAV_ITEMS.find(n =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
  ) || NAV_ITEMS[0];

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
          className="sa-mobile-overlay"
        />
      )}

      {/* Sidebar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 40, height: 40, background: '#B91C1C',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1 }}>TUGON</div>
              <div style={{ color: '#93C5FD', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Super Admin Console</div>
            </div>
          </div>

          {/* Super Admin badge */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Lock size={10} color="#93C5FD" />
            <span style={{ color: '#BFDBFE', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Elevated Access Mode
            </span>
            <span style={{
              marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E', boxShadow: '0 0 6px #22C55E', display: 'inline-block',
            }} />
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
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #B4730A' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={16} color={isActive ? '#FFFFFF' : '#93C5FD'} />
                <span style={{ color: isActive ? '#FFFFFF' : '#BFDBFE', fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1 }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={12} color="rgba(255,255,255,0.5)" />}
              </NavLink>
            );
          })}

          <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              System
            </div>
            {[
              { label: 'System Logs', icon: Activity, path: '/superadmin' },
              { label: 'Database',    icon: Database, path: '/superadmin' },
              { label: 'Settings',    icon: Settings,  path: '/app/settings' },
            ].map(it => (
              <NavLink
                key={it.label}
                to={it.path}
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
              flexShrink: 0, fontWeight: 700, color: 'white', fontSize: 12,
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              AR
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Admin Rodriguez
              </div>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Super Administrator</div>
            </div>
            <LogOut size={14} color="#93C5FD" style={{ cursor: 'pointer', flexShrink: 0 }} />
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
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sa-mobile-menu-btn icon-btn-square"
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'none', color: 'white' }}
          >
            <Menu size={18} color="white" />
          </button>

          {/* Page label */}
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
              TUGON — Multi-Barangay Management Console
            </div>
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
              <button style={{
                lineHeight: 0,
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, minWidth: 34, minHeight: 34, padding: 0,
              }}>
                <Bell size={18} color="white" />
                {alertCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 16, height: 16, background: '#B91C1C',
                    borderRadius: '50%', fontSize: 9, fontWeight: 700, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${SIDEBAR_BG}`,
                  }}>{alertCount}</span>
                )}
              </button>
            </div>

            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: 12, cursor: 'pointer', flexShrink: 0,
            }}>AR</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 0 }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar slide-in */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
          background: SIDEBAR_BG, zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, background: '#B91C1C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="white" />
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>TUGON</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="icon-btn-square" style={{ background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              <X size={20} color="white" />
            </button>
          </div>
          <nav style={{ flex: 1, padding: '12px' }}>
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 8, textDecoration: 'none', marginBottom: 4,
                    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                    borderLeft: active ? '3px solid #B4730A' : '3px solid transparent',
                  }}
                >
                  <item.icon size={18} color={active ? '#FFFFFF' : '#93C5FD'} />
                  <span style={{ color: active ? '#FFFFFF' : '#BFDBFE', fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {/* ── Super Admin Mobile Bottom Nav ── */}
      <nav
        className="sa-bottom-nav bottom-nav-bar"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#1E3A8A', display: 'none', zIndex: 30,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 -4px 20px rgba(30,58,138,0.45)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const exactActive = location.pathname === '/superadmin';
          const active = item.exact ? exactActive : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px 8px', textDecoration: 'none', gap: 4,
                borderTop: active ? '3px solid #B4730A' : '3px solid transparent',
                minHeight: 60,
              }}
            >
              <item.icon size={22} color={active ? '#FFFFFF' : '#93C5FD'} />
              <span style={{ fontSize: 9, color: active ? '#FFFFFF' : '#93C5FD', fontWeight: active ? 700 : 400, letterSpacing: '0.03em', textAlign: 'center' }}>
                {item.label.split(' ')[0]}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sa-sidebar-desktop { display: none !important; }
          .sa-mobile-menu-btn { display: flex !important; }
          .sa-header-breadcrumb { display: none !important; }
          .sa-header-datetime { display: none !important; }
          .sa-bottom-nav { display: flex !important; }
          .sa-main-content main { padding-bottom: 68px !important; }
        }
        @media (min-width: 769px) {
          .sa-bottom-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}