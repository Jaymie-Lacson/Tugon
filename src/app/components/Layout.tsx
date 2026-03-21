import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  BarChart2,
  FileText,
  UserCheck,
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
import { clearAuthSession, getAuthSession } from '../utils/authSession';

const NAV_ITEMS = [
  { path: '/app',            label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/app/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { path: '/app/map',        label: 'Map',        icon: Map },
  { path: '/app/analytics',  label: 'Analytics',  icon: BarChart2 },
  { path: '/app/reports',    label: 'Reports',    icon: FileText },
  { path: '/app/verifications', label: 'Verifications', icon: UserCheck },
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const userFullName = session?.user.fullName?.trim() || 'Barangay Official';
  const userInitials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'BO';
  const userRoleLabel = session?.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Barangay Official';

  const currentPage = NAV_ITEMS.find(n =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path) && n.path !== '/app'
  ) || NAV_ITEMS[0];

  const handleSignOut = () => {
    clearAuthSession();
    setDrawerOpen(false);
    setProfileMenuOpen(false);
    navigate('/auth/login', { replace: true });
  };

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#F0F4FF' }}>

      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="mobile-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'none' }}
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
          <NavLink
            to="/app"
            aria-label="Go to TUGON dashboard"
            style={{ display: 'inline-flex', marginBottom: 8 }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ width: 166, maxWidth: '100%', height: 'auto' }}
            />
          </NavLink>
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
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderLeft: '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon size={17} color={active ? '#BFDBFE' : '#93C5FD'} />
                <span style={{ color: active ? '#DBEAFE' : '#BFDBFE', fontSize: 13, fontWeight: 400, flex: 1 }}>
                  {item.label}
                </span>
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
            }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userFullName}</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>{userRoleLabel}</div>
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

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          background: '#1E3A8A', padding: '0 16px', height: 56,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
        }}>
          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center' }}>
            <NavLink
              to="/app"
              aria-label="Go to TUGON dashboard"
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
          <div className="header-breadcrumb" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#93C5FD', fontSize: 12 }}>TUGON</span>
              <ChevronRight size={12} color="#93C5FD" />
              <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{currentPage?.label}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 10 }}>Municipality of Tugon — Region IV-A</div>
          </div>

          {/* Mobile page label */}
          <div className="mobile-page-label" style={{ display: 'none', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, lineHeight: '56px', display: 'block' }}>
              {currentPage?.label}
            </span>
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
              <button
                type="button"
                aria-label="No notifications"
                title="No notifications yet"
                disabled
                className="icon-btn-square"
                style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'default', position: 'relative',
                opacity: 0.8,
              }}
              >
                <Bell size={18} color="white" />
              </button>
            </div>

            {/* Mobile hamburger — on the right of the bell */}
            <button
              onClick={() => {
                setDrawerOpen(!drawerOpen);
                setProfileMenuOpen(false);
              }}
              className="mobile-menu-btn icon-btn-square"
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                cursor: 'pointer', display: 'none',
              }}
            >
              <Menu size={20} color="white" />
            </button>

            {/* User avatar */}
            <div className="header-avatar-wrap" style={{ position: 'relative' }}>
              <button
                type="button"
                className="header-avatar"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setDrawerOpen(false);
                }}
                aria-label="Open profile actions"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #B4730A, #F59E0B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                }}
              >
                {userInitials}
              </button>

              {profileMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Profile actions"
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    width: 190,
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    zIndex: 120,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/app/settings');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 12px',
                      background: '#fff',
                      border: 'none',
                      borderBottom: '1px solid #F1F5F9',
                      color: '#1E293B',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Open profile page
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleSignOut();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 12px',
                      background: '#fff',
                      border: 'none',
                      color: '#B91C1C',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="page-content"
          style={{ flex: 1, overflowY: 'auto' }}
          onClick={() => {
            if (profileMenuOpen) {
              setProfileMenuOpen(false);
            }
          }}
          onScroll={() => {
            if (profileMenuOpen) {
              setProfileMenuOpen(false);
            }
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Extra Drawer (Settings + Super Admin) ── */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 280,
          background: '#1E3A8A', zIndex: 1400, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <NavLink
              to="/app"
              onClick={() => setDrawerOpen(false)}
              aria-label="Go to TUGON dashboard"
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

          {/* User info */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #B4730A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>{userInitials}</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{userFullName}</div>
              <div style={{ color: '#93C5FD', fontSize: 10 }}>{userRoleLabel}</div>
            </div>
          </div>

          {/* Extra links */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>Navigation</div>
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== '/app';
              const exactActive = location.pathname === '/app';
              const isActive = item.exact ? exactActive : active;

              return (
                <NavLink
                  key={`mobile-drawer-${item.path}`}
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
                type="button"
                onClick={handleSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(185,28,28,0.15)', border: 'none', width: '100%', cursor: 'pointer', minHeight: 48 }}
              >
                <LogOut size={18} color="#FCA5A5" />
                <span style={{ color: '#FCA5A5', fontSize: 14, fontWeight: 600 }}>Sign Out</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mobile-menu-btn { display: none !important; }

        @media (max-width: 1024px) {
          .sidebar-desktop    { display: none !important; }
          .mobile-menu-btn    { display: flex !important; }
          .mobile-logo        { display: flex !important; }
          .header-breadcrumb  { display: none !important; }
          .header-datetime    { display: none !important; }
          .header-avatar      { display: none !important; }
          .header-avatar-wrap { display: none !important; }
          .mobile-page-label  { display: flex !important; align-items: center !important; }
          .page-content       { padding-bottom: 0 !important; }
          .mobile-overlay     { display: block !important; }
        }

        @media (min-width: 1025px) {
          .mobile-page-label  { display: none !important; }
          .mobile-overlay     { display: none !important; }
        }
      `}</style>
    </div>
  );
}
