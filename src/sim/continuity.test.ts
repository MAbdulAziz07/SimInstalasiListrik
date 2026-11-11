import { describe, expect, test } from 'vitest';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import latchRaw from '../../tests/fixtures/pengunci.json?raw';
import { parseProject } from '../core/serialize';
import type { Project, TerminalRef } from '../core/types';
import { COIL_POWER_FACTOR, COIL_VA, LAMP_WATTS, NOMINAL_VOLTS } from './constants';
import { resistanceBetween } from './continuity';
import type { ComponentStates } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const mcb = (closed: boolean) => ({ kind: 'mcb', closed, tripped: false }) as const;
const sw = (closed: boolean) => ({ kind: 'switch', closed }) as const;

describe('resistansi rangkaian mati: lampu tunggal', () => {
  const project = load(lampRaw);
  const closed: ComponentStates = { mcb: mcb(true), saklar: sw(true) };
  const open: ComponentStates = { mcb: mcb(true), saklar: sw(false) };

  test('saklar tertutup tersambung, saklar terbuka putus', () => {
    expect(resistanceBetween(project, closed, at('saklar', 'L'), at('saklar', '1'))).toBeLessThan(
      0.01,
    );
    expect(resistanceBetween(project, open, at('saklar', 'L'), at('saklar', '1'))).toBe(Infinity);
  });

  test('lampu terbaca sebesar resistansinya', () => {
    const expected = NOMINAL_VOLTS ** 2 / LAMP_WATTS;
    for (const states of [closed, open]) {
      const ohms = resistanceBetween(project, states, at('lampu', 'L'), at('lampu', 'N'));
      // Konduktansi bocor tiap simpul (1 GΩ) menggeser bacaan beberapa mΩ.
      expect(ohms).toBeCloseTo(expected, 1);
    }
  });

  test('jalur lewat kabel dan kontak tertutup hampir nol ohm', () => {
    const ohms = resistanceBetween(project, closed, at('sumber', 'L'), at('lampu', 'L'));
    // Tiga kabel 10 mΩ dan dua kontak 1 mΩ.
    expect(ohms).toBeCloseTo(0.032, 4);
  });

  test('MCB terbuka memutus jalur', () => {
    const states: ComponentStates = { mcb: mcb(false), saklar: sw(true) };
    expect(resistanceBetween(project, states, at('sumber', 'L'), at('lampu', 'L'))).toBe(Infinity);
  });

  test('sumber yang mati tidak menjadi jalur: fasa ke netral terbaca lewat lampu', () => {
    const expected = NOMINAL_VOLTS ** 2 / LAMP_WATTS;
    const ohms = resistanceBetween(project, closed, at('sumber', 'L'), at('sumber', 'N'));
    expect(ohms).toBeCloseTo(expected + 0.042, 2);
    expect(resistanceBetween(project, open, at('sumber', 'L'), at('sumber', 'N'))).toBe(Infinity);
  });

  test('terminal yang sama terbaca nol; arah probe tidak berpengaruh', () => {
    expect(resistanceBetween(project, closed, at('lampu', 'L'), at('lampu', 'L'))).toBe(0);
    const forward = resistanceBetween(project, closed, at('sumber', 'L'), at('lampu', 'N'));
    const backward = resistanceBetween(project, closed, at('lampu', 'N'), at('sumber', 'L'));
    expect(forward).toBeCloseTo(backward, 1);
  });

  test('terminal yang tidak ada ditolak', () => {
    expect(() => resistanceBetween(project, closed, at('lampu', 'L'), at('lampu', 'Z'))).toThrow(
      /tidak ada/,
    );
  });
});

describe('resistansi rangkaian mati: kumparan dan dua papan', () => {
  test('kumparan kontaktor terbaca sebesar resistansi kawatnya, bukan impedansinya', () => {
    const project = load(latchRaw);
    const ohms = resistanceBetween(project, {}, at('k1', 'A1'), at('k1', 'A2'));
    expect(ohms).toBeCloseTo((NOMINAL_VOLTS ** 2 / COIL_VA) * COIL_POWER_FACTOR, 1);
  });

  test('kontak NO kontaktor yang lepas putus; kontak NC tersambung', () => {
    const project = load(latchRaw);
    expect(resistanceBetween(project, {}, at('k1', '13'), at('k1', '14'))).toBe(Infinity);
    expect(resistanceBetween(project, {}, at('k1', '21'), at('k1', '22'))).toBeLessThan(0.01);
  });

  test('X1 bernomor sama di kedua papan adalah satu titik', () => {
    const project = load(twoBoardsRaw);
    expect(resistanceBetween(project, {}, at('panel', '1'), at('x1', '1'))).toBe(0);
    expect(resistanceBetween(project, {}, at('panel', '2'), at('x1', '2'))).toBe(0);
  });

  test('jalur antar-papan lewat MCB di Dalam Panel', () => {
    const project = load(twoBoardsRaw);
    const closed = resistanceBetween(
      project,
      { mcb: mcb(true) },
      at('panel', '1'),
      at('panel', '2'),
    );
    expect(closed).toBeCloseTo(0.021, 4);
    const open = resistanceBetween(
      project,
      { mcb: mcb(false) },
      at('panel', '1'),
      at('panel', '2'),
    );
    expect(open).toBe(Infinity);
  });
});
