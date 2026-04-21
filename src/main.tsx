
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './app/components/AppErrorBoundary.tsx';
import { TugonThemeProvider } from './app/providers/ThemeProvider.tsx';
import { authApi } from './app/services/authApi';
import { clearAuthSession, saveAuthSession } from './app/utils/authSession';
import './styles/index.css';

const AUTH_SESSION_KEY = 'tugon.auth.session';
const PROTECTED_ROUTE_PREFIXES = ['/app', '/citizen', '/superadmin'] as const;
const root = createRoot(document.getElementById('root')!);

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

async function restoreSessionFromCookie(options?: { allowAnonymousProbe?: boolean }) {
  if (hasValidSession()) {
    return;
  }

  const hasStoredSessionSnapshot = localStorage.getItem(AUTH_SESSION_KEY) !== null;
  if (!options?.allowAnonymousProbe && !hasStoredSessionSnapshot) {
    // Public routes should not probe /auth/me when the visitor has never logged in.
    clearAuthSession();
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

function isLandingPath(pathname: string): boolean {
  return pathname === '/';
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

async function mountApp() {
  const [{ default: App }] = await Promise.all([
    import('./app/App.tsx'),
    import('./styles/mobile.css'),
  ]);

  root.render(
    <AppErrorBoundary>
      <TugonThemeProvider>
        <App />
      </TugonThemeProvider>
    </AppErrorBoundary>,
  );
}

async function mountLandingPage() {
  const [{ TranslationProvider }, { default: Landing }] = await Promise.all([
    import('./app/i18n/TranslationProvider.tsx'),
    import('./app/pages/Landing.tsx'),
  ]);

  root.render(
    <AppErrorBoundary>
      <TugonThemeProvider>
        <TranslationProvider>
          <Landing />
        </TranslationProvider>
      </TugonThemeProvider>
    </AppErrorBoundary>,
  );
}

function runAfterLoadAndIdle(task: () => void, fallbackDelay = 800) {
  const runTask = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => task(), { timeout: fallbackDelay });
      return;
    }

    window.setTimeout(task, fallbackDelay);
  };

  if (document.readyState === 'complete') {
    runTask();
    return;
  }

  window.addEventListener('load', runTask, { once: true });
}

async function bootstrapAndRender() {
  const pathname = window.location.pathname;
  const landingPath = isLandingPath(pathname);

  if (landingPath) {
    await mountLandingPage();

    // Deferred session check — if the visitor happens to be logged in,
    // the Landing component's own useEffect will redirect them.
    runAfterLoadAndIdle(() => {
      void restoreSessionFromCookie();
    }, 2500);
  } else if (isProtectedPath(pathname)) {
    // On protected routes the session must be resolved before rendering to
    // prevent a flash of unauthenticated content or a race on RBAC-gated data.
    await restoreSessionFromCookie({ allowAnonymousProbe: true });
    enforceProtectedRouteAuth();
    await mountApp();
  } else {
    // Public non-landing routes (auth pages, etc.) — render immediately and
    // restore the session in the background to avoid blocking FCP.
    await mountApp();
    runAfterLoadAndIdle(() => {
      void restoreSessionFromCookie();
    }, 2500);
  }

  window.addEventListener('pageshow', enforceProtectedRouteAuth);
  window.addEventListener('popstate', enforceProtectedRouteAuth);
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_SESSION_KEY || event.key === null) {
      enforceProtectedRouteAuth();
    }
  });

  if (import.meta.env.DEV) {
    runAfterLoadAndIdle(async () => {
      const { initWebVitals } = await import('./app/utils/webVitals.ts');
      void initWebVitals();
    }, 3500);
  }

  runAfterLoadAndIdle(() => {
    void import('./styles/fonts-extended.css');
  }, 1800);

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration is best-effort — a failure here is non-fatal.
      });
    });
  }
}

void bootstrapAndRender();
