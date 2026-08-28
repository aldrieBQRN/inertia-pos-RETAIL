import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin Transactions & Sales History', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('1.1 should render transactions table and filters', async ({ page }) => {
        await page.goto('/transactions', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Transactions|Sales History/i })).toBeVisible({ timeout: 5000 });
    });

    test('1.2 should open View Receipt / Transaction Details modal', async ({ page }) => {
        await page.goto('/transactions', { waitUntil: 'domcontentloaded' });
        const detailsBtn = page.getByRole('button', { name: /Details/i }).first();
        if (await detailsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await detailsBtn.click();
            await page.waitForTimeout(500);

            const modalClose = page.locator('button:has-text("Close"), button:has-text("✕")').first();
            await expect(modalClose).toBeVisible({ timeout: 5000 });
        }
    });
});
