import { describe, expect, test } from 'vitest';
import bigRaw from '../../tests/fixtures/papan-besar.json?raw';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { advance, TICK_SECONDS } from './clock';
import { allComponents, allWires } from './network';
import { simulate } from './simulate';
import type { SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const UNITS = [1, 2, 3, 4, 5];
/** Batas waktu dari SPEC: hasil simulasi muncul paling lama 100 ms setelah saklar dioperasikan. */
const BUDGET_MS = 100;

function press(project: Project, from: SimResult, id: string): SimResult {
  const down = simulate(project, { ...from.states, [id]: { kind: 'pushButton', pressed: true } });
  return simulate(project, { ...down.states, [id]: { kind: 'pushButton', pressed: false } });
}

/** Waktu tengah (median) beberapa kali menjalankan `run`, dalam milidetik. */
function medianMs(run: () => void, times = 7): number {
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] as number;
}

describe('papan besar: 40 komponen', () => {
  const project = load(bigRaw);

  test('berkas acuan memenuhi ukuran uji: 40 komponen dan minimal 120 kabel', () => {
    expect(allComponents(project)).toHaveLength(40);
    expect(allWires(project).length).toBeGreaterThanOrEqual(120);
  });

  test('kelima motor bisa dijalankan satu per satu dan berputar ke kanan', () => {
    let result = simulate(project, {});
    for (const unit of UNITS) {
      expect(result.states[`m${unit}`]).toMatchObject({ mode: 'stopped' });
      result = press(project, result, `start${unit}`);
      expect(result.status).toBe('stable');
      expect(result.states[`k${unit}`]).toMatchObject({ pulled: true });
      expect(result.states[`m${unit}`]).toMatchObject({ mode: 'running', direction: 'cw' });
    }
    expect(result.trips).toEqual([]);
    // Lima motor berjalan bersama tanpa TOR memanas.
    let later = result;
    for (let i = 0; i < 25; i++) later = advance(project, later, TICK_SECONDS);
    expect(later).toBe(result);
  });

  // Saat cakupan diukur, kode diinstrumentasi dan berjalan beberapa kali lebih lambat, jadi
  // waktu yang terukur tidak mencerminkan aplikasi; anggaran dijaga oleh `npm test` biasa.
  test.skipIf(import.meta.env.VITE_COVERAGE === '1')(
    `mengoperasikan tombol dihitung dalam ${BUDGET_MS} ms`,
    () => {
      let running = simulate(project, {});
      for (const unit of UNITS.slice(0, 4)) running = press(project, running, `start${unit}`);
      // Pemanasan agar mesin JavaScript sudah mengoptimalkan kodenya.
      press(project, running, 'start5');

      const start = medianMs(() => press(project, running, 'start5'));
      const energize = medianMs(() => simulate(project, {}));
      const tick = medianMs(() => advance(project, running, TICK_SECONDS));
      // Menekan lalu melepas = dua kali hitung; tiap hitungan harus masuk anggaran.
      expect(start / 2).toBeLessThan(BUDGET_MS);
      expect(energize).toBeLessThan(BUDGET_MS);
      expect(tick).toBeLessThan(BUDGET_MS);
    },
  );
});
