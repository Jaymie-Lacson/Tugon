import { describe, expect, it } from 'vitest';
import type { AuthSession, Role } from '../services/authApi';
import { resolveDefaultAppPath, resolveRoleGuardRedirect } from './navigationGuards';

function createSession(role: Role): AuthSession {
  return {
    user: {
      id: 'user-1',
      fullName: 'Test User',
      phoneNumber: '09170000000',
      role,
      barangayCode: '251',
      isPhoneVerified: true,
      isVerified: true,
      verificationStatus: 'APPROVED',
      verificationRejectionReason: null,
      idImageUrl: null,
      isBanned: false,
    },
  };
}

describe('navigation guards', () => {
  it('resolves default app path by session role', () => {
    expect(resolveDefaultAppPath(null)).toBe('/auth/login');
    expect(resolveDefaultAppPath(createSession('CITIZEN'))).toBe('/citizen');
    expect(resolveDefaultAppPath(createSession('OFFICIAL'))).toBe('/app');
    expect(resolveDefaultAppPath(createSession('SUPER_ADMIN'))).toBe('/superadmin');
  });

  it('enforces role guard redirects consistently', () => {
    expect(resolveRoleGuardRedirect(null, ['CITIZEN'], '/app')).toBe('/auth/login');
    expect(resolveRoleGuardRedirect(createSession('OFFICIAL'), ['CITIZEN'], '/app')).toBe('/app');
    expect(resolveRoleGuardRedirect(createSession('CITIZEN'), ['CITIZEN'], '/app')).toBeNull();
    expect(resolveRoleGuardRedirect(createSession('SUPER_ADMIN'), ['OFFICIAL', 'SUPER_ADMIN'], '/citizen')).toBeNull();
  });
});
