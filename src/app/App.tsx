// Import the recharts CartesianGrid duplicate-key warning suppression first,
// before any chart component is mounted.
import './utils/rechartsWarningPatch';

import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}