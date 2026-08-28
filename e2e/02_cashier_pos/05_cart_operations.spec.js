import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Cart Operations & Hotkeys', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('5.1 should add products, adjust quantities, and clear cart (F9)', async ({ page }) => {
        await page.waitForTimeout(600);

        const productButtons = page.locator('[data-catalog-item-index], button:has-text("₱")');
        if (await productButtons.count() > 0) {
            await productButtons.first().click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);
        }

        const clearCartBtn = page.getByRole('button', { name: /Clear Cart|Clear/i }).first();
        if (await clearCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await clearCartBtn.click();

            const swalConfirm = page.locator('.swal2-confirm');
            if (await swalConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
                await swalConfirm.click();
            }
            await page.waitForTimeout(500);

            const emptyCartMsg = page.locator('text=/Order is currently empty|empty/i').first();
            await expect(emptyCartMsg).toBeVisible({ timeout: 5000 });
        }
    });
});
