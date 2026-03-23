import type { AuthSession, Role } from "../services/authApi";

const SESSION_KEY = "tugon.auth.session";
const SESSION_TOKEN_KEY = "tugon.auth.session.token";

export function saveAuthSession(session: AuthSession) {
  const token = typeof session.token === "string" ? session.token.trim() : "";

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      user: session.user,
    }),
  );

  if (token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }
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
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      return null;
    }

    // Keep user metadata in localStorage and token in sessionStorage (tab-scoped).
    const tokenFromSession = sessionStorage.getItem(SESSION_TOKEN_KEY) ?? "";
    const tokenFromLegacyStorage = typeof parsed?.token === "string" ? parsed.token.trim() : "";
    const token = (tokenFromSession || tokenFromLegacyStorage).trim();

    return {
      user: parsed.user,
      ...(token ? { token } : {}),
    };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
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
