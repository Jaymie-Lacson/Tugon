import React from 'react';

interface OfficialPageInitialLoaderProps {
  label?: string;
  minHeight?: string;
}

export function OfficialPageInitialLoader({
  label = 'Loading official page',
  minHeight = 'calc(100vh - 130px)',
}: OfficialPageInitialLoaderProps) {
  return (
    <div
      style={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="official-page-loader" role="status" aria-label={label}>
        <span className="official-page-loader-ring" aria-hidden="true" />
        <img src="/favicon.svg" alt="TUGON" className="official-page-loader-logo" />
      </div>
      <style>{`
        .official-page-loader {
          width: 108px;
          height: 108px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .official-page-loader-ring {
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          border: 4px solid rgba(30, 58, 138, 0.16);
          border-top-color: var(--severity-critical);
          border-right-color: var(--primary);
          animation: officialPageLoaderSpin 0.9s linear infinite;
        }

        .official-page-loader-logo {
          width: 42px;
          height: 42px;
          display: block;
          filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.15));
        }

        @keyframes officialPageLoaderSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
