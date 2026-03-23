import type { AuthSession, Role } from "../services/authApi";

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

    const token = typeof parsed?.token === "string" ? parsed.token.trim() : undefined;

    return {
      user: parsed.user,
      ...(token ? { token } : {}),
    };
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
  if (!session?.user) {
    return false;
  }
  return roles.includes(session.user.role);
}
