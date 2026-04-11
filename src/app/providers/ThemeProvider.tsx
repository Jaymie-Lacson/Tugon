import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function TugonThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="tugon-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
