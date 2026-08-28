import { test, expect } from '@playwright/test';
import { loginAsCashier } from '../fixtures/auth.fixture.js';

test.describe('POS Terminal & Workstation Switching', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsCashier(page);
    });

    test('2.1 should display current active terminal in the header bar', async ({ page }) => {
        await page.waitForTimeout(600);
        await expect(page.locator('.pos-terminal')).toBeVisible({ timeout: 5000 });
    });
});
