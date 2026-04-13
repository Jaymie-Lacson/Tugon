import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import AppRouteErrorPage from './components/AppRouteErrorPage';
import { RequireAuth, RequireRole } from './components/RequireAuth';
import { getAuthSession } from './utils/authSession';
import { resolveDefaultAppPath } from './utils/navigationGuards';

type RouteModule = {
  default: React.ComponentType;
};

function lazyRoute(importModule: () => Promise<RouteModule>) {
  const LazyComponent = React.lazy(importModule);

  return function LazyRouteComponent() {
    return React.createElement(LazyComponent);
  };
}

const Layout = lazyRoute(() => import('./components/Layout'));
const Landing = lazyRoute(() => import('./pages/Landing'));
const Dashboard = lazyRoute(() => import('./pages/Dashboard'));
const Incidents = lazyRoute(() => import('./pages/Incidents'));
const MapView = lazyRoute(() => import('./pages/MapView'));
const Analytics = lazyRoute(() => import('./pages/Analytics'));
const Reports = lazyRoute(() => import('./pages/Reports'));
const Settings = lazyRoute(() => import('./pages/Settings'));
const Login = lazyRoute(() => import('./pages/auth/Login'));
const Register = lazyRoute(() => import('./pages/auth/Register'));
const Verify = lazyRoute(() => import('./pages/auth/Verify'));
const CreatePassword = lazyRoute(() => import('./pages/auth/CreatePassword'));
const ForgotPassword = lazyRoute(() => import('./pages/auth/ForgotPassword'));
const CitizenDashboard = lazyRoute(() => import('./pages/CitizenDashboard'));
const CitizenVerification = lazyRoute(() => import('./pages/CitizenVerification'));
const IncidentReport = lazyRoute(() => import('./pages/IncidentReport'));
const CitizenMyReports = lazyRoute(() => import('./pages/CitizenMyReports'));
const SkeletonDemo = lazyRoute(() => import('./pages/SkeletonDemo'));
const Verifications = lazyRoute(() => import('./pages/Verifications'));
const SuperAdminLayout = lazyRoute(() => import('./pages/superadmin/SuperAdminLayout'));
const SAOverview = lazyRoute(() => import('./pages/superadmin/SAOverview'));
const SABarangayMap = lazyRoute(() => import('./pages/superadmin/SABarangayMap'));
const SAAnalytics = lazyRoute(() => import('./pages/superadmin/SAAnalytics'));
const SAUsers = lazyRoute(() => import('./pages/superadmin/SAUsers'));
const SAAuditLogs = lazyRoute(() => import('./pages/superadmin/SAAuditLogs'));
const SASettings = lazyRoute(() => import('./pages/Settings'));

// Landing uses CSS isolation (.dark .landing-root overrides) instead of a nested ThemeProvider.
function LandingLightOnly() {
  return React.createElement(Landing);
}

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
  // Public landing — always light-mode (LandingLightOnly forces theme)
  { path: '/', Component: LandingLightOnly, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/community-map', Component: MapView, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/skeleton-demo', Component: SkeletonDemo, errorElement: React.createElement(AppRouteErrorPage) },

  // Auth screens
  { path: '/auth/login', Component: Login, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/auth/register', Component: Register, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/auth/verify', Component: Verify, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/auth/create-password', Component: CreatePassword, errorElement: React.createElement(AppRouteErrorPage) },
  { path: '/auth/forgot-password', Component: ForgotPassword, errorElement: React.createElement(AppRouteErrorPage) },

  // Citizen portal
  {
    path: '/citizen',
    errorElement: React.createElement(AppRouteErrorPage),
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenGuard),
      ),
  },
  {
    path: '/citizen/report',
    errorElement: React.createElement(AppRouteErrorPage),
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportGuard),
      ),
  },
  {
    path: '/citizen/my-reports',
    errorElement: React.createElement(AppRouteErrorPage),
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportsGuard),
      ),
  },
  {
    path: '/citizen/verification',
    errorElement: React.createElement(AppRouteErrorPage),
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
    errorElement: React.createElement(AppRouteErrorPage),
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
      { path: 'settings', Component: SASettings },
    ],
  },

  // Protected app (dashboard + sub-pages)
  {
    path: '/app',
    errorElement: React.createElement(AppRouteErrorPage),
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
  { path: '*', Component: RedirectToApp, errorElement: React.createElement(AppRouteErrorPage) },
]);