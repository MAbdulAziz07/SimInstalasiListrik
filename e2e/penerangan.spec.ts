import { expect, test } from '@playwright/test';
import { board, connect, place, probe, reading, terminal } from './helpers';

const SOURCE = 'Sumber 1 fasa 230 V';

test('merangkai lampu dan stop kontak dari papan kosong, lalu mengukur 230 V', async ({ page }) => {
  await page.goto('/');
  await expect(board(page).locator('[data-component-id]')).toHaveCount(0);

  await place(page, SOURCE, 120, 110);
  await place(page, 'MCB 1 kutub', 300, 110);
  await place(page, 'Saklar tunggal', 440, 110);
  await place(page, 'Lampu', 600, 110);
  await place(page, 'Stop kontak', 440, 320);
  await expect(board(page).locator('[data-component-id]')).toHaveCount(5);

  // Fasa: sumber → MCB → saklar → lampu, dan MCB → stop kontak.
  await connect(terminal(page, 'L', SOURCE), terminal(page, '1', 'MCB 1 kutub'));
  await connect(terminal(page, '2', 'MCB 1 kutub'), terminal(page, 'L', 'Saklar tunggal'));
  await connect(terminal(page, '1', 'Saklar tunggal'), terminal(page, 'L', 'Lampu'));
  await connect(terminal(page, '2', 'MCB 1 kutub'), terminal(page, 'L', 'Stop kontak'));
  // Netral berwarna biru.
  await page.getByRole('radio', { name: 'Biru (N)' }).click();
  await connect(terminal(page, 'N', 'Lampu'), terminal(page, 'N', SOURCE));
  await connect(terminal(page, 'N', 'Stop kontak'), terminal(page, 'N', SOURCE));
  await expect(board(page).locator('[data-wire-id]')).toHaveCount(6);

  await page.getByRole('button', { name: 'Beri tegangan' }).click();
  const lamp = board(page).locator('[data-lamp]');
  await expect(lamp).toHaveAttribute('data-lamp', 'padam');

  // Saklar ditutup: lampu menyala; dibuka: padam lagi.
  const lightSwitch = board(page).getByRole('switch', { name: 'Saklar tunggal' });
  await lightSwitch.click();
  await expect(lamp).toHaveAttribute('data-lamp', 'menyala');
  await lightSwitch.click();
  await expect(lamp).toHaveAttribute('data-lamp', 'padam');
  await lightSwitch.click();

  const display = await probe(
    page,
    terminal(page, 'L', 'Stop kontak'),
    terminal(page, 'N', 'Stop kontak'),
  );
  const volts = await reading(display);
  expect(Math.abs(volts - 230)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('alert')).toHaveCount(0);

  // Papan tetap ada setelah halaman dimuat ulang.
  await page.getByRole('button', { name: 'Matikan' }).click();
  await page.reload();
  await expect(board(page).locator('[data-component-id]')).toHaveCount(5);
  await expect(board(page).locator('[data-wire-id]')).toHaveCount(6);
});

test('hubung singkat fasa ke netral membuat MCB trip disertai pesan', async ({ page }) => {
  await page.goto('/');
  await place(page, SOURCE, 120, 110);
  await place(page, 'MCB 1 kutub', 300, 110);
  await connect(terminal(page, 'L', SOURCE), terminal(page, '1', 'MCB 1 kutub'));
  await connect(terminal(page, '2', 'MCB 1 kutub'), terminal(page, 'N', SOURCE));

  await page.getByRole('button', { name: 'Beri tegangan' }).click();
  await expect(page.getByRole('alert')).toContainText('MCB trip karena hubung singkat');
  await expect(board(page).locator('[data-state="TRIP"]')).toHaveCount(1);
});

test('komponen bisa dipilih dan diseret dengan tetikus', async ({ page }) => {
  await page.goto('/');
  await place(page, 'MCB 1 kutub', 300, 200);
  const mcb = board(page).locator('[data-component-id]');
  const before = await mcb.getAttribute('transform');

  const box = await mcb.boundingBox();
  if (!box) throw new Error('MCB tidak ditemukan di papan.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 6 });
  await page.mouse.up();

  await expect(mcb).toHaveAttribute('data-selected', 'true');
  expect(await mcb.getAttribute('transform')).not.toBe(before);
  // Seluruh seretan adalah satu langkah riwayat.
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(mcb).toHaveAttribute('transform', before ?? '');
});
