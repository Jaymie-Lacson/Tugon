import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../i18n';
import { citizenNavDefs, type CitizenNavKey } from '../data/navigationConfig';
import { clearAuthSession, getAuthSession } from '../utils/authSession';

interface CitizenDesktopNavProps {
  activeKey: CitizenNavKey;
  onNavigate?: (key: CitizenNavKey) => boolean | void;
}

export function CitizenDesktopNav({ activeKey, onNavigate }: CitizenDesktopNavProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = getAuthSession();

  const fullName = session?.user.fullName?.trim() || 'Citizen';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const barangayLabel = session?.user.barangayCode
    ? `Barangay ${session.user.barangayCode}`
    : 'Tondo Cluster';

  const handleClick = (key: CitizenNavKey) => {
    const handled = onNavigate?.(key);
    if (handled) return;

    if (key === 'report') navigate('/citizen/report');
    else if (key === 'myreports') navigate('/citizen/my-reports');
    else if (key === 'map') navigate('/citizen?tab=map');
    else if (key === 'profile') navigate('/citizen?tab=profile');
    else navigate('/citizen');
  };

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Wordmark */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <img
          src="/tugon-wordmark-blue.svg"
          alt="TUGON"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Section label */}
      <div className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
        {t('nav.navigation')}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {citizenNavDefs.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item.key)}
              className={`mb-1.5 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] cursor-pointer border-none transition-colors ${
                isActive
                  ? 'bg-[var(--surface-container-high)] text-primary font-bold shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
                  : 'bg-transparent text-[var(--on-surface-variant)] font-medium hover:bg-[var(--surface-container)]'
              }`}
            >
              <Icon
                size={16}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-[var(--outline)]'}`}
              />
              <span className="whitespace-nowrap">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* User info footer — mirrors official sidebar footer */}
      <div className="shrink-0 border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[34px] shrink-0 items-center justify-center bg-[#0F172A] font-mono text-[13px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[var(--on-surface)]">{fullName}</div>
            <div className="text-[10px] text-[var(--outline)]">{barangayLabel}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={t('common.signOut')}
            title={t('common.signOut')}
            className="inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[var(--outline)] hover:text-[var(--error)] transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
