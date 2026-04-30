// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuthSession, getAuthSession, hasRequiredRole, patchAuthSessionUser, saveAuthSession } from './authSession';

describe('auth session storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and reads a valid session', () => {
    saveAuthSession({
      user: {
        id: 'user-1',
        fullName: 'Test User',
        phoneNumber: '09171234567',
        role: 'CITIZEN',
        barangayCode: '251',
        isPhoneVerified: true,
        isVerified: true,
        verificationStatus: 'APPROVED',
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
      },
    });

    expect(getAuthSession()?.user.role).toBe('CITIZEN');
    expect(hasRequiredRole(['CITIZEN'])).toBe(true);
  });

  it('clears invalid serialized role payloads', () => {
    localStorage.setItem(
      'tugon.auth.session',
      JSON.stringify({
        user: {
          id: 'user-2',
          fullName: 'Invalid Role',
          phoneNumber: '09170000000',
          role: 'HACKER',
        },
      }),
    );

    expect(getAuthSession()).toBeNull();
    expect(localStorage.getItem('tugon.auth.session')).toBeNull();
  });

  it('patches the existing user and supports clearing', () => {
    saveAuthSession({
      user: {
        id: 'user-3',
        fullName: 'Before Patch',
        phoneNumber: '09179999999',
        role: 'OFFICIAL',
        barangayCode: '251',
        isPhoneVerified: true,
        isVerified: true,
        verificationStatus: 'APPROVED',
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
      },
    });

    patchAuthSessionUser({ fullName: 'After Patch' });
    expect(getAuthSession()?.user.fullName).toBe('After Patch');

    clearAuthSession();
    expect(getAuthSession()).toBeNull();
  });

  it('clears malformed json payloads and returns null', () => {
    localStorage.setItem('tugon.auth.session', '{"user":');

    expect(getAuthSession()).toBeNull();
    expect(localStorage.getItem('tugon.auth.session')).toBeNull();
  });

  it('stores only user payload and ignores token fields', () => {
    saveAuthSession({
      token: 'server-token-should-not-persist',
      user: {
        id: 'user-4',
        fullName: 'Token Scope Test',
        phoneNumber: '09176666666',
        role: 'CITIZEN',
        barangayCode: '252',
        isPhoneVerified: true,
        isVerified: true,
        verificationStatus: 'APPROVED',
        verificationRejectionReason: null,
        idImageUrl: null,
        isBanned: false,
      },
    });

    const raw = localStorage.getItem('tugon.auth.session');
    expect(raw).toContain('"user"');
    expect(raw).not.toContain('server-token-should-not-persist');
  });

  it('keeps storage unchanged when patch is called without an active session', () => {
    patchAuthSessionUser({ fullName: 'No Session' });

    expect(getAuthSession()).toBeNull();
    expect(localStorage.getItem('tugon.auth.session')).toBeNull();
  });
});
