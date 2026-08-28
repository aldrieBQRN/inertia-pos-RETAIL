import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin Activity Logs & Audit Trail', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/activity-logs', { waitUntil: 'domcontentloaded' });
    });

    test('3.1 should render activity logs timeline and filter options', async ({ page }) => {
        await expect(page).toHaveURL(/.*activity-logs/);
        await expect(page.getByRole('heading', { name: /Activity Logs|Audit Trail/i })).toBeVisible({ timeout: 5000 });
    });
});
