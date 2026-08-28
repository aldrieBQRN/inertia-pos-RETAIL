import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data.js';

test.describe('Authentication & Access Control', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
    });

    test('1.1 should display login page elements properly', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Sign In/i })).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    });

    test('1.2 should show error alert on invalid credentials', async ({ page }) => {
        await page.locator('#email').fill('invalid.user@test.com');
        await page.locator('#password').fill('wrongpassword');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Expect error toast or sweetalert
        const swalPopup = page.locator('.swal2-popup');
        await expect(swalPopup).toBeVisible({ timeout: 5000 });
        await expect(swalPopup).toContainText(/Login Failed|do not match/i);
    });

    test('1.3 should log in via Store Admin quick demo button', async ({ page }) => {
        const adminDemoBtn = page.getByRole('button', { name: /Store Admin/i });
        await expect(adminDemoBtn).toBeVisible();
        await adminDemoBtn.click();

        await expect(page.locator('#email')).toHaveValue(TEST_USERS.admin.email);
        await page.getByRole('button', { name: /Sign In/i }).click();

        await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
        await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    });

    test('1.4 should log in via Cashier quick demo button and redirect to POS', async ({ page }) => {
        const cashierDemoBtn = page.getByRole('button', { name: /Cashier/i });
        await expect(cashierDemoBtn).toBeVisible();
        await cashierDemoBtn.click();

        await expect(page.locator('#email')).toHaveValue(TEST_USERS.cashier.email);
        await page.getByRole('button', { name: /Sign In/i }).click();

        await expect(page).toHaveURL(/.*pos/, { timeout: 15000 });
    });
});
