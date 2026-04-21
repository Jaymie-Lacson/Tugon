
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppErrorBoundary } from './app/components/AppErrorBoundary.tsx';
import { TugonThemeProvider } from './app/providers/ThemeProvider.tsx';
import { authApi } from './app/services/authApi';
import { clearAuthSession, saveAuthSession } from './app/utils/authSession';
import { initWebVitals } from './app/utils/webVitals.ts';
import './styles/index.css';

const AUTH_SESSION_KEY = 'tugon.auth.session';
const PROTECTED_ROUTE_PREFIXES = ['/app', '/citizen', '/superadmin'] as const;

function hasValidSession(): boolean {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as { user?: { role?: unknown } };
    const role = parsed.user?.role;
    return role === 'CITIZEN' || role === 'OFFICIAL' || role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

async function restoreSessionFromCookie() {
  if (hasValidSession()) {
    return;
  }

  try {
    const payload = await authApi.me();
    if (payload?.user) {
      saveAuthSession({ user: payload.user });
      return;
    }
  } catch {
    // Keep startup resilient when no cookie session exists.
  }

  clearAuthSession();
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function enforceProtectedRouteAuth() {
  if (!isProtectedPath(window.location.pathname)) {
    return;
  }

  if (hasValidSession()) {
    return;
  }

  window.location.replace('/auth/login');
}

function mountApp() {
  createRoot(document.getElementById('root')!).render(
    <AppErrorBoundary>
      <TugonThemeProvider>
        <App />
      </TugonThemeProvider>
    </AppErrorBoundary>,
  );
}

async function bootstrapAndRender() {
  // On protected routes the session must be resolved before rendering to
  // prevent a flash of unauthenticated content or a race on RBAC-gated data.
  // On public routes (landing, auth pages) render immediately and restore the
  // session in the background — avoids blocking FCP on a network round trip.
  if (isProtectedPath(window.location.pathname)) {
    await restoreSessionFromCookie();
    enforceProtectedRouteAuth();
    mountApp();
  } else {
    mountApp();
    void restoreSessionFromCookie();
  }

  window.addEventListener('pageshow', enforceProtectedRouteAuth);
  window.addEventListener('popstate', enforceProtectedRouteAuth);
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_SESSION_KEY || event.key === null) {
      enforceProtectedRouteAuth();
    }
  });

  void initWebVitals();

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration is best-effort — a failure here is non-fatal.
      });
    });
  }
}

void bootstrapAndRender();
