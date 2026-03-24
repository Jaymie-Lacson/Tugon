import React from 'react';
import { FileText, Home, Map as MapIcon, Menu, Plus, User } from 'lucide-react';

export type CitizenNavKey = 'home' | 'report' | 'map' | 'myreports' | 'profile';

interface CitizenMobileMenuProps {
  activeKey: CitizenNavKey;
  open: boolean;
  onToggle: () => void;
  onNavigate: (key: CitizenNavKey) => void;
}

const navItems: Array<{ key: CitizenNavKey; icon: React.ReactNode; label: string }> = [
  { key: 'home', icon: <Home size={18} />, label: 'Home' },
  { key: 'report', icon: <Plus size={18} />, label: 'Report' },
  { key: 'map', icon: <MapIcon size={18} />, label: 'Map' },
  { key: 'myreports', icon: <FileText size={18} />, label: 'My Reports' },
  { key: 'profile', icon: <User size={18} />, label: 'Profile' },
];

export function CitizenMobileMenu({ activeKey, open, onToggle, onNavigate }: CitizenMobileMenuProps) {
  return (
    <>
      <div className="citizen-only-mobile">
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 9,
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            padding: 0,
          }}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div
          className="citizen-only-mobile"
          style={{
            position: 'absolute',
            top: 66,
            left: 16,
            right: 16,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 22px rgba(15,23,42,0.14)',
            zIndex: 101,
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #F1F5F9',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Navigation
          </div>
          {navItems.map((item) => {
            const isActionRoute = item.key === 'report' || item.key === 'myreports';
            const isActive = activeKey === item.key;
            return (
              <button
                key={`mobile-menu-${item.key}`}
                onClick={() => onNavigate(item.key)}
                style={{
                  width: '100%',
                  background: isActive ? '#F8FBFF' : '#fff',
                  border: 'none',
                  borderBottom: '1px solid #F8FAFC',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: isActive ? '#1E3A8A' : isActionRoute ? '#B91C1C' : '#1E293B',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
