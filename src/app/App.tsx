// Import the recharts CartesianGrid duplicate-key warning suppression first,
// before any chart component is mounted.
import './utils/rechartsWarningPatch';

import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import CardSkeleton from './components/ui/CardSkeleton';
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

export default function App() {
  return (
    <TranslationProvider>
      <Suspense
        fallback={<AppSkeletonFallback />}
      >
        <RouterProvider router={router} />
      </Suspense>
    </TranslationProvider>
  );
}