export type Locale = 'en' | 'fil';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fil'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fil: 'Filipino',
};

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'tugon-locale';

/**
 * Flat translation dictionary.
 * Keys use dot-separated namespaces: "auth.login.title", "citizen.dashboard.welcome", etc.
 * Values are plain strings. Use {{placeholder}} for interpolation.
 */
export type TranslationDictionary = Record<string, string>;
