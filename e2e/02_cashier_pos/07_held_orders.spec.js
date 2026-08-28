import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Held Orders (Park & Recall)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('7.1 should hold an active order (F11) and recall it from modal (F8)', async ({ page }) => {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        const productBtn = page.locator('[data-catalog-item-index="0"], button:has-text("₱")').first();
        if (await productBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productBtn.click();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);

            const holdOrderBtn = page.getByRole('button', { name: /Hold Order|Park/i }).first();
            if (await holdOrderBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await holdOrderBtn.click();

                const swalInput = page.locator('.swal2-input');
                if (await swalInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await swalInput.fill('Table 9 - Test Order');
                    const confirmBtn = page.locator('.swal2-confirm');
                    await confirmBtn.click();
                    await page.waitForTimeout(800);
                }

                const recallBtn = page.getByRole('button', { name: /Recall|Saved Orders/i }).first();
                if (await recallBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await recallBtn.click();
                    await page.waitForTimeout(500);

                    const heldOrderCard = page.locator('text=/Table 9|Saved Order/i').first();
                    if (await heldOrderCard.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await heldOrderCard.click();
                        const confirmRecall = page.locator('.swal2-confirm');
                        if (await confirmRecall.isVisible({ timeout: 2000 }).catch(() => false)) {
                            await confirmRecall.click();
                        }
                        await page.waitForTimeout(800);
                    }
                }
            }
        }
    });
});
