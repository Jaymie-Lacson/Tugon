import React from 'react';
import { createBrowserRouter, matchRoutes, type RouteObject } from 'react-router';
import AppRouteErrorPage from './components/AppRouteErrorPage';
import { RequireAuth, RequireRole } from './components/RequireAuth';

type RouteModule = {
  default: React.ComponentType;
};

function lazyRoute(importModule: () => Promise<RouteModule>) {
  const LazyComponent = React.lazy(importModule);

  return function LazyRouteComponent() {
    return React.createElement(LazyComponent);
  };
}

function lazyComponent(importModule: () => Promise<RouteModule>) {
  return async () => {
    const m = await importModule();
    return { Component: m.default };
  };
}

// Lazy wrappers retained for routes used inside an auth/role guard. The guard
// wraps the lazy element, which keeps Component: as the activation point.
const Layout = lazyRoute(() => import('./components/Layout'));
const Dashboard = lazyRoute(() => import('./pages/Dashboard'));
const Incidents = lazyRoute(() => import('./pages/Incidents'));
const MapView = lazyRoute(() => import('./pages/MapView'));
const Analytics = lazyRoute(() => import('./pages/Analytics'));
const Reports = lazyRoute(() => import('./pages/Reports'));
const Settings = lazyRoute(() => import('./pages/Settings'));
const CitizenDashboard = lazyRoute(() => import('./pages/CitizenDashboard'));
const CitizenVerification = lazyRoute(() => import('./pages/CitizenVerification'));
const IncidentReport = lazyRoute(() => import('./pages/IncidentReport'));
const CitizenMyReports = lazyRoute(() => import('./pages/CitizenMyReports'));
const CitizenSettings = lazyRoute(() => import('./pages/CitizenSettings'));
const Verifications = lazyRoute(() => import('./pages/Verifications'));
const SuperAdminLayout = lazyRoute(() => import('./pages/superadmin/SuperAdminLayout'));
const SAOverview = lazyRoute(() => import('./pages/superadmin/SAOverview'));
const SABarangayMap = lazyRoute(() => import('./pages/superadmin/SABarangayMap'));
const SAAnalytics = lazyRoute(() => import('./pages/superadmin/SAAnalytics'));
const SAUsers = lazyRoute(() => import('./pages/superadmin/SAUsers'));
const SAAuditLogs = lazyRoute(() => import('./pages/superadmin/SAAuditLogs'));
const SASettings = lazyRoute(() => import('./pages/Settings'));

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

function CitizenSettingsGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['CITIZEN'], fallbackPath: '/app' },
    React.createElement(CitizenSettings),
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

const errorElement = React.createElement(AppRouteErrorPage);

// Non-guarded routes use `lazy:` so preloadMatchedRoutes() can resolve the
// matched module before hydrateRoot runs — making the prerendered DOM match
// the React tree at first sync render.
const routes: RouteObject[] = [
  { path: '/', lazy: lazyComponent(() => import('./pages/Landing')), errorElement },
  { path: '/community-map', lazy: lazyComponent(() => import('./pages/MapView')), errorElement },
  { path: '/skeleton-demo', lazy: lazyComponent(() => import('./pages/SkeletonDemo')), errorElement },
  { path: '/privacy', lazy: lazyComponent(() => import('./pages/Privacy')), errorElement },
  { path: '/terms', lazy: lazyComponent(() => import('./pages/Terms')), errorElement },
  { path: '/contact', lazy: lazyComponent(() => import('./pages/Contact')), errorElement },
  { path: '/emergency', lazy: lazyComponent(() => import('./pages/Emergency')), errorElement },

  { path: '/auth/login', lazy: lazyComponent(() => import('./pages/auth/Login')), errorElement },
  { path: '/auth/register', lazy: lazyComponent(() => import('./pages/auth/Register')), errorElement },
  { path: '/auth/verify', lazy: lazyComponent(() => import('./pages/auth/Verify')), errorElement },
  { path: '/auth/create-password', lazy: lazyComponent(() => import('./pages/auth/CreatePassword')), errorElement },
  { path: '/auth/forgot-password', lazy: lazyComponent(() => import('./pages/auth/ForgotPassword')), errorElement },

  // Citizen portal — auth-wrapped, uses Component: pattern
  {
    path: '/citizen',
    errorElement,
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenGuard),
      ),
  },
  {
    path: '/citizen/report',
    errorElement,
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportGuard),
      ),
  },
  {
    path: '/citizen/my-reports',
    errorElement,
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenReportsGuard),
      ),
  },
  {
    path: '/citizen/verification',
    errorElement,
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
  {
    path: '/citizen/settings',
    errorElement,
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenSettingsGuard),
      ),
  },

  // Super Admin Console
  {
    path: '/superadmin',
    errorElement,
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
    errorElement,
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

  // Catch-all 404
  { path: '*', lazy: lazyComponent(() => import('./pages/NotFound')), errorElement },
];

type LazyRouteObject = RouteObject & {
  lazy?: () => Promise<{ Component: React.ComponentType }>;
};

// Resolve any lazy() factories on the routes that match `pathname` and pin the
// resulting Component directly onto the route. After this returns, those
// matched routes render synchronously — so hydrateRoot can match the
// prerendered DOM without tripping on a Suspense fallback.
export async function preloadMatchedRoutes(pathname: string) {
  const matches = matchRoutes(routes, pathname);
  if (!matches) return;
  for (const m of matches) {
    const route = m.route as LazyRouteObject;
    if (route.lazy && !route.Component) {
      const result = await route.lazy();
      route.Component = result.Component;
      delete route.lazy;
    }
  }
}

let _router: ReturnType<typeof createBrowserRouter> | null = null;

export function getRouter() {
  if (!_router) {
    _router = createBrowserRouter(routes);
  }
  return _router;
}
