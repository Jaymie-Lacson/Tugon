import React from 'react';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../i18n';
import { citizenNavDefs, type CitizenNavKey } from '../data/navigationConfig';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { clearAuthSession, getAuthSession } from '../utils/authSession';

interface CitizenDesktopNavProps {
  activeKey: CitizenNavKey;
  onNavigate?: (key: CitizenNavKey) => boolean | void;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function CitizenDesktopNav({ activeKey, onNavigate, collapsed = false, onToggleSidebar }: CitizenDesktopNavProps) {
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
      <div className={collapsed ? 'overflow-x-hidden px-3 pb-3 pt-4' : 'overflow-x-hidden px-5 pb-5 pt-6'}>
        {collapsed ? (
          <div className="flex items-center justify-center">
            <img
              src="/favicon.svg"
              alt="TUGON"
              className="h-9 w-9 object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-start overflow-x-hidden">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--outline-variant)]/45 bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
            >
              <ChevronsLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4 pb-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="Expand sidebar"
                className="mb-1.5 flex w-full cursor-pointer items-center justify-center rounded-xl border-none bg-transparent px-2 py-2.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
              >
                <ChevronsRight size={16} className="shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : null}

        {citizenNavDefs.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const label = t(item.labelKey);

          const linkClass = `mb-1.5 flex w-full cursor-pointer items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2.5 text-[14px] transition-colors ${
            isActive
              ? 'bg-[var(--surface-container-high)] text-primary font-bold shadow-[inset_0_0_0_1px_rgba(0,35,111,0.08)]'
              : 'bg-transparent text-[var(--on-surface-variant)] font-medium hover:bg-[var(--surface-container)]'
          }`;

          const linkInner = (
            <>
              <Icon
                size={16}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-[var(--outline)]'}`}
              />
              {!collapsed ? <span className="whitespace-nowrap">{label}</span> : null}
            </>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleClick(item.key)}
                    className={linkClass}
                  >
                    {linkInner}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item.key)}
              className={linkClass}
            >
              {linkInner}
            </button>
          );
        })}

        {/* Section label */}
        {!collapsed ? (
          <div className="px-1 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--outline)]">
            {t('nav.navigation')}
          </div>
        ) : null}
      </nav>

      {/* User info footer — mirrors official sidebar footer */}
      <div className={`shrink-0 overflow-x-hidden border-t border-[var(--outline-variant)]/35 bg-[var(--surface-container-lowest)] ${collapsed ? 'px-2' : 'px-4'} py-3`}>
        <div className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-bold text-[var(--primary-foreground)]">
                  {initials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{fullName} · {barangayLabel}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-[var(--primary-foreground)]">
              {initials}
            </div>
          )}
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-[var(--on-surface)]">{fullName}</div>
                <div className="truncate text-[9px] leading-tight text-[var(--outline)]">{barangayLabel}</div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label={t('common.signOut')}
                title={t('common.signOut')}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-0 text-[var(--outline)] transition-colors hover:text-[var(--error)]"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
