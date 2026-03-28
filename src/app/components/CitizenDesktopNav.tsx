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
    <div className="citizen-only-desktop citizen-web-strip flex justify-center pt-3.5 pb-2.5 border-b border-slate-200 bg-slate-50">
      <div className="citizen-web-strip-inner flex items-center gap-2.5 overflow-x-auto flex-nowrap bg-white border border-slate-200 rounded-xl p-2">
        {navItems.map((item) => {
          const isActionRoute = item.key === 'report' || item.key === 'myreports';
          const isActive = activeKey === item.key;

          return (
            <button
              key={`desktop-${item.key}`}
              onClick={() => handleClick(item.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] border text-xs cursor-pointer transition-[border-color,background,transform] duration-[170ms] ${
                isActive
                  ? 'border-blue-300 bg-[#F8FBFF] text-primary font-bold'
                  : isActionRoute
                    ? 'border-slate-200 bg-white text-destructive font-semibold hover:border-blue-200'
                    : 'border-slate-200 bg-white text-slate-700 font-semibold hover:border-blue-200'
              }`}
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
