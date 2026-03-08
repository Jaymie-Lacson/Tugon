import React from 'react';

interface CitizenPageLayoutProps {
  header: React.ReactNode;
  beforeMain?: React.ReactNode;
  children: React.ReactNode;
  afterMain?: React.ReactNode;
  mainOnClick?: () => void;
  mobileShellMaxWidth?: number;
  desktopMainMaxWidth?: number;
  mobileMainPaddingBottom?: number;
  desktopMainPaddingBottom?: number;
}

export function CitizenPageLayout({
  header,
  beforeMain,
  children,
  afterMain,
  mainOnClick,
  mobileShellMaxWidth = 520,
  desktopMainMaxWidth = 1180,
  mobileMainPaddingBottom = 80,
  desktopMainPaddingBottom = 24,
}: CitizenPageLayoutProps) {
  const cssVars = {
    '--citizen-mobile-shell-max': `${mobileShellMaxWidth}px`,
    '--citizen-desktop-main-max': `${desktopMainMaxWidth}px`,
    '--citizen-mobile-main-padding': `${mobileMainPaddingBottom}px`,
    '--citizen-desktop-main-padding': `${desktopMainPaddingBottom}px`,
  } as React.CSSProperties;

  return (
    <div
      className="citizen-page-layout"
      style={{
        minHeight: '100vh',
        background: '#F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        fontFamily: "'Roboto', sans-serif",
        position: 'relative',
        ...cssVars,
      }}
    >
      {header}
      {beforeMain}
      <main
        className="citizen-page-layout-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
        }}
        onClick={mainOnClick}
      >
        {children}
      </main>
      {afterMain}
      <style>{`
        @media (max-width: 900px) {
          .citizen-page-layout {
            max-width: var(--citizen-mobile-shell-max);
            margin: 0 auto;
          }
          .citizen-page-layout-main {
            max-width: var(--citizen-mobile-shell-max);
            margin: 0 auto;
            padding-bottom: var(--citizen-mobile-main-padding);
          }
          .citizen-only-desktop { display: none !important; }
          .citizen-only-mobile { display: block !important; }
        }

        @media (min-width: 901px) {
          .citizen-page-layout {
            max-width: none;
            margin: 0;
          }
          .citizen-page-layout-main {
            max-width: var(--citizen-desktop-main-max);
            margin: 0 auto;
            padding-bottom: var(--citizen-desktop-main-padding);
          }
          .citizen-only-desktop { display: block !important; }
          .citizen-only-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
