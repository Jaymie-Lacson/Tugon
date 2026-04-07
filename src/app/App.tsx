// Import the recharts CartesianGrid duplicate-key warning suppression first,
// before any chart component is mounted.
import './utils/rechartsWarningPatch';

import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { clearCache, setLocale } from '@chenglou/pretext';
import CardSkeleton from './components/ui/CardSkeleton';
import PretextAutoTextBridge from './components/PretextAutoTextBridge';
import TableSkeleton from './components/ui/TableSkeleton';
import TextSkeleton from './components/ui/TextSkeleton';
import { TranslationProvider } from './i18n';
import { router } from './routes';

function AppSkeletonFallback() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <TextSkeleton rows={2} title={false} className="rounded-xl" />
      <CardSkeleton
        count={4}
        lines={2}
        showImage={false}
        gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      />
      <TableSkeleton rows={7} columns={4} showHeader />
    </main>
  );
}

function ViewportCompatibilityBridge() {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const syncViewportVars = () => {
      const topOffset = Math.max(0, viewport.offsetTop || 0);
      const leftOffset = Math.max(0, viewport.offsetLeft || 0);
      const viewportWidth = Math.max(0, viewport.width || window.innerWidth);
      const visibleBottom = topOffset + Math.max(0, viewport.height || window.innerHeight);
      const bottomGap = Math.max(0, window.innerHeight - visibleBottom);

      document.documentElement.style.setProperty('--app-vv-top', `${topOffset}px`);
      document.documentElement.style.setProperty('--app-vv-left', `${leftOffset}px`);
      document.documentElement.style.setProperty('--app-vv-width', `${viewportWidth}px`);
      document.documentElement.style.setProperty('--app-vv-bottom-gap', `${bottomGap}px`);
    };

    syncViewportVars();
    viewport.addEventListener('resize', syncViewportVars);
    viewport.addEventListener('scroll', syncViewportVars);
    window.addEventListener('orientationchange', syncViewportVars);

    return () => {
      viewport.removeEventListener('resize', syncViewportVars);
      viewport.removeEventListener('scroll', syncViewportVars);
      window.removeEventListener('orientationchange', syncViewportVars);
      document.documentElement.style.removeProperty('--app-vv-top');
      document.documentElement.style.removeProperty('--app-vv-left');
      document.documentElement.style.removeProperty('--app-vv-width');
      document.documentElement.style.removeProperty('--app-vv-bottom-gap');
    };
  }, []);

  return null;
}

function PretextRuntimeBridge() {
  useEffect(() => {
    // Keep Pretext measurement locale aligned with the current browser locale.
    const locale = navigator.language?.trim();
    setLocale(locale || undefined);

    return () => {
      clearCache();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <TranslationProvider>
      <PretextRuntimeBridge />
      <PretextAutoTextBridge />
      <ViewportCompatibilityBridge />
      <Suspense
        fallback={<AppSkeletonFallback />}
      >
        <RouterProvider router={router} />
      </Suspense>
    </TranslationProvider>
  );
}
