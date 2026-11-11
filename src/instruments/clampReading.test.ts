import { describe, expect, test } from 'vitest';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import starDeltaRaw from '../../tests/fixtures/star-delta.json?raw';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { advance, TICK_SECONDS } from '../sim/clock';
import { LAMP_WATTS, NOMINAL_VOLTS } from '../sim/constants';
import { simulate } from '../sim/simulate';
import type { ComponentStates, SimResult } from '../sim/types';
import { clampText, readClamp, wireExists } from './clampReading';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const ON: ComponentStates = {
  mcb: { kind: 'mcb', closed: true, tripped: false },
  saklar: { kind: 'switch', closed: true },
};

const amps = (project: Project, sim: SimResult | null, wireId: string) => {
  const reading = readClamp({ wireId, project, sim });
  return reading.kind === 'amps' ? reading.amps : NaN;
};

describe('tang ampere pada rangkaian lampu', () => {
  const project = load(lampRaw);
  const sim = simulate(project, ON);
  const lampAmps = LAMP_WATTS / NOMINAL_VOLTS;

  test('arus kabel tampil sesuai hasil simulasi, sama di kabel fasa dan netral', () => {
    for (const wireId of ['k1', 'k2', 'k3', 'k4']) {
      expect(amps(project, sim, wireId)).toBeCloseTo(lampAmps, 3);
    }
    expect(clampText(readClamp({ wireId: 'k3', project, sim }))).toBe('0,26 A');
  });

  test('0 A saat rangkaian mati', () => {
    const reading = readClamp({ wireId: 'k3', project, sim: null });
    expect(reading).toEqual({ kind: 'amps', amps: 0 });
    expect(clampText(reading)).toBe('0,00 A');
  });

  test('0 A saat saklar terbuka', () => {
    const off = simulate(project, { ...ON, saklar: { kind: 'switch', closed: false } });
    expect(amps(project, off, 'k3')).toBeLessThan(0.001);
  });

  test('layar kosong bila belum dijepitkan atau kabelnya sudah tidak ada', () => {
    expect(wireExists(project, 'k3')).toBe(true);
    expect(wireExists(project, 'hilang')).toBe(false);
    expect(wireExists(project, null)).toBe(false);
    for (const wireId of [null, 'hilang']) {
      const reading = readClamp({ wireId, project, sim });
      expect(reading).toEqual({ kind: 'idle' });
      expect(clampText(reading)).toBe('- - - -');
    }
  });
});

describe('tang ampere pada star-delta', () => {
  const project = load(starDeltaRaw);
  let star = simulate(project, {});
  for (const pressed of [true, false]) {
    star = simulate(project, { ...star.states, start: { kind: 'pushButton', pressed } });
  }
  let delta = star;
  for (let i = 0; i < 6 / TICK_SECONDS; i++) delta = advance(project, delta, TICK_SECONDS);

  // Kabel suplai di papan Instalasi: sumber ke terminal X1.
  test.each([['i1'], ['i2'], ['i3']])(
    'kabel suplai %s: bacaan bintang sepertiga bacaan segitiga (± 5%%)',
    (wireId) => {
      const ratio = amps(project, star, wireId) / amps(project, delta, wireId);
      expect(Math.abs(ratio - 1 / 3)).toBeLessThan(0.05 / 3);
    },
  );

  test('kabel ke belitan motor: arus belitan naik √3 kali dari bintang ke segitiga', () => {
    // i5 = X1 ke U1; saat segitiga kabel ini membawa arus belitan, bukan arus saluran.
    const ratio = amps(project, delta, 'i5') / amps(project, star, 'i5');
    expect(ratio).toBeCloseTo(Math.sqrt(3), 1);
  });

  test('netral motor tiga fasa seimbang hampir tanpa arus', () => {
    expect(amps(project, delta, 'i4')).toBeLessThan(0.2);
  });
});
