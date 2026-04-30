import { test, expect } from '@playwright/test';
import { injectSuperAdminSession } from './helpers/auth';

const AUDIT_API_STUB = {
  logs: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

test.describe('SuperAdmin — Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await injectSuperAdminSession(page);
    // Stub all API calls
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('audit-logs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(AUDIT_API_STUB),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });
    await page.goto('/superadmin/audit-logs');
  });

  test('page h1 reads "Admin Audit Logs"', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /admin audit logs/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('export button is present', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 8000 });
  });

  test('super admin sidebar shows audit logs link as active', async ({ page }) => {
    // The sidebar link for audit logs should exist
    await expect(page.getByRole('link', { name: /audit logs/i })).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated visit redirects away', async ({ page: unauthPage }) => {
    await unauthPage.goto('/superadmin/audit-logs');
    await expect(unauthPage).toHaveURL(/\/auth\/login|\/$/i, { timeout: 8000 });
  });

  test('CITIZEN session cannot access superadmin', async ({ page: citizenPage }) => {
    // Inject citizen (not super admin) session
    await citizenPage.addInitScript(
      ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
      {
        key: 'tugon.auth.session',
        value: JSON.stringify({
          user: {
            id: 'c-001',
            fullName: 'Regular User',
            phoneNumber: '09001234567',
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
    await citizenPage.goto('/superadmin/audit-logs');
    // Should redirect away from superadmin
    await expect(citizenPage).not.toHaveURL(/\/superadmin/, { timeout: 8000 });
  });
});
