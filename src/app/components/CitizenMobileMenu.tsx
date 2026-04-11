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
  const panelItemMotionClass = open
    ? 'opacity-100 translate-y-0'
    : 'pointer-events-none opacity-0 -translate-y-1.5';

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
      {open ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Close menu"
          aria-expanded="true"
          aria-controls="citizen-mobile-nav-panel"
          className="citizen-mobile-hamburger relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/20 text-white transition-[background,transform] duration-150 ease-out scale-[0.97] !bg-white/25"
        >
          <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
            <X size={18} />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded="false"
          aria-controls="citizen-mobile-nav-panel"
          className="citizen-mobile-hamburger relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/20 bg-white/[0.12] text-white transition-[background,transform] duration-150 ease-out"
        >
          <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
            <Menu size={18} />
          </span>
        </button>
      )}

      <div
        id="citizen-mobile-nav-panel"
        className={`citizen-mobile-nav-panel nav-mobile-panel fixed inset-x-0 z-[95] overflow-hidden border-t border-white/[0.12] bg-[var(--citizen-header-bg)] transition-[max-height,opacity,transform,padding] duration-[320ms,220ms,220ms,220ms] ease-[cubic-bezier(0.2,0.65,0.3,1),ease,ease,ease] ${
          open
            ? 'is-open pointer-events-auto max-h-[500px] translate-y-0 px-5 pt-2 pb-0 opacity-100'
            : 'pointer-events-none max-h-0 -translate-y-2.5 px-5 py-0 opacity-0'
        }`}
      >
        {citizenNavDefs.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={`citizen-nav-${item.key}`}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`flex w-full cursor-pointer items-center gap-3 border-none border-b border-white/[0.16] px-3 py-3 text-left text-[15px] font-semibold transition-colors ${
                isActive ? 'bg-primary text-white' : 'bg-transparent text-white/[0.82]'
              } ${panelItemMotionClass} transition-[opacity,transform] duration-[180ms] ease-out`}
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
        .citizen-mobile-nav-panel {
          top: calc(var(--app-vv-top, 0px) + 60px);
        }
        .citizen-mobile-nav-panel.is-open {
          padding-bottom: max(10px, env(safe-area-inset-bottom));
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
