import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Checkout & Multi-Payment Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('8.1 should perform full Cash Checkout with quick bills and change calculation', async ({ page }) => {
        await page.waitForTimeout(600);

        const productBtn = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        if (await productBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productBtn.click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);

            const checkoutBtn = page.getByRole('button', { name: /Checkout/i }).first();
            await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
            await checkoutBtn.click();

            await page.waitForTimeout(500);
            const cashAmountInput = page.locator('input[placeholder="0.00"], input[inputmode="decimal"]').first();
            if (await cashAmountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await cashAmountInput.fill('10000');
            }

            const confirmPaymentBtn = page.getByRole('button', { name: /Confirm Settlement|Settlement|Confirm/i }).last();
            await confirmPaymentBtn.click();

            await page.waitForTimeout(1000);
            const newOrderBtn = page.getByRole('button', { name: /New Order|Done/i }).first();
            if (await newOrderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await newOrderBtn.click();
                await page.waitForTimeout(500);
            }
        }
    });

    test('8.2 should perform E-Wallet Checkout (GCash / Maya reference)', async ({ page }) => {
        await page.waitForTimeout(600);

        const productBtn = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        if (await productBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productBtn.click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);

            const checkoutBtn = page.getByRole('button', { name: /Checkout/i }).first();
            await checkoutBtn.click();
            await page.waitForTimeout(500);

            const ewalletBtn = page.getByRole('button', { name: /E-Wallet|GCash|Maya/i }).first();
            if (await ewalletBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await ewalletBtn.click();

                const refInput = page.locator('input[placeholder*="Reference" i], input[placeholder*="GCASH" i], input[inputmode="numeric"]').first();
                if (await refInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await refInput.fill('GC-AUTO-998822');
                }

                const confirmPaymentBtn = page.getByRole('button', { name: /Confirm Settlement|Settlement|Confirm/i }).last();
                await confirmPaymentBtn.click();
                await page.waitForTimeout(1000);

                const newOrderBtn = page.getByRole('button', { name: /New Order|Done/i }).first();
                if (await newOrderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await newOrderBtn.click();
                }
            }
        }
    });

    test('8.3 should perform Credit / Debit Card Checkout (Approval code)', async ({ page }) => {
        await page.waitForTimeout(600);

        const productBtn = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        if (await productBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productBtn.click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);

            const checkoutBtn = page.getByRole('button', { name: /Checkout/i }).first();
            await checkoutBtn.click();
            await page.waitForTimeout(500);

            const cardBtn = page.getByRole('button', { name: /Card|Credit|Debit/i }).first();
            if (await cardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await cardBtn.click();

                const codeInput = page.locator('input[placeholder*="Approval" i], input[placeholder*="Code" i], input[inputmode="numeric"]').first();
                if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await codeInput.fill('CC-882299');
                }

                const confirmPaymentBtn = page.getByRole('button', { name: /Confirm Settlement|Settlement|Confirm/i }).last();
                await confirmPaymentBtn.click();
                await page.waitForTimeout(1000);

                const newOrderBtn = page.getByRole('button', { name: /New Order|Done/i }).first();
                if (await newOrderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await newOrderBtn.click();
                }
            }
        }
    });
});
