import React from 'react';
import { VerificationProgressCard } from './VerificationProgressCard';

interface CitizenPageLayoutProps {
  header: React.ReactNode;
  beforeMain?: React.ReactNode;
  children: React.ReactNode;
  afterMain?: React.ReactNode;
  hideVerificationPrompt?: boolean;
  mainOnClick?: () => void;
  mainOnScroll?: React.UIEventHandler<HTMLElement>;
  mobileShellMaxWidth?: number;
  desktopMainMaxWidth?: number;
  mobileMainPaddingX?: number;
  desktopMainPaddingX?: number;
  mobileMainPaddingBottom?: number;
  desktopMainPaddingBottom?: number;
  contentGutter?: number;
}

export function CitizenPageLayout({
  header,
  beforeMain,
  children,
  afterMain,
  hideVerificationPrompt = false,
  mainOnClick,
  mainOnScroll,
  mobileShellMaxWidth = 560,
  desktopMainMaxWidth = 1260,
  mobileMainPaddingX = 0,
  desktopMainPaddingX = 24,
  mobileMainPaddingBottom = 84,
  desktopMainPaddingBottom = 28,
  contentGutter = 16,
}: CitizenPageLayoutProps) {
  const cssVars = {
    '--citizen-mobile-shell-max': `${mobileShellMaxWidth}px`,
    '--citizen-desktop-main-max': `${desktopMainMaxWidth}px`,
    '--citizen-mobile-main-padding-x': `${mobileMainPaddingX}px`,
    '--citizen-desktop-main-padding-x': `${desktopMainPaddingX}px`,
    '--citizen-mobile-main-padding': `${mobileMainPaddingBottom}px`,
    '--citizen-desktop-main-padding': `${desktopMainPaddingBottom}px`,
    '--citizen-content-gutter': `${contentGutter}px`,
  } as React.CSSProperties;

  return (
    <div
      className="citizen-page-layout min-h-dvh bg-citizen-bg flex flex-col w-full font-['Roboto',sans-serif] relative tracking-[-0.004em]"
      style={cssVars}
    >
      {header}
      {beforeMain}
      {!hideVerificationPrompt && (
        <div className="citizen-content-shell w-full mx-auto py-3" style={{ maxWidth: 'var(--citizen-desktop-main-max)' }}>
          <VerificationProgressCard />
        </div>
      )}
      <main
        className="citizen-page-layout-main flex-1 overflow-y-auto w-full relative z-[1]"
        onClick={mainOnClick}
        onScroll={mainOnScroll}
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
            padding-left: var(--citizen-mobile-main-padding-x);
            padding-right: var(--citizen-mobile-main-padding-x);
            padding-bottom: var(--citizen-mobile-main-padding);
          }
          .citizen-web-header-inner,
          .citizen-web-strip-inner {
            width: 100%;
            max-width: var(--citizen-mobile-shell-max);
            margin: 0 auto;
          }
          .citizen-web-strip {
            padding-left: 16px;
            padding-right: 16px;
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
            padding-left: var(--citizen-desktop-main-padding-x);
            padding-right: var(--citizen-desktop-main-padding-x);
            padding-bottom: var(--citizen-desktop-main-padding);
          }
          .citizen-web-header-inner,
          .citizen-web-strip-inner {
            width: 100%;
            max-width: var(--citizen-desktop-main-max);
            margin: 0 auto;
          }
          .citizen-web-strip {
            padding-left: var(--citizen-content-gutter);
            padding-right: var(--citizen-content-gutter);
          }
          .citizen-only-desktop { display: block !important; }
          .citizen-only-mobile { display: none !important; }
        }

        .citizen-web-header {
          backdrop-filter: saturate(115%) blur(6px);
          -webkit-backdrop-filter: saturate(115%) blur(6px);
        }

        .citizen-web-strip {
          box-sizing: border-box;
        }

        .citizen-content-shell {
          padding-left: var(--citizen-content-gutter);
          padding-right: var(--citizen-content-gutter);
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
