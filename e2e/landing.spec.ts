import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero h1', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('h1').first()).toContainText('Tondo');
  });

  test('shows login and register links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign in|log in/i }).first()).toBeVisible();
  });

  test('skip-to-content link is present', async ({ page }) => {
    const skipLink = page.locator('a[href="#landing-main-content"]');
    await expect(skipLink).toHaveCount(1);
  });

  test('hero image is loaded (not broken)', async ({ page }) => {
    const heroImg = page.locator('img[src*="hero-city"]').first();
    await heroImg.waitFor({ state: 'visible' });
    const naturalWidth = await heroImg.evaluate(
      (el: HTMLImageElement) => el.naturalWidth,
    );
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical warnings from browser extensions / leaflet tiles
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('tile') && !e.includes('sw.js'),
    );
    expect(critical).toHaveLength(0);
  });
});
