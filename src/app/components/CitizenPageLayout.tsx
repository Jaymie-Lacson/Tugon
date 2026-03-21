import React from 'react';
import { getAuthSession } from '../utils/authSession';

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

function getCitizenVerificationPrompt() {
  const session = getAuthSession();
  if (!session || session.user.role !== 'CITIZEN') {
    return null;
  }

  if (session.user.isVerified || session.user.isBanned) {
    return null;
  }

  const status = session.user.verificationStatus;
  if (status === 'PENDING') {
    return {
      title: 'Verification submitted',
      description: 'Your resident ID is under review. You can track your status anytime in your profile.',
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#92400E',
      ctaLabel: 'View verification status',
    };
  }

  if (status === 'REJECTED' || status === 'REUPLOAD_REQUESTED') {
    const reason = session.user.verificationRejectionReason
      ? ` Reason: ${session.user.verificationRejectionReason}`
      : '';
    return {
      title: 'Action needed: re-upload your ID',
      description: `Your verification requires an updated ID image.${reason}`,
      bg: '#FEF2F2',
      border: '#FECACA',
      color: '#B91C1C',
      ctaLabel: 'Re-upload ID now',
    };
  }

  return {
    title: 'Verify your account',
    description: 'Submit one valid ID photo so officials can verify your account.',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    color: '#1E3A8A',
    ctaLabel: 'Start ID verification',
  };
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
  const verificationPrompt = getCitizenVerificationPrompt();
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
      className="citizen-page-layout"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 380px at 20% -15%, rgba(30,58,138,0.14), transparent 65%), radial-gradient(900px 320px at 100% 0%, rgba(185,28,28,0.1), transparent 60%), #F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        fontFamily: "'Roboto', sans-serif",
        position: 'relative',
        ...cssVars,
      }}
    >
      {header}
      {verificationPrompt && !hideVerificationPrompt ? (
        <section
          style={{
            background: verificationPrompt.bg,
            borderBottom: `1px solid ${verificationPrompt.border}`,
            padding: '10px var(--citizen-content-gutter)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 'var(--citizen-desktop-main-max)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: verificationPrompt.color }}>
                {verificationPrompt.title}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                {verificationPrompt.description}
              </div>
            </div>
            <a
              href="/citizen/verification"
              style={{
                textDecoration: 'none',
                color: verificationPrompt.color,
                fontWeight: 700,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {verificationPrompt.ctaLabel}
            </a>
          </div>
        </section>
      ) : null}
      {beforeMain}
      <main
        className="citizen-page-layout-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
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
          backdrop-filter: saturate(135%) blur(10px);
          -webkit-backdrop-filter: saturate(135%) blur(10px);
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
