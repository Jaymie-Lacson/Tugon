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
import { RequireAuth, RequireRole } from './components/RequireAuth';
import { getAuthSession } from './utils/authSession';

function RedirectToApp() {
  const session = getAuthSession();
  if (!session) {
    return React.createElement(Navigate, { to: '/auth/login', replace: true });
  }

  if (session.user.role === 'CITIZEN') {
    return React.createElement(Navigate, { to: '/citizen', replace: true });
  }

  if (session.user.role === 'SUPER_ADMIN') {
    return React.createElement(Navigate, { to: '/superadmin', replace: true });
  }

  return React.createElement(Navigate, { to: '/app', replace: true });
}

function CitizenGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['CITIZEN'], fallbackPath: '/app' },
    React.createElement(CitizenDashboard),
  );
}

function CitizenReportGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['CITIZEN'], fallbackPath: '/app' },
    React.createElement(IncidentReport),
  );
}

function CitizenReportsGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['CITIZEN'], fallbackPath: '/app' },
    React.createElement(CitizenMyReports),
  );
}

function SuperAdminGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['SUPER_ADMIN'], fallbackPath: '/app' },
    React.createElement(SuperAdminLayout),
  );
}

function OfficialAppGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['OFFICIAL', 'SUPER_ADMIN'], fallbackPath: '/citizen' },
    React.createElement(Layout),
  );
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
  {
    path: '/citizen',
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenGuard),
      ),
  },
  {
    path: '/citizen/report',
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportGuard),
      ),
  },
  {
    path: '/citizen/my-reports',
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportsGuard),
      ),
  },

  // Super Admin Console
  {
    path: '/superadmin',
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(SuperAdminGuard),
      ),
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
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(OfficialAppGuard),
      ),
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