import React from 'react';
import { useNavigate } from 'react-router';
import { Home, Plus, Map, FileText, User } from 'lucide-react';

type CitizenNavKey = 'home' | 'report' | 'map' | 'myreports' | 'profile';

interface CitizenDesktopNavProps {
  activeKey: CitizenNavKey;
  onNavigate?: (key: CitizenNavKey) => boolean | void;
}

export function CitizenDesktopNav({ activeKey, onNavigate }: CitizenDesktopNavProps) {
  const navigate = useNavigate();

  const navItems: { key: CitizenNavKey; icon: React.ReactNode; label: string }[] = [
    { key: 'home', icon: <Home size={22} />, label: 'Home' },
    { key: 'report', icon: <Plus size={22} />, label: 'Report' },
    { key: 'map', icon: <Map size={22} />, label: 'Map' },
    { key: 'myreports', icon: <FileText size={22} />, label: 'My Reports' },
    { key: 'profile', icon: <User size={22} />, label: 'Profile' },
  ];

  const handleClick = (key: CitizenNavKey) => {
    const handled = onNavigate?.(key);
    if (handled) return;

    if (key === 'report') navigate('/citizen/report');
    else if (key === 'myreports') navigate('/citizen/my-reports');
    else if (key === 'map') navigate('/citizen?tab=map');
    else if (key === 'profile') navigate('/citizen?tab=profile');
    else navigate('/citizen');
  };

  return (
    <div
      className="citizen-only-desktop citizen-web-strip"
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 14,
        paddingBottom: 10,
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC',
      }}
    >
      <div
        className="citizen-web-strip-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          overflowX: 'auto',
          flexWrap: 'nowrap',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: 8,
        }}
      >
        {navItems.map((item) => {
          const isActionRoute = item.key === 'report' || item.key === 'myreports';
          const isActive = activeKey === item.key;

          return (
            <button
              key={`desktop-${item.key}`}
              onClick={() => handleClick(item.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 9,
                border: `1px solid ${isActive ? '#93C5FD' : '#E2E8F0'}`,
                background: isActive ? '#F8FBFF' : 'white',
                color: isActive ? '#1E3A8A' : isActionRoute ? '#B91C1C' : '#334155',
                fontWeight: isActive ? 700 : 600,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'border-color 170ms ease, background 170ms ease, transform 170ms ease',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
