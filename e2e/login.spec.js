import { test, expect } from '@playwright/test';

test('should login via Admin helper and Sign In button', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Admin/i }).click();
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // FIX: Tell Playwright to look for the HEADING specifically.
    // This ignores the sidebar links and tooltips.
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});