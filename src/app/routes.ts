import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Verify from './pages/auth/Verify';
import CreatePassword from './pages/auth/CreatePassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import CitizenDashboard from './pages/CitizenDashboard';
import IncidentReport from './pages/IncidentReport';
import CitizenMyReports from './pages/CitizenMyReports';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SAOverview from './pages/superadmin/SAOverview';
import SABarangayMap from './pages/superadmin/SABarangayMap';
import SAAnalytics from './pages/superadmin/SAAnalytics';
import SAUsers from './pages/superadmin/SAUsers';

function RedirectToApp() {
  return React.createElement(Navigate, { to: '/app', replace: true });
}

export const router = createBrowserRouter([
  // Public landing
  { path: '/', Component: Landing },

  // Auth screens
  { path: '/auth/login', Component: Login },
  { path: '/auth/register', Component: Register },
  { path: '/auth/verify', Component: Verify },
  { path: '/auth/create-password', Component: CreatePassword },
  { path: '/auth/forgot-password', Component: ForgotPassword },

  // Citizen portal
  { path: '/citizen', Component: CitizenDashboard },
  { path: '/citizen/report', Component: IncidentReport },
  { path: '/citizen/my-reports', Component: CitizenMyReports },

  // Super Admin Console
  {
    path: '/superadmin',
    Component: SuperAdminLayout,
    children: [
      { index: true, Component: SAOverview },
      { path: 'map', Component: SABarangayMap },
      { path: 'analytics', Component: SAAnalytics },
      { path: 'users', Component: SAUsers },
    ],
  },

  // Protected app (dashboard + sub-pages)
  {
    path: '/app',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'incidents', Component: Incidents },
      { path: 'map', Component: MapView },
      { path: 'analytics', Component: Analytics },
      { path: 'reports', Component: Reports },
      { path: 'settings', Component: Settings },
    ],
  },

  // Catch-all: redirect any unmatched URL to /app
  { path: '*', Component: RedirectToApp },
]);