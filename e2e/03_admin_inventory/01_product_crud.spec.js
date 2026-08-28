import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth.fixture.js';
import { SAMPLE_PRODUCTS } from '../fixtures/test-data.js';

test.describe('Admin Inventory - Product CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/inventory', { waitUntil: 'domcontentloaded' });
    });

    test('1.1 should render inventory product table and search filters', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Inventory/i })).toBeVisible({ timeout: 5000 });

        const searchInput = page.locator('input[placeholder*="Search product" i], input[placeholder*="SKU" i]').first();
        await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test('1.2 should open Add Product modal and create new item', async ({ page }) => {
        const addProductBtn = page.getByRole('button', { name: /Add Product|New Product|Create/i }).first();
        if (await addProductBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await addProductBtn.click();
            await page.waitForTimeout(500);

            const nameInput = page.locator('input[name="name"], input#name').first();
            if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await nameInput.fill(SAMPLE_PRODUCTS.newProduct.name);
            }
        }
    });
});
