import type { AuthSession, Role } from "../services/authApi";

const SESSION_KEY = "tugon.auth.session";

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasRequiredRole(roles: Role[]) {
  const session = getAuthSession();
  if (!session) {
    return false;
  }
  return roles.includes(session.user.role);
}
