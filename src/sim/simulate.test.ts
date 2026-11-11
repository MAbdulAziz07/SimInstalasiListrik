import { describe, expect, test } from 'vitest';
import seriesRaw from '../../tests/fixtures/lampu-seri.json?raw';
import singleRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import { parseProject } from '../core/serialize';
import type { Project, WireColor } from '../core/types';
import { defaultBehaviors } from './behaviors';
import { MCB_NOMINAL_AMPS } from './constants';
import { currentIn, initialStates, simulate, voltageBetween } from './simulate';
import { abs } from './solver/complex';
import type { Behaviors, ComponentStates } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

/** Galat relatif di bawah 0,1%. */
function expectWithin(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-3);
}

function withState(project: Project, patch: ComponentStates): ComponentStates {
  return { ...initialStates(project), ...patch };
}

function addWire(
  project: Project,
  id: string,
  from: [string, string],
  to: [string, string],
  color: WireColor = 'black',
) {
  project.boards.installation.wires.push({
    id,
    from: { componentId: from[0], terminalId: from[1] },
    to: { componentId: to[0], terminalId: to[1] },
    color,
    bends: [],
  });
}

const lampVolts = (result: ReturnType<typeof simulate>, id = 'lampu') =>
  voltageBetween(
    result,
    { componentId: id, terminalId: 'L' },
    { componentId: id, terminalId: 'N' },
  );

describe('keadaan awal', () => {
  test('saklar terbuka dan MCB tertutup', () => {
    const states = initialStates(load(singleRaw));
    expect(states.saklar).toEqual({ kind: 'switch', closed: false });
    expect(states.mcb).toEqual({ kind: 'mcb', closed: true, tripped: false });
  });
});

describe('lampu tunggal', () => {
  const project = load(singleRaw);

  test('saklar terbuka: lampu 0 V', () => {
    const result = simulate(project, initialStates(project));
    expect(result.status).toBe('stable');
    expect(lampVolts(result)).toBeLessThan(0.01);
  });

  test('saklar tertutup: lampu 230 V dan berarus 60 W / 230 V', () => {
    const result = simulate(
      project,
      withState(project, { saklar: { kind: 'switch', closed: true } }),
    );
    expect(result.status).toBe('stable');
    expectWithin(lampVolts(result), 230);
    expectWithin(abs(currentIn(result, 'k3')), 60 / 230);
    expectWithin(abs(currentIn(result, 'k4')), 60 / 230);
  });

  test('MCB dibuka: lampu mati walau saklar tertutup', () => {
    const result = simulate(
      project,
      withState(project, {
        saklar: { kind: 'switch', closed: true },
        mcb: { kind: 'mcb', closed: false, tripped: false },
      }),
    );
    expect(lampVolts(result)).toBeLessThan(0.01);
  });

  test('saklar terbuka: terminal masuk saklar tetap bertegangan terhadap netral', () => {
    const result = simulate(project, initialStates(project));
    expectWithin(
      voltageBetween(
        result,
        { componentId: 'saklar', terminalId: 'L' },
        { componentId: 'sumber', terminalId: 'N' },
      ),
      230,
    );
  });

  test('komponen tanpa keadaan di masukan memakai keadaan awalnya', () => {
    const result = simulate(project, {});
    expect(result.states).toEqual(initialStates(project));
  });

  test('simulasi tidak mengubah proyek maupun keadaan masukan', () => {
    const states = initialStates(project);
    const before = JSON.stringify([project, states]);
    simulate(project, states);
    expect(JSON.stringify([project, states])).toBe(before);
  });
});

describe('lampu seri', () => {
  test('dua lampu seri masing-masing 115 V', () => {
    const project = load(seriesRaw);
    const result = simulate(project, initialStates(project));
    expectWithin(lampVolts(result, 'lampu1'), 115);
    expectWithin(lampVolts(result, 'lampu2'), 115);
  });
});

describe('MCB', () => {
  test('hubung singkat setelah MCB: MCB trip dan arus terputus', () => {
    const project = load(singleRaw);
    addWire(project, 'pintas', ['mcb', '2'], ['sumber', 'N']);
    const result = simulate(project, initialStates(project));
    expect(result.status).toBe('stable');
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(abs(currentIn(result, 'pintas'))).toBeLessThan(0.001);
  });

  test('MCB yang sudah trip tetap terbuka', () => {
    const project = load(singleRaw);
    const tripped: ComponentStates = { mcb: { kind: 'mcb', closed: false, tripped: true } };
    const result = simulate(project, withState(project, tripped));
    expect(result.states.mcb).toEqual(tripped.mcb);
  });

  test('beban normal tidak membuat MCB trip', () => {
    const project = load(singleRaw);
    const result = simulate(
      project,
      withState(project, { saklar: { kind: 'switch', closed: true } }),
    );
    expect(abs(currentIn(result, 'k1'))).toBeLessThan(MCB_NOMINAL_AMPS);
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: true, tripped: false });
  });
});

describe('dua papan', () => {
  test('komponen di papan Dalam Panel ikut disimulasikan', () => {
    const project = load(singleRaw);
    project.boards.panel.components.push({
      id: 'mcbPanel',
      type: 'mcb1p',
      position: { x: 2, y: 2 },
      rotation: 0,
    });
    const result = simulate(project, initialStates(project));
    expect(result.states.mcbPanel).toEqual({ kind: 'mcb', closed: true, tripped: false });
    expect(
      voltageBetween(
        result,
        { componentId: 'mcbPanel', terminalId: '1' },
        { componentId: 'mcbPanel', terminalId: '2' },
      ),
    ).toBe(0);
  });
});

describe('rangkaian yang tidak pernah stabil', () => {
  test('berhenti pada batas iterasi dengan status berosilasi', () => {
    const project = load(singleRaw);
    // Saklar tiruan yang membalik keadaannya sendiri di setiap putaran.
    const flipping: Behaviors = {
      ...defaultBehaviors,
      switch1: {
        ...defaultBehaviors.switch1,
        next: (state) => (state.kind === 'switch' ? { ...state, closed: !state.closed } : state),
      },
    };
    const result = simulate(project, initialStates(project), flipping, 20);
    expect(result.status).toBe('oscillating');
    expect(result.iterations).toBe(20);
  });
});

describe('pembacaan hasil', () => {
  test('terminal atau kabel yang tidak dikenal ditolak', () => {
    const project = load(singleRaw);
    const result = simulate(project, initialStates(project));
    expect(() => currentIn(result, 'tidak-ada')).toThrow(/kabel/i);
    expect(() =>
      voltageBetween(
        result,
        { componentId: 'lampu', terminalId: 'X' },
        { componentId: 'lampu', terminalId: 'N' },
      ),
    ).toThrow(/terminal/i);
  });
});
