import React from 'react';
import { VerificationProgressCard, hasVerificationProgressPrompt } from './VerificationProgressCard';
import { CitizenOnboardingModal } from './CitizenOnboardingModal';
import { useImmersiveThemeColor } from '../hooks/useImmersiveThemeColor';

interface CitizenPageLayoutProps {
  header: React.ReactNode;
  /** Left sidebar rendered on desktop (lg+). Typically CitizenDesktopNav. */
  sidebar?: React.ReactNode;
  /** Full-width content rendered above the main scroll area (e.g. alert banners, step indicators). */
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
  sidebar,
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
  mobileMainPaddingBottom = 20,
  desktopMainPaddingBottom = 28,
  contentGutter = 16,
}: CitizenPageLayoutProps) {
  useImmersiveThemeColor('#00236f');

  const showVerificationPrompt = !hideVerificationPrompt && hasVerificationProgressPrompt();

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
      className={`citizen-page-layout app-shell-height bg-citizen-bg flex flex-col w-full relative tracking-[-0.004em]${sidebar ? ' citizen-has-sidebar' : ''}`}
      style={cssVars}
    >
      {/* Sticky top header (full width) */}
      {header}

      {/* Body: sidebar + content column */}
      <div className="citizen-body flex-1 flex overflow-hidden min-h-0">

        {/* Left sidebar — desktop only (lg+) */}
        {sidebar && (
          <aside className="citizen-sidebar hidden lg:flex flex-col w-[240px] shrink-0 border-r border-[var(--outline-variant)]/25 bg-[var(--surface-container-low)] overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Right content column */}
        <div className="citizen-content-col flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Full-width banners / step indicators above the scroll area */}
          {beforeMain}

          {/* Verification progress card */}
          {showVerificationPrompt && (
            <div className="citizen-content-shell citizen-verification-shell w-full py-3">
              <VerificationProgressCard />
            </div>
          )}

          {/* Scrollable main content */}
          <main
            className="citizen-page-layout-main flex-1 overflow-y-auto w-full relative z-[1]"
            onClick={mainOnClick}
            onScroll={mainOnScroll}
          >
            {children}
          </main>

          {afterMain}
        </div>
      </div>
      <CitizenOnboardingModal />

      <style>{`
        /* ── Mobile (≤ 900px) ─────────────────────────────────────────── */
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
          .citizen-only-mobile  { display: block !important; }
        }

        /* ── Desktop (≥ 901px) without sidebar ───────────────────────── */
        @media (min-width: 901px) {
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
          .citizen-only-mobile  { display: none !important;  }
        }

        /* ── Desktop WITH sidebar: remove centering, fill available width ─ */
        @media (min-width: 901px) {
          .citizen-has-sidebar .citizen-page-layout-main {
            max-width: none !important;
            margin: 0 !important;
            padding-left: 16px;
            padding-right: 16px;
            padding-bottom: var(--citizen-desktop-main-padding);
          }
          .citizen-has-sidebar .citizen-content-shell {
            max-width: none !important;
          }
          .citizen-has-sidebar .citizen-verification-shell {
            max-width: none !important;
          }
          .citizen-has-sidebar .citizen-web-header-inner {
            max-width: none !important;
            padding-left: var(--citizen-content-gutter);
            padding-right: var(--citizen-content-gutter);
          }
        }

        /* ── Shared ────────────────────────────────────────────────────── */
        .citizen-web-header {
          top: var(--app-vv-top, 0px);
          -webkit-backdrop-filter: saturate(115%) blur(6px);
          backdrop-filter: saturate(115%) blur(6px);
        }
        .citizen-web-strip { box-sizing: border-box; }
        .citizen-content-shell {
          padding-left: var(--citizen-content-gutter);
          padding-right: var(--citizen-content-gutter);
          box-sizing: border-box;
        }
        .citizen-verification-shell,
        .citizen-web-header-inner {
          max-width: var(--citizen-desktop-main-max);
        }
        .citizen-web-header-inner {
          padding-left: var(--citizen-content-gutter);
          padding-right: var(--citizen-content-gutter);
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
