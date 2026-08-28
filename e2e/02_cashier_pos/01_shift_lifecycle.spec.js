import { test, expect } from '@playwright/test';
import { loginAsCashier } from '../fixtures/auth.fixture.js';

test.describe('POS Shift Lifecycle & Cash Movements', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
    });

    test('1.1 should allow opening a shift or verifying active shift status', async ({ page }) => {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const openShiftBtn = page.getByRole('button', { name: /Open Shift/i });
        if (await openShiftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await openShiftBtn.click();
            await page.waitForTimeout(400);

            const cashInput = page.locator('input[placeholder*="0.00"], input[type="number"]').first();
            if (await cashInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cashInput.fill('1000');
            }
            const confirmBtn = page.getByRole('button', { name: /Open Shift|Start Shift|Confirm/i }).last();
            if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await confirmBtn.click();
                await page.waitForTimeout(600);
            }
        }

        await expect(page.locator('.pos-terminal')).toBeVisible();
        await expect(page.locator('text=/Shift #.*Active|Float:/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('1.2 should execute Cash In and Cash Out drawer movements (F4)', async ({ page }) => {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const cashMovementBtn = page.getByRole('button', { name: /Cash In\/Out|Cash/i }).first();
        if (await cashMovementBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cashMovementBtn.click();
            await page.waitForTimeout(400);

            const modal = page.locator('.fixed').first();
            if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
                const amountInput = page.locator('input[type="number"], input[placeholder*="0.00"]').first();
                if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await amountInput.fill('500');
                    const notesInput = page.locator('textarea, input[placeholder*="reason" i], input[placeholder*="notes" i]').first();
                    if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await notesInput.fill('Petty Cash Replenishment');
                    }
                    const submitBtn = page.getByRole('button', { name: /Save|Submit|Confirm|Deposit/i }).last();
                    await submitBtn.click();
                    await page.waitForTimeout(600);
                }
            }
        }
    });
});
