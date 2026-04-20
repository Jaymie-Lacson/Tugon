import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale, TranslationDictionary } from './types';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from './types';
import { en } from './translations/en';

// DEFAULT_LOCALE is bundled eagerly so it is always available as the final
// fallback in `t()`. Non-default locales are fetched on demand, keeping the
// initial JS payload smaller for users who never switch language.
const loadedDictionaries: Partial<Record<Locale, TranslationDictionary>> = { en };

const dictionaryLoaders: Record<Locale, () => Promise<TranslationDictionary>> = {
  en: async () => en,
  fil: async () => (await import('./translations/fil')).fil,
};

export interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const TranslationContext = createContext<TranslationContextValue | null>(null);

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch {
    // localStorage unavailable (SSR, privacy mode)
  }
  return DEFAULT_LOCALE;
}

interface TranslationProviderProps {
  children: React.ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  // Bumped whenever a lazy-loaded dictionary finishes fetching, so `t()`
  // re-resolves with the newly available translations.
  const [, setLoadedRevision] = useState(0);

  useEffect(() => {
    if (loadedDictionaries[locale]) {
      return;
    }

    let cancelled = false;
    dictionaryLoaders[locale]()
      .then((dict) => {
        if (cancelled) return;
        loadedDictionaries[locale] = dict;
        setLoadedRevision((n) => n + 1);
      })
      .catch(() => {
        // Non-fatal: t() will fall back to DEFAULT_LOCALE until resolved.
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value =
        loadedDictionaries[locale]?.[key] ??
        loadedDictionaries[DEFAULT_LOCALE]?.[key] ??
        key;

      if (params) {
        for (const [param, replacement] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(replacement));
        }
      }

      return value;
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}
