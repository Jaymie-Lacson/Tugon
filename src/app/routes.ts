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
import CitizenVerification from './pages/CitizenVerification';
import IncidentReport from './pages/IncidentReport';
import CitizenMyReports from './pages/CitizenMyReports';
import Verifications from './pages/Verifications';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SAOverview from './pages/superadmin/SAOverview';
import SABarangayMap from './pages/superadmin/SABarangayMap';
import SAAnalytics from './pages/superadmin/SAAnalytics';
import SAUsers from './pages/superadmin/SAUsers';
import SAAuditLogs from './pages/superadmin/SAAuditLogs';
import { RequireAuth, RequireRole } from './components/RequireAuth';
import { getAuthSession } from './utils/authSession';
import { resolveDefaultAppPath } from './utils/navigationGuards';

function RedirectToApp() {
  const session = getAuthSession();
  return React.createElement(Navigate, { to: resolveDefaultAppPath(session), replace: true });
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
  { path: '/community-map', Component: MapView },

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
  {
    path: '/citizen/verification',
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(
          RequireRole,
          { roles: ['CITIZEN'], fallbackPath: '/app' },
          React.createElement(CitizenVerification),
        ),
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
      { path: 'audit-logs', Component: SAAuditLogs },
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
      {
        path: 'verifications',
        Component: () =>
          React.createElement(
            RequireRole,
            { roles: ['OFFICIAL'], fallbackPath: '/superadmin' },
            React.createElement(Verifications),
          ),
      },
      { path: 'settings', Component: Settings },
    ],
  },

  // Catch-all: redirect any unmatched URL to /app
  { path: '*', Component: RedirectToApp },
]);