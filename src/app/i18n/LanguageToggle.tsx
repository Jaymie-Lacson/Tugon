import { useTranslation } from './useTranslation';
import type { Locale } from './types';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from './types';

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-medium shadow-sm">
      {SUPPORTED_LOCALES.map((loc: Locale) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-3 py-1.5 transition-colors ${
            locale === loc
              ? 'bg-primary text-white'
              : 'text-slate-600 hover:bg-slate-50'
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
