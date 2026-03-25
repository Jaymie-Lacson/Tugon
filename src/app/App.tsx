// Import the recharts CartesianGrid duplicate-key warning suppression first,
// before any chart component is mounted.
import './utils/rechartsWarningPatch';

import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  return (
    <Suspense fallback={<div className="app-route-loading">Loading page...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}