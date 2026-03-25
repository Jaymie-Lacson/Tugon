
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
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

enforceProtectedRouteAuth();
window.addEventListener('pageshow', enforceProtectedRouteAuth);
window.addEventListener('popstate', enforceProtectedRouteAuth);
window.addEventListener('storage', (event) => {
  if (event.key === AUTH_SESSION_KEY || event.key === null) {
    enforceProtectedRouteAuth();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
  