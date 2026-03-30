import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../i18n';
import { citizenNavDefs, type CitizenNavKey } from '../data/navigationConfig';

export type { CitizenNavKey } from '../data/navigationConfig';

interface CitizenMobileMenuProps {
  activeKey: CitizenNavKey;
  onNavigate: (key: CitizenNavKey) => void;
}

export function CitizenMobileMenu({ activeKey, onNavigate }: CitizenMobileMenuProps) {
  const { t } = useTranslation();

  const mobileTabs = citizenNavDefs.filter((item) => item.key !== 'report');
  const showStickyReportAction = activeKey !== 'report';

  return (
    <>
      <div className="citizen-only-mobile fixed left-0 right-0 top-[60px] z-[80] border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[560px] items-center gap-2 overflow-x-auto px-4 py-2.5">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={`mobile-top-tab-${item.key}`}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-300 bg-[#F8FBFF] text-primary'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Icon size={14} />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {showStickyReportAction ? (
        <button
          type="button"
          onClick={() => onNavigate('report')}
          className="citizen-only-mobile fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] right-4 z-[85] inline-flex min-h-11 items-center gap-2 rounded-full border-none bg-severity-critical px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(185,28,28,0.35)]"
          aria-label={t('nav.report')}
        >
          <Plus size={14} />
          {t('nav.report')}
        </button>
      ) : null}

      <style>{`
        @media (max-width: 900px) {
          .citizen-page-layout-main {
            padding-top: 60px;
          }
        }
      `}</style>
    </>
  );
}
