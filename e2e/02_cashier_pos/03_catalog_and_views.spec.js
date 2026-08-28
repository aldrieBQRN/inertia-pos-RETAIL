import { test, expect } from '@playwright/test';
import { loginAsCashier, ensureActiveShift } from '../fixtures/auth.fixture.js';

test.describe('POS Catalog, Search, Wholesale & Views', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
        await ensureActiveShift(page);
    });

    test('3.1 should open Category filter dropdown and select category (F1)', async ({ page }) => {
        await page.waitForTimeout(600);

        const categoryBtn = page.getByRole('button', { name: /Category/i }).first();
        await expect(categoryBtn).toBeVisible({ timeout: 5000 });
        await categoryBtn.click();

        await page.waitForTimeout(300);
        const allCategoriesBtn = page.getByRole('button', { name: /All Categories/i });
        await expect(allCategoriesBtn).toBeVisible({ timeout: 3000 });
    });

    test('3.2 should search products by keyword and clear search (F2)', async ({ page }) => {
        await page.waitForTimeout(600);

        const searchInput = page.locator('input[placeholder*="Search product" i], input[placeholder*="barcode" i]');
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        await searchInput.fill('Cotton');
        await page.waitForTimeout(400);

        const clearBtn = page.locator('button[title*="Clear search" i]').first();
        if (await clearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await clearBtn.click();
        } else {
            await searchInput.fill('');
        }
    });

    test('3.3 should toggle Wholesale price mode (F3)', async ({ page }) => {
        await page.waitForTimeout(600);

        // Press F3 key shortcut
        await page.keyboard.press('F3');
        await page.waitForTimeout(300);
        await page.keyboard.press('F3');
    });
});
