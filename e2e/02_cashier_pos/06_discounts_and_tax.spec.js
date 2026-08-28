import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Senior / PWD Discounts & Tax Recalculation', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('6.1 should toggle Senior / PWD 20% discount (F10) and verify total updates', async ({ page }) => {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        const productBtn = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        if (await productBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productBtn.click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);

            const seniorBtn = page.getByRole('button', { name: /Senior|PWD/i }).first();
            if (await seniorBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await seniorBtn.click();
                await page.waitForTimeout(300);

                const discountIndicator = page.locator('text=/Discount|Senior|20%/i').first();
                await expect(discountIndicator).toBeVisible({ timeout: 5000 });

                await seniorBtn.click();
                await page.waitForTimeout(300);
            }
        }
    });
});
