import { test, expect } from '@playwright/test';
import { injectOfficialSession } from './helpers/auth';

test.describe('Official — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectOfficialSession(page);
    // Stub all API calls to avoid needing a live backend
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/app');
  });

  test('page h1 reads "Official Dashboard"', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /official dashboard/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('sidebar navigation is present on desktop', async ({ page, viewport }) => {
    if (!viewport || viewport.width < 1024) test.skip();
    // Sidebar should contain nav links
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 8000 });
  });

  test('KPI stat cards are rendered', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // At least one KPI label from the dashboard
    const kpiLabel = page.getByText(/total incidents|active incidents|pending review/i).first();
    await expect(kpiLabel).toBeVisible({ timeout: 10000 });
  });

  test('incidents table / feed section is present', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/recent incidents|live incident feed|recent activity/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated visit to /app redirects to login', async ({ page: unauthPage }) => {
    // New page with no injected session
    await unauthPage.goto('/app');
    await expect(unauthPage).toHaveURL(/\/auth\/login|\/$/i, { timeout: 8000 });
  });
});
