import { expect, test } from '@playwright/test';
import { board, probe, reading, terminal } from './helpers';

test('memuat dol.json, menjalankan motor, mengukur 400 V, lalu menghentikannya', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Berkas papan').setInputFiles('tests/fixtures/dol.json');
  await expect(board(page).locator('[data-component-id]')).toHaveCount(3);

  await page.getByRole('button', { name: 'Beri tegangan' }).click();
  const motor = board(page).locator('[data-component-id="m1"]');
  await expect(motor).toHaveAttribute('data-state', 'BERHENTI');

  // START di papan Dalam Panel: kontaktor menarik dan mengunci sendiri setelah tombol dilepas.
  await page.getByRole('tab', { name: 'Dalam Panel' }).click();
  await board(page).getByRole('button', { name: 'Push button NO', exact: true }).click();
  await expect(board(page).locator('[data-component-id="k1"]')).toHaveAttribute('data-state', 'ON');

  await page.getByRole('tab', { name: 'Instalasi' }).click();
  await expect(motor).toHaveAttribute('data-state', 'PUTAR KANAN');
  const display = await probe(
    page,
    terminal(page, 'U1', 'Motor 3 fasa'),
    terminal(page, 'V1', 'Motor 3 fasa'),
  );
  const volts = await reading(display);
  expect(Math.abs(volts - 400)).toBeLessThanOrEqual(3);

  // STOP: kontaktor lepas dan motor berhenti.
  await page.getByRole('tab', { name: 'Dalam Panel' }).click();
  await board(page).getByRole('button', { name: 'Push button NC', exact: true }).click();
  await expect(board(page).locator('[data-component-id="k1"]')).toHaveAttribute(
    'data-state',
    'OFF',
  );
  await page.getByRole('tab', { name: 'Instalasi' }).click();
  await expect(motor).toHaveAttribute('data-state', 'BERHENTI');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('berkas yang bukan papan ditolak dengan pesan dan papan tidak berubah', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Berkas papan').setInputFiles('package.json');
  await expect(page.getByRole('alert')).toContainText('Berkas tidak bisa dibuka');
  await expect(board(page).locator('[data-component-id]')).toHaveCount(0);
});
