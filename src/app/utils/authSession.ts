import { authApi, type AuthSession, type Role } from "../services/authApi";

const SESSION_KEY = "tugon.auth.session";

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      user: session.user,
    }),
  );
}

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const role = parsed?.user?.role;

    if (!parsed.user || (role !== "CITIZEN" && role !== "OFFICIAL" && role !== "SUPER_ADMIN")) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      user: parsed.user,
    };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Performs a complete logout: invalidates server session cookie,
 * then clears localStorage. Use this instead of clearAuthSession()
 * for user-initiated sign-outs.
 */
export async function performLogout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Server logout failed (maybe already expired), continue with local cleanup
  }
  clearAuthSession();
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
  if (!session?.user) {
    return false;
  }
  return roles.includes(session.user.role);
}
