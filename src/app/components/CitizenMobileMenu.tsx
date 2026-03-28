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
          className="flex size-[38px] items-center justify-center rounded-[9px] border border-white/30 bg-white/[0.16] p-0 text-white cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div className="citizen-only-mobile absolute top-[66px] left-4 right-4 bg-white rounded-xl shadow-[0_10px_22px_rgba(15,23,42,0.14)] z-[101] overflow-hidden border border-slate-200">
          <div className="px-3.5 py-2.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em]">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActionRoute = item.key === 'report' || item.key === 'myreports';
            const isActive = activeKey === item.key;
            return (
              <button
                key={`mobile-menu-${item.key}`}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 border-none border-b border-b-slate-50 text-[13px] cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#F8FBFF] text-primary font-bold'
                    : isActionRoute
                      ? 'bg-white text-destructive font-semibold'
                      : 'bg-white text-slate-800 font-semibold'
                }`}
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
