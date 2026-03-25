// Import the recharts CartesianGrid duplicate-key warning suppression first,
// before any chart component is mounted.
import './utils/rechartsWarningPatch';

import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { OfficialPageInitialLoader } from './components/OfficialPageInitialLoader';
import { router } from './routes';

export default function App() {
  return (
    <Suspense
      fallback={<OfficialPageInitialLoader label="Loading TUGON" minHeight="100vh" />}
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}