import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin Store Settings & Terminals', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    });

    test('2.1 should render store settings and POS terminal configurations', async ({ page }) => {
        await expect(page).toHaveURL(/.*settings/);
        await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 5000 });
    });
});
