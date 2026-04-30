import { test, expect } from '@playwright/test';
import { injectCitizenSession } from './helpers/auth';

test.describe('Citizen — Incident Report form', () => {
  test.beforeEach(async ({ page }) => {
    await injectCitizenSession(page);
    // Stub all API calls so the page doesn't fail while loading
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/citizen/report');
  });

  test('page has h1 (screen-reader title)', async ({ page }) => {
    const h1 = page.locator('h1');
    // The visible SR-only h1 may not be in the viewport — just check it exists in DOM
    await expect(h1.first()).toHaveText(/Report an Incident/i, { timeout: 8000 });
  });

  test('step indicator is visible at step 1', async ({ page }) => {
    // Step indicator labels
    await expect(page.getByText('Incident Type')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Location')).toBeVisible();
  });

  test('Step 1 — category cards are rendered', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Hard-rule: exactly these five incident types must exist
    for (const label of ['Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other']) {
      await expect(page.getByText(label, { exact: false })).toBeVisible({ timeout: 8000 });
    }
  });

  test('Step 1 — selecting a category enables Continue', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Crime', { exact: false }).first().click();
    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).not.toBeDisabled({ timeout: 5000 });
  });

  test('Step 1 — Continue without selection shows validation', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const continueBtn = page.getByRole('button', { name: /continue/i });
    // Button should be disabled until a category is selected
    await expect(continueBtn).toBeDisabled();
  });

  test('Step 1 → Step 2 navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Noise', { exact: false }).first().click();
    await page.getByRole('button', { name: /continue/i }).click();
    // Step 2 heading
    await expect(page.locator('h2').filter({ hasText: /where did it happen|location/i })).toBeVisible({
      timeout: 8000,
    });
  });

  test('Back button on Step 2 returns to Step 1', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByText('Pollution', { exact: false }).first().click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText('What type of incident', { exact: false })).toBeVisible({ timeout: 5000 });
  });
});
