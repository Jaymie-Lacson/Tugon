import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import { citizenNavDefs, type CitizenNavKey } from '../data/navigationConfig';

export type { CitizenNavKey } from '../data/navigationConfig';

interface CitizenMobileMenuProps {
  activeKey: CitizenNavKey;
  onNavigate: (key: CitizenNavKey) => void;
}

export function CitizenMobileMenu({ activeKey, onNavigate }: CitizenMobileMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleSelect = (key: CitizenNavKey) => {
    setOpen(false);
    onNavigate(key);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className={`citizen-mobile-hamburger relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/20 bg-white/[0.12] text-white transition-[background,transform] duration-150 ease-out${open ? ' scale-[0.97] !bg-white/25' : ''}`}
      >
        <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
          {open ? <X size={18} /> : <Menu size={18} />}
        </span>
      </button>

      <div
        className="citizen-mobile-nav-panel nav-mobile-panel fixed inset-x-0 top-[60px] z-[95] overflow-hidden border-t border-white/[0.08] bg-[rgba(15,23,42,0.98)]"
        aria-hidden={!open}
        style={{
          padding: open ? '12px 20px 20px' : '0 20px',
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-10px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'max-height 320ms cubic-bezier(0.2,0.65,0.3,1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
        }}
      >
        {citizenNavDefs.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={`citizen-nav-${item.key}`}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`flex w-full cursor-pointer items-center gap-3 border-none border-b border-white/[0.06] bg-transparent px-0 py-3 text-left text-[15px] font-semibold ${
                isActive ? 'text-white' : 'text-white/[0.7]'
              }`}
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <Icon size={16} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 901px) {
          .citizen-mobile-hamburger { display: none !important; }
          .citizen-mobile-nav-panel { display: none !important; }
        }
        .citizen-mobile-nav-panel > *:nth-child(1) { transition-delay: 40ms; }
        .citizen-mobile-nav-panel > *:nth-child(2) { transition-delay: 80ms; }
        .citizen-mobile-nav-panel > *:nth-child(3) { transition-delay: 120ms; }
        .citizen-mobile-nav-panel > *:nth-child(4) { transition-delay: 160ms; }
        .citizen-mobile-nav-panel > *:nth-child(5) { transition-delay: 200ms; }
        .citizen-mobile-nav-panel > *:nth-child(6) { transition-delay: 240ms; }
        @media (prefers-reduced-motion: reduce) {
          .citizen-mobile-nav-panel, .citizen-mobile-nav-panel > * { transition: none !important; }
        }
      `}</style>
    </>
  );
}
