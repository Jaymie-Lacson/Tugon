import { useContext } from 'react';
import { TranslationContext, type TranslationContextValue } from './TranslationProvider';

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a <TranslationProvider>');
  }
  return ctx;
}
