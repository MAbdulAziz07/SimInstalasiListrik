import { expect, type Locator, type Page } from '@playwright/test';

export const board = (page: Page): Locator => page.getByRole('application');

/** Terminal papan menurut namanya, mis. `terminal(page, 'L', 'Lampu')`. */
export function terminal(page: Page, name: string, component: string): Locator {
  return board(page).getByRole('button', { name: `Terminal ${name} ${component}`, exact: true });
}

/** Menyeret sebuah peralatan dari palet ke titik (x, y) pada papan, dalam piksel papan. */
export async function place(page: Page, item: string, x: number, y: number): Promise<void> {
  const source = await page
    .getByRole('complementary', { name: 'Palet peralatan' })
    .getByRole('button', { name: item, exact: true })
    .boundingBox();
  const area = await board(page).boundingBox();
  if (!source || !area) throw new Error(`Tidak menemukan "${item}" atau papan.`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + x, area.y + y, { steps: 8 });
  await page.mouse.up();
}

/** Menarik kabel dari satu terminal ke terminal lain. */
export async function connect(from: Locator, to: Locator): Promise<void> {
  await from.click();
  await to.click();
}

/** Mengeluarkan multimeter dan menempelkan kedua probenya. */
export async function probe(page: Page, red: Locator, black: Locator): Promise<Locator> {
  const meter = page.getByRole('region', { name: 'Multimeter' });
  if (!(await meter.isVisible())) {
    await page.getByRole('button', { name: 'Multimeter', exact: true }).click();
  }
  await meter.getByRole('button', { name: 'Probe merah', exact: true }).click();
  await red.click();
  await meter.getByRole('button', { name: 'Probe hitam', exact: true }).click();
  await black.click();
  return page.getByRole('status', { name: 'Layar multimeter' });
}

/** Angka pada layar alat ukur, mis. "229,9 V" menjadi 229.9. */
export async function reading(display: Locator): Promise<number> {
  const text = (await display.textContent()) ?? '';
  const value = Number(text.replace(/[^\d,]/g, '').replace(',', '.'));
  expect(Number.isFinite(value), `layar menampilkan "${text}"`).toBe(true);
  return value;
}
