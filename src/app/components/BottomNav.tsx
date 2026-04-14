import React, { useRef, useEffect, useState } from 'react';
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
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);

  // Find active index
  const activeIndex = items.findIndex((item) =>
    item.exact
      ? currentPath === item.path
      : currentPath === item.path || currentPath.startsWith(item.path + '/')
  );

  // Update indicator position when active item changes
  useEffect(() => {
    if (navRef.current && activeIndex >= 0) {
      const buttons = navRef.current.querySelectorAll<HTMLButtonElement>('[data-nav-item]');
      const activeButton = buttons[activeIndex];
      if (activeButton) {
        const navRect = navRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - navRect.left + buttonRect.width / 2 - 16,
          width: 32,
        });
      }
    }
  }, [activeIndex, items.length]);

  return (
    <nav
      ref={navRef}
      className="fixed z-50 flex border-t border-border bg-card left-[var(--app-vv-left,0px)] w-[var(--app-vv-width,100%)] bottom-[var(--app-vv-bottom-gap,0px)] lg:hidden"
    >
      {/* Animated indicator */}
      {indicatorStyle && (
        <span
          className="nav-indicator absolute top-0 h-[2px] bg-primary rounded-full"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          aria-hidden="true"
        />
      )}

      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={item.key}
            data-nav-item
            onClick={() => navigate(item.path)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 pb-[env(safe-area-inset-bottom,4px)] pt-2 text-[11px] font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] active:scale-[0.97] active:transition-transform active:duration-[var(--duration-instant)] ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`flex size-6 items-center justify-center transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] ${
                isActive ? 'text-primary scale-110' : ''
              }`}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
