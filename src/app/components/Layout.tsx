import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  BarChart2,
  FileText,
  Bell,
  ChevronRight,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { getAuthSession, clearAuthSession } from '../utils/authSession';

const BASE_NAV_ITEMS = [
  { path: '/app',            label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/app/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { path: '/app/map',        label: 'Map',        icon: Map },
  { path: '/app/analytics',  label: 'Analytics',  icon: BarChart2 },
  { path: '/app/reports',    label: 'Reports',    icon: FileText },
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

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertCount] = useState(5);
  const location = useLocation();
  const navigate = useNavigate();
  const authSession = getAuthSession();
  const navItems = authSession?.user.role === 'OFFICIAL'
    ? [...BASE_NAV_ITEMS, { path: '/app/verifications', label: 'Verifications', icon: Shield }]
    : BASE_NAV_ITEMS;

  const currentPage = navItems.find(n =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path) && n.path !== '/app'
  ) || navItems[0];

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="mobile-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'none' }}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 240, background: '#1E3A8A', display: 'flex',
          flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 38, height: 38, background: '#B91C1C', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, lineHeight: 1.1, letterSpacing: '0.02em' }}>TUGON</div>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Incident Mgmt. System</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ color: '#A5F3FC', fontSize: 10, fontWeight: 500 }}>SYSTEM ONLINE</span>
            <Wifi size={10} color="#93C5FD" style={{ marginLeft: 'auto' }} />
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/app';
            const exactActive = location.pathname === '/app';
            const active = item.exact ? exactActive : isActive;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderLeft: active ? '3px solid #B4730A' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={17} color={active ? '#FFFFFF' : '#93C5FD'} />
                <span style={{ color: active ? '#FFFFFF' : '#BFDBFE', fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>
                  {item.label}
                </span>
                {active && <ChevronRight size={13} color="rgba(255,255,255,0.5)" />}
              </NavLink>
            );
          })}

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 4 }}>
              System
            </div>
            <NavLink
              to="/app/settings"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 2, borderLeft: '3px solid transparent',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Settings size={16} color="#93C5FD" />
              <span style={{ color: '#BFDBFE', fontSize: 13 }}>Settings</span>
            </NavLink>
            <NavLink
              to="/superadmin"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 2, borderLeft: '3px solid transparent',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginTop: 4,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            >
              <Shield size={15} color="#93C5FD" />
              <span style={{ color: '#BFDBFE', fontSize: 12, fontWeight: 600 }}>Super Admin</span>
              <ExternalLink size={11} color="#93C5FD" style={{ marginLeft: 'auto' }} />
            </NavLink>
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
            }}>JR</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Juan R. Reyes</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>MDRRMO Officer</div>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign Out"
              title="Sign Out"
              style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <LogOut size={15} color="#93C5FD" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          background: '#1E3A8A', padding: '0 16px', height: 56,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
        }}>
          {/* Mobile hamburger — opens extra links drawer */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="mobile-menu-btn"
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '8px', cursor: 'pointer', display: 'none', alignItems: 'center',
              justifyContent: 'center', minHeight: 40, minWidth: 40,
            }}
          >
            <Menu size={20} color="white" />
          </button>

          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#B91C1C', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="white" />
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16, letterSpacing: '0.02em' }}>TUGON</span>
          </div>

          {/* Desktop breadcrumb */}
          <div className="header-breadcrumb" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#93C5FD', fontSize: 12 }}>TUGON</span>
              <ChevronRight size={12} color="#93C5FD" />
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{currentPage?.label}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 10 }}>Municipality of Tugon — Region IV-A</div>
          </div>

          {/* Mobile page label */}
          <div className="mobile-page-label" style={{ display: 'none', flex: 1 }}>
            <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>{currentPage?.label}</span>
          </div>

          {/* Right area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Date / Time — desktop only */}
            <div className="header-datetime" style={{ textAlign: 'right' }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}><LiveClock /></div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>
                {new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Alert bell */}
            <div style={{ position: 'relative' }}>
              <button style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', minHeight: 40, minWidth: 40, position: 'relative',
              }}>
                <Bell size={18} color="white" />
                {alertCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 16, height: 16, background: '#B91C1C', borderRadius: '50%',
                    fontSize: 9, fontWeight: 700, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #1E3A8A',
                  }}>{alertCount}</span>
                )}
              </button>
            </div>

            {/* User avatar */}
            <div className="header-avatar" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: 12, cursor: 'pointer', flexShrink: 0,
            }}>JR</div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Extra Drawer (Settings + Super Admin) ── */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
          background: '#1E3A8A', zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, background: '#B91C1C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={17} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>TUGON</div>
                <div style={{ color: '#93C5FD', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incident Mgmt. System</div>
              </div>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', minHeight: 40, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="white" />
            </button>
          </div>

          {/* User info */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #B4730A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>JR</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>Juan R. Reyes</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>MDRRMO Officer</div>
            </div>
          </div>

          {/* Extra links */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>More</div>
            <NavLink
              to="/app/settings"
              onClick={() => setDrawerOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, textDecoration: 'none', marginBottom: 6, background: 'rgba(255,255,255,0.07)' }}
            >
              <Settings size={20} color="#93C5FD" />
              <span style={{ color: '#BFDBFE', fontSize: 14 }}>Settings</span>
            </NavLink>
            <NavLink
              to="/superadmin"
              onClick={() => setDrawerOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, textDecoration: 'none', marginBottom: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Shield size={20} color="#93C5FD" />
              <span style={{ color: '#BFDBFE', fontSize: 14, fontWeight: 600, flex: 1 }}>Super Admin</span>
              <ExternalLink size={14} color="#93C5FD" />
            </NavLink>

            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <button
                onClick={handleSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(185,28,28,0.15)', border: 'none', width: '100%', cursor: 'pointer', minHeight: 48 }}
              >
                <LogOut size={18} color="#FCA5A5" />
                <span style={{ color: '#FCA5A5', fontSize: 14, fontWeight: 600 }}>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      <nav
        className="mobile-bottom-nav bottom-nav-bar"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#1E3A8A', display: 'none', zIndex: 30,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 -4px 20px rgba(30,58,138,0.45)',
        }}
      >
        {navItems.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== '/app';
          const exactActive = location.pathname === '/app';
          const isActive = item.exact ? exactActive : active;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px 8px',
                textDecoration: 'none', gap: 4,
                borderTop: isActive ? '3px solid #B4730A' : '3px solid transparent',
                minHeight: 60,
              }}
            >
              <item.icon size={22} color={isActive ? '#FFFFFF' : '#93C5FD'} />
              <span style={{ fontSize: 10, color: isActive ? '#FFFFFF' : '#93C5FD', fontWeight: isActive ? 700 : 400, letterSpacing: '0.03em' }}>
                {item.label.split(' ')[0]}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop    { display: none !important; }
          .mobile-menu-btn    { display: flex !important; }
          .mobile-logo        { display: flex !important; }
          .header-breadcrumb  { display: none !important; }
          .header-datetime    { display: none !important; }
          .header-avatar      { display: none !important; }
          .mobile-page-label  { display: block !important; }
          .mobile-bottom-nav  { display: flex !important; }
          .page-content       { padding-bottom: 68px !important; }
          .mobile-overlay     { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav  { display: none !important; }
          .mobile-page-label  { display: none !important; }
        }
      `}</style>
    </div>
  );
}
