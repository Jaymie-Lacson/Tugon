import type { Page } from '@playwright/test';

const SESSION_KEY = 'tugon.auth.session';

export function injectCitizenSession(page: Page) {
  return page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    {
      key: SESSION_KEY,
      value: JSON.stringify({
        user: {
          id: 'test-citizen-001',
          fullName: 'Maria Santos',
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
      }),
    },
  );
}

export function injectOfficialSession(page: Page) {
  return page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    {
      key: SESSION_KEY,
      value: JSON.stringify({
        user: {
          id: 'test-official-001',
          fullName: 'Juan dela Cruz',
          phoneNumber: '09181234567',
          role: 'OFFICIAL',
          barangayCode: '251',
          isPhoneVerified: true,
          isVerified: true,
          verificationStatus: 'APPROVED',
          verificationRejectionReason: null,
          idImageUrl: null,
          isBanned: false,
        },
      }),
    },
  );
}

export function injectSuperAdminSession(page: Page) {
  return page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    {
      key: SESSION_KEY,
      value: JSON.stringify({
        user: {
          id: 'test-sa-001',
          fullName: 'Admin User',
          phoneNumber: '09191234567',
          role: 'SUPER_ADMIN',
          barangayCode: null,
          isPhoneVerified: true,
          isVerified: true,
          verificationStatus: 'APPROVED',
          verificationRejectionReason: null,
          idImageUrl: null,
          isBanned: false,
        },
      }),
    },
  );
}
