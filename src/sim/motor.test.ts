import { describe, expect, test } from 'vitest';
import dolRaw from '../../tests/fixtures/dol.json?raw';
import { parseProject } from '../core/serialize';
import type { Project, TerminalRef } from '../core/types';
import { MOTOR_WINDING_OHMS } from './constants';
import { currentIn, simulate, voltageBetween } from './simulate';
import { abs } from './solver/complex';
import type { ComponentStates, SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const pressed = (value: boolean) => ({ kind: 'pushButton', pressed: value }) as const;
const START: ComponentStates[] = [{ start: pressed(true) }, { start: pressed(false) }];

function run(project: Project, steps: ComponentStates[]): SimResult {
  let result = simulate(project, {});
  for (const step of steps) result = simulate(project, { ...result.states, ...step });
  return result;
}

/** Salinan proyek dengan kabel papan Instalasi yang diubah. */
function rewired(
  project: Project,
  change: (wires: Project['boards']['installation']['wires']) => void,
) {
  const copy = structuredClone(project);
  change(copy.boards.installation.wires);
  return copy;
}

const drop = (id: string) => (wires: Project['boards']['installation']['wires']) => {
  wires.splice(
    wires.findIndex((w) => w.id === id),
    1,
  );
};

/** Mengganti tiga jembatan segitiga dengan jembatan bintang W2-U2-V2. */
function toStar(wires: Project['boards']['installation']['wires']) {
  for (const id of ['j1', 'j2', 'j3']) drop(id)(wires);
  wires.push(
    { id: 's1', from: at('m1', 'W2'), to: at('m1', 'U2'), color: 'black', bends: [] },
    { id: 's2', from: at('m1', 'U2'), to: at('m1', 'V2'), color: 'black', bends: [] },
  );
}

const motorOf = (result: SimResult) => result.states.m1;
const winding = (result: SimResult, name: 'U' | 'V' | 'W') =>
  voltageBetween(result, at('m1', `${name}1`), at('m1', `${name}2`));
const lineVolts = (result: SimResult) =>
  [
    ['U1', 'V1'],
    ['V1', 'W1'],
    ['W1', 'U1'],
  ].map(([a, b]) => voltageBetween(result, at('m1', a as string), at('m1', b as string)));

describe('DOL pada dua papan', () => {
  const project = load(dolRaw);

  test('sebelum START motor berhenti', () => {
    const result = simulate(project, {});
    expect(motorOf(result)).toMatchObject({ mode: 'stopped' });
    expect(result.states.k1).toMatchObject({ pulled: false });
  });

  test('START: kontaktor mengunci, motor berputar ke kanan, 400 V ± 3 V antar-fasa', () => {
    const result = run(project, START);
    expect(result.status).toBe('stable');
    expect(result.states.k1).toMatchObject({ pulled: true });
    expect(motorOf(result)).toEqual({ kind: 'motor', mode: 'running', direction: 'cw' });
    for (const volts of lineVolts(result)) expect(Math.abs(volts - 400)).toBeLessThanOrEqual(3);
    expect(result.trips).toEqual([]);
  });

  test('STOP: motor berhenti', () => {
    const result = run(project, [...START, { stop: pressed(true) }, { stop: pressed(false) }]);
    expect(motorOf(result)).toMatchObject({ mode: 'stopped' });
    for (const volts of lineVolts(result)) expect(volts).toBeLessThan(1);
  });

  test('segitiga: 400 V per belitan dan arus saluran √3 × arus belitan', () => {
    const result = run(project, START);
    for (const name of ['U', 'V', 'W'] as const) {
      expect(Math.abs(winding(result, name) - 400)).toBeLessThanOrEqual(3);
    }
    const expected = (Math.sqrt(3) * 400) / MOTOR_WINDING_OHMS;
    expect(abs(currentIn(result, 'i5')) / expected).toBeCloseTo(1, 1);
  });

  test('bintang: 230 V per belitan dan arus saluran sepertiga arus segitiga', () => {
    const delta = run(project, START);
    const star = run(rewired(project, toStar), START);
    expect(motorOf(star)).toMatchObject({ mode: 'running', direction: 'cw' });
    for (const name of ['U', 'V', 'W'] as const) {
      expect(Math.abs(winding(star, name) - 230)).toBeLessThanOrEqual(2);
    }
    const ratio = abs(currentIn(star, 'i5')) / abs(currentIn(delta, 'i5'));
    expect(Math.abs(ratio - 1 / 3)).toBeLessThan(0.05 / 3);
  });

  test('menukar dua fasa membalik arah putar', () => {
    const swapped = rewired(project, (wires) => {
      for (const wire of wires) {
        if (wire.id === 'i5') wire.to = at('m1', 'V1');
        else if (wire.id === 'i6') wire.to = at('m1', 'U1');
      }
    });
    expect(motorOf(run(swapped, START))).toEqual({
      kind: 'motor',
      mode: 'running',
      direction: 'ccw',
    });
  });

  test('menukar ketiga fasa secara berputar tidak membalik arah', () => {
    const rotated = rewired(project, (wires) => {
      const next = { i5: 'V1', i6: 'W1', i7: 'U1' } as const;
      for (const wire of wires) {
        if (wire.id in next) wire.to = at('m1', next[wire.id as keyof typeof next]);
      }
    });
    expect(motorOf(run(rotated, START))).toMatchObject({ mode: 'running', direction: 'cw' });
  });

  test.each([['i5'], ['i6'], ['i7']])(
    'segitiga kehilangan satu fasa (%s): mendengung, tidak berputar',
    (wireId) => {
      const result = run(rewired(project, drop(wireId)), START);
      expect(motorOf(result)).toMatchObject({ mode: 'humming' });
    },
  );

  test('bintang kehilangan satu fasa: mendengung, tidak berputar', () => {
    const broken = rewired(rewired(project, toStar), drop('i7'));
    expect(motorOf(run(broken, START))).toMatchObject({ mode: 'humming' });
  });

  test('fasa hilang di papan Dalam Panel juga membuat motor mendengung', () => {
    const copy = structuredClone(project);
    copy.boards.panel.wires = copy.boards.panel.wires.filter((w) => w.id !== 'p9');
    expect(motorOf(run(copy, START))).toMatchObject({ mode: 'humming' });
  });

  test('belitan tanpa jembatan (bukan bintang, bukan segitiga): motor berhenti', () => {
    const open = rewired(project, (wires) => {
      for (const id of ['j1', 'j2', 'j3']) drop(id)(wires);
    });
    expect(motorOf(run(open, START))).toMatchObject({ mode: 'stopped' });
  });

  test('bintang dengan satu belitan terbalik: mendengung', () => {
    // U1 dan U2 tertukar: belitan U menerima tegangan berlawanan fasa.
    const reversed = rewired(rewired(project, toStar), (wires) => {
      for (const wire of wires) {
        if (wire.id === 'i5') wire.to = at('m1', 'U2');
        if (wire.id === 's1') wire.to = at('m1', 'U1');
        if (wire.id === 's2') wire.from = at('m1', 'U1');
      }
    });
    expect(motorOf(run(reversed, START))).toMatchObject({ mode: 'humming' });
  });

  test('motor yang berputar berhenti saat MCB daya dibuka', () => {
    const result = run(project, [...START, { q1: { kind: 'mcb', closed: false, tripped: false } }]);
    expect(motorOf(result)).toMatchObject({ mode: 'stopped' });
  });

  test('hubung singkat antar-fasa di terminal motor: MCB 3 kutub trip', () => {
    const shorted = rewired(project, (wires) => {
      wires.push({
        id: 'gangguan',
        from: at('m1', 'U1'),
        to: at('m1', 'V1'),
        color: 'black',
        bends: [],
      });
    });
    const result = run(shorted, START);
    expect(result.states.q1).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(motorOf(result)).toMatchObject({ mode: 'stopped' });
  });
});
