import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/login');
  await page.getByRole('button', { name: 'Cashier Point of Sale' }).click();
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Clothing & Apparel Cotton T-' }).click();
  await page.getByRole('button', { name: 'Clothing & Apparel Denim' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByPlaceholder('0.00').fill('100000');
  await page.getByRole('button', { name: 'Confirm Payment' }).click();
  await page.getByRole('button', { name: 'New Order' }).click();
  await page.getByRole('button', { name: 'Clothing & Apparel Sports' }).click();
  await page.getByRole('button', { name: 'Clothing & Apparel Winter' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('button', { name: 'E-Wallet' }).click();
  await page.getByRole('textbox', { name: 'GCASH Reference No...' }).fill('1234');
  await page.getByRole('button', { name: 'Confirm Payment' }).click();
  await page.getByRole('button', { name: 'New Order' }).click();
  await page.getByRole('button', { name: 'Electronics LED USB Desk Lamp' }).click();
  await page.getByRole('button', { name: 'Electronics Portable Power' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByRole('button', { name: 'Card' }).click();
  await page.getByRole('textbox', { name: 'Credit Card Approval Code...' }).fill('1020');
  await page.getByRole('button', { name: 'Confirm Payment' }).click();
  await page.getByRole('button', { name: 'New Order' }).click();
});