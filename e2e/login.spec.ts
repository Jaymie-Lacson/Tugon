import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders page title', async ({ page }) => {
    await expect(page).toHaveTitle(/TUGON/i);
    await expect(page.getByText('Sign in to TUGON')).toBeVisible();
  });

  test('phone and password fields are visible', async ({ page }) => {
    await expect(page.getByLabel('Phone number')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows validation error for empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    // At least one inline error should appear
    await expect(page.locator('[class*="error"], [class*="destructive"]').first()).toBeVisible();
  });

  test('shows inline error on bad credentials', async ({ page }) => {
    // Intercept the login API and return 401
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Invalid credentials' }) });
    });

    await page.getByLabel('Phone number').fill('09171234567');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.locator('[class*="destructive"], [class*="error"]').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('successful login redirects citizen to /citizen', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-001',
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
      });
    });
    // Mock the /me check that follows login
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-001', role: 'CITIZEN' }),
      });
    });
    // Mock any API calls the citizen dashboard makes
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.getByLabel('Phone number').fill('09171234567');
    await page.getByLabel('Password').fill('Correct1!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/citizen/, { timeout: 8000 });
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('register link is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
  });
});
