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
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
    const role = parsed?.user?.role;

    if (!token || !parsed.user || (role !== "CITIZEN" && role !== "OFFICIAL" && role !== "SUPER_ADMIN")) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function patchAuthSessionUser(patch: Partial<AuthSession["user"]>) {
  const session = getAuthSession();
  if (!session) {
    return;
  }

  saveAuthSession({
    ...session,
    user: {
      ...session.user,
      ...patch,
    },
  });
}

export function hasRequiredRole(roles: Role[]) {
  const session = getAuthSession();
  if (!session?.token) {
    return false;
  }
  return roles.includes(session.user.role);
}
