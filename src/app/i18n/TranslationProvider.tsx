import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale, TranslationDictionary } from './types';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from './types';
import { en } from './translations/en';
import { fil } from './translations/fil';

const dictionaries: Record<Locale, TranslationDictionary> = { en, fil };

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
      let value = dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE]?.[key] ?? key;

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
