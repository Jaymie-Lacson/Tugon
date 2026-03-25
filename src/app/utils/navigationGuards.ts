import type { AuthSession, Role } from '../services/authApi';

export function resolveDefaultAppPath(session: AuthSession | null): string {
  if (!session?.user) {
    return '/auth/login';
  }

  if (session.user.role === 'CITIZEN') {
    return '/citizen';
  }

  if (session.user.role === 'SUPER_ADMIN') {
    return '/superadmin';
  }

  return '/app';
}

export function resolveRoleGuardRedirect(
  session: AuthSession | null,
  roles: Role[],
  fallbackPath: string,
): string | null {
  if (!session?.user) {
    return '/auth/login';
  }

  return roles.includes(session.user.role) ? null : fallbackPath;
}
