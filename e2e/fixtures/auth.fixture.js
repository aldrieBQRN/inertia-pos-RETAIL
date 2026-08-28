import { expect } from '@playwright/test';
import { TEST_USERS } from './test-data.js';

/**
 * Log in as Store Manager (Admin)
 */
export async function loginAsAdmin(page) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/dashboard')) return;

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(TEST_USERS.admin.email);
    await page.locator('#password').fill(TEST_USERS.admin.password);
    await page.getByRole('button', { name: /Sign In/i }).first().click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
}

/**
 * Log in as POS Cashier
 */
export async function loginAsCashier(page) {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/pos')) return;

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(TEST_USERS.cashier.email);
    await page.locator('#password').fill(TEST_USERS.cashier.password);
    await page.getByRole('button', { name: /Sign In/i }).first().click();
    await expect(page).toHaveURL(/.*pos/, { timeout: 15000 });
}

/**
 * Ensures cashier has an active shift; opens one if currently closed
 */
export async function ensureActiveShift(page, startingCash = '1000') {
    if (!page.url().includes('/pos')) {
        await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForTimeout(500);

    const openShiftBtn = page.getByRole('button', { name: /Open Shift/i });
    if (await openShiftBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await openShiftBtn.click();
        await page.waitForTimeout(400);

        const floatInput = page.locator('input[placeholder*="0.00"], input[type="number"]').first();
        if (await floatInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await floatInput.fill(startingCash);
        }

        const confirmBtn = page.getByRole('button', { name: /Open Shift|Start Shift|Confirm/i }).last();
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirmBtn.click();
            await page.waitForTimeout(600);
        }
    }
}
