import { test, expect } from '@playwright/test';

test('should login automatically as a Cashier and go to POS', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Cashier/i }).click();
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    // Verify we are on the POS route
    await expect(page).toHaveURL(/.*pos/, { timeout: 10000 });

    // Look for ANY text that confirms we are on the sales page
    // Replace 'Total' with whatever word is always visible on your POS screen
    await expect(page.getByText(/Total/i).first()).toBeVisible();
});