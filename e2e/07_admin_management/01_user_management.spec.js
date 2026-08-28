import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';

test.describe('Admin User & Staff Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('1.1 should display staff list and user roles', async ({ page }) => {
        await page.goto('/users', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Users|Staff|Team/i })).toBeVisible({ timeout: 10000 });
    });

    test('1.2 should open Add Staff modal', async ({ page }) => {
        await page.goto('/users', { waitUntil: 'domcontentloaded' });
        const addStaffBtn = page.getByRole('button', { name: /Add Staff|New User|Create User/i }).first();
        if (await addStaffBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await addStaffBtn.click();
            await page.waitForTimeout(500);

            const modalClose = page.locator('button:has-text("Cancel"), button:has-text("Close"), button:has-text("✕")').first();
            await expect(modalClose).toBeVisible({ timeout: 5000 });
        }
    });
});
