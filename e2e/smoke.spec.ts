import { expect, test } from '@playwright/test';

test('halaman utama terbuka', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Simulator Instalasi Listrik');
  await expect(page.getByRole('heading', { name: 'Simulator Instalasi Listrik' })).toBeVisible();
});
