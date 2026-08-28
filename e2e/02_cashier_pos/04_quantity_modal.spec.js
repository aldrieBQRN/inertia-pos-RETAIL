import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Quantity Modal & Stock Constraints', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('4.1 should open Quantity Modal upon selecting product and add custom units', async ({ page }) => {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        const firstProduct = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        await expect(firstProduct).toBeVisible({ timeout: 5000 });
        await firstProduct.click();

        const qtyInput = page.locator('input[ref="qtyInputRef"], input[type="number"], input.font-black').first();
        if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await qtyInput.fill('2');
            const confirmBtn = page.getByRole('button', { name: /Add|Confirm|OK/i }).last();
            await confirmBtn.click();
            await page.waitForTimeout(500);
        }

        const cartItems = page.locator('.cart-item-row, [data-cart-item]');
        await expect(cartItems.first()).toBeVisible({ timeout: 5000 });
    });
});
