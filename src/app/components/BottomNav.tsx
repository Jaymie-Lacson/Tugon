import React from 'react';
import { useNavigate, useLocation } from 'react-router';

export interface BottomNavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  exact?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activePath?: string;
}

export function BottomNav({ items, activePath }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = activePath ?? location.pathname;

  return (
    <nav className="fixed z-50 flex border-t border-border bg-card left-[var(--app-vv-left,0px)] w-[var(--app-vv-width,100%)] bottom-[var(--app-vv-bottom-gap,0px)] lg:hidden">
      {items.map((item) => {
        const isActive = item.exact
          ? currentPath === item.path
          : currentPath === item.path || currentPath.startsWith(item.path + '/');
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-[env(safe-area-inset-bottom,4px)] pt-2 text-[11px] font-medium transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`flex size-6 items-center justify-center ${isActive ? 'text-primary' : ''}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
