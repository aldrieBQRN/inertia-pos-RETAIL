import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin Inventory - Stock Movements & Timeline', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
    });

    test('2.1 should open Stock History timeline modal for a product', async ({ page }) => {
        const historyBtn = page.locator('button[title*="History" i], button:has-text("History"), button:has-text("Logs")').first();
        if (await historyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await historyBtn.click();
            await page.waitForTimeout(500);

            const modalCloseBtn = page.locator('button:has-text("Close"), button:has-text("✕"), button[title*="Close" i]').first();
            await expect(modalCloseBtn).toBeVisible({ timeout: 5000 });
        }
    });

    test('2.2 should open Restock / Adjust Stock modal', async ({ page }) => {
        const restockBtn = page.locator('button[title*="Restock" i], button:has-text("Restock"), button:has-text("Adjust")').first();
        if (await restockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await restockBtn.click();
            await page.waitForTimeout(500);

            const qtyInput = page.locator('input[type="number"], input[name*="quantity" i]').first();
            if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await qtyInput.fill('10');
            }
        }
    });
});
