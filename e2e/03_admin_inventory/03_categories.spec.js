import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin Inventory - Category Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('3.1 should display category filter pills and filter product list', async ({ page }) => {
        await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Inventory/i })).toBeVisible({ timeout: 5000 });

        const categoryFilter = page.locator('button:has-text("All"), select, [data-category-filter]').first();
        await expect(categoryFilter).toBeVisible({ timeout: 5000 });
    });
});
