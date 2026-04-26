import { useTranslation } from './useTranslation';
import type { Locale } from './types';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from './types';

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { locale, setLocale } = useTranslation();

  const containerClassName = compact
    ? 'inline-flex overflow-hidden rounded-md border border-[var(--outline-variant)]/55 bg-[var(--surface-container-lowest)] text-[10px] font-semibold'
    : 'inline-flex overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-medium shadow-sm';

  const buttonBaseClassName = compact
    ? 'min-w-9 px-2 py-1 transition-colors'
    : 'px-3 py-1.5 transition-colors';

  const activeClassName = compact
    ? 'bg-primary text-[var(--primary-foreground)]'
    : 'bg-primary text-[var(--primary-foreground)]';

  const inactiveClassName = compact
    ? 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
    : 'text-slate-600 hover:bg-slate-50';

  return (
    <div className={containerClassName}>
      {SUPPORTED_LOCALES.map((loc: Locale) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`${buttonBaseClassName} ${
            locale === loc
              ? activeClassName
              : inactiveClassName
          }`}
          aria-current={locale === loc ? 'true' : undefined}
          aria-label={`Switch language to ${LOCALE_LABELS[loc]}`}
        >
          {loc === 'en' ? 'EN' : 'FIL'}
        </button>
      ))}
    </div>
  );
}
