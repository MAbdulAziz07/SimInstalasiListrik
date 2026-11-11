import { describe, expect, test } from 'vitest';
import shortRaw from '../../tests/fixtures/hubung-singkat.json?raw';
import twoGangRaw from '../../tests/fixtures/saklar-seri.json?raw';
import twoWayRaw from '../../tests/fixtures/saklar-tukar.json?raw';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { SHORT_CIRCUIT_AMPS } from './constants';
import { currentIn, initialStates, simulate, voltageBetween } from './simulate';
import { abs } from './solver/complex';
import type { SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const volts = (result: SimResult, id: string, a = 'L', b = 'N') =>
  voltageBetween(result, { componentId: id, terminalId: a }, { componentId: id, terminalId: b });

describe('saklar tukar', () => {
  const project = load(twoWayRaw);

  test.each([
    [1, 1, 230],
    [1, 2, 0],
    [2, 2, 230],
    [2, 1, 0],
  ] as const)('posisi %i dan %i: lampu %i V', (first, second, expected) => {
    const result = simulate(project, {
      tukar1: { kind: 'switch2way', position: first },
      tukar2: { kind: 'switch2way', position: second },
    });
    expect(volts(result, 'lampu')).toBeCloseTo(expected, 0);
    expect(result.trips).toEqual([]);
  });

  test('setiap perubahan salah satu saklar membalik keadaan lampu', () => {
    let states = initialStates(project);
    let lit = volts(simulate(project, states), 'lampu') > 200;
    for (const id of ['tukar1', 'tukar2', 'tukar2', 'tukar1', 'tukar2']) {
      const current = states[id];
      if (current?.kind !== 'switch2way') throw new Error('bukan saklar tukar');
      states = {
        ...states,
        [id]: { kind: 'switch2way', position: current.position === 1 ? 2 : 1 },
      };
      const now = volts(simulate(project, states), 'lampu') > 200;
      expect(now).toBe(!lit);
      lit = now;
    }
  });
});

describe('saklar seri', () => {
  const project = load(twoGangRaw);

  test.each([
    [false, false, 0, 0],
    [true, false, 230, 0],
    [false, true, 0, 230],
    [true, true, 230, 230],
  ] as const)('tuas %s dan %s: lampu %i V dan %i V', (closed1, closed2, first, second) => {
    const result = simulate(project, { seri: { kind: 'switch2gang', closed1, closed2 } });
    expect(volts(result, 'lampu1')).toBeCloseTo(first, 0);
    expect(volts(result, 'lampu2')).toBeCloseTo(second, 0);
  });
});

describe('stop kontak dan hubung singkat', () => {
  const faulty = load(shortRaw);
  const healthy = load(shortRaw);
  healthy.boards.installation.wires = healthy.boards.installation.wires.filter(
    (wire) => wire.id !== 'gangguan',
  );

  test('tanpa gangguan: 230 V antara L dan N, 0 V antara N dan PE, tidak ada trip', () => {
    const result = simulate(healthy, initialStates(healthy));
    expect(volts(result, 'stopkontak')).toBeCloseTo(230, 0);
    expect(volts(result, 'stopkontak', 'L', 'PE')).toBeCloseTo(230, 0);
    expect(volts(result, 'stopkontak', 'N', 'PE')).toBeCloseTo(0, 3);
    expect(result.trips).toEqual([]);
  });

  test('L disambung langsung ke N: MCB hulu trip dan arusnya tercatat', () => {
    const result = simulate(faulty, initialStates(faulty));
    expect(result.status).toBe('stable');
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(result.trips).toHaveLength(1);
    expect(result.trips[0]?.componentId).toBe('mcb');
    expect(result.trips[0]?.amps).toBeGreaterThan(SHORT_CIRCUIT_AMPS);
    expect(abs(currentIn(result, 'gangguan'))).toBeLessThan(0.001);
    expect(volts(result, 'stopkontak')).toBeLessThan(1);
  });

  test('menaikkan MCB saat gangguan masih ada membuatnya trip lagi', () => {
    const first = simulate(faulty, initialStates(faulty));
    const again = simulate(faulty, {
      ...first.states,
      mcb: { kind: 'mcb', closed: true, tripped: false },
    });
    expect(again.states.mcb).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(again.trips).toHaveLength(1);
  });

  test('MCB yang sudah trip tidak dicatat sebagai trip baru', () => {
    const first = simulate(faulty, initialStates(faulty));
    expect(simulate(faulty, first.states).trips).toEqual([]);
  });

  test('setelah gangguan dilepas MCB bisa dinaikkan lagi dan stop kontak bertegangan', () => {
    const tripped = simulate(faulty, initialStates(faulty)).states;
    const result = simulate(healthy, {
      ...tripped,
      mcb: { kind: 'mcb', closed: true, tripped: false },
    });
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: true, tripped: false });
    expect(volts(result, 'stopkontak')).toBeCloseTo(230, 0);
  });
});
