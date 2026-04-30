import { test, expect } from '@playwright/test';

test('check if my pos is alive', async ({ page }) => {
  await page.goto('/');

  // Change /Inertia/ to /Log in/ to match your actual page title
  await expect(page).toHaveTitle(/Log in/);
});