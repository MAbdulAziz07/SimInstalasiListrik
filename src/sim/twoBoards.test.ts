import { describe, expect, test } from 'vitest';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import { setX1Labels } from '../core/edit';
import { parseProject, serializeProject } from '../core/serialize';
import type { Project } from '../core/types';
import { simulate, voltageBetween } from './simulate';
import { abs, sub } from './solver/complex';
import type { ComponentStates, SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const ON: ComponentStates = { saklar: { kind: 'switch', closed: true } };
const lampVolts = (result: SimResult) =>
  voltageBetween(
    result,
    { componentId: 'lampu', terminalId: 'L' },
    { componentId: 'lampu', terminalId: 'N' },
  );

function without(project: Project, board: 'installation' | 'panel', wireId: string): Project {
  const copy = structuredClone(project);
  copy.boards[board].wires = copy.boards[board].wires.filter((w) => w.id !== wireId);
  return copy;
}

describe('lampu dengan MCB di papan Dalam Panel', () => {
  const project = load(twoBoardsRaw);

  test('arus lewat X1 ke MCB di dalam panel dan kembali: lampu 230 V', () => {
    expect(lampVolts(simulate(project, ON))).toBeCloseTo(230, 0);
    expect(lampVolts(simulate(project, {}))).toBeCloseTo(0, 3);
  });

  test('MCB di dalam panel memutus lampu di papan Instalasi', () => {
    const result = simulate(project, {
      ...ON,
      mcb: { kind: 'mcb', closed: false, tripped: false },
    });
    expect(lampVolts(result)).toBeCloseTo(0, 3);
  });

  test('X1 bernomor sama bertegangan sama di kedua papan', () => {
    const result = simulate(project, ON);
    for (const n of ['1', '2', '3', '4']) {
      const outside = result.terminalVoltages[`panel:${n}`];
      const inside = result.terminalVoltages[`x1:${n}`];
      expect(outside).toBeDefined();
      expect(inside).toBeDefined();
      if (outside && inside) expect(abs(sub(outside, inside))).toBe(0);
    }
    expect(abs(result.terminalVoltages['x1:1'] ?? { re: 0, im: 0 })).toBeCloseTo(230, 0);
    // X1:3 tidak tersambung ke mana pun.
    expect(abs(result.terminalVoltages['x1:3'] ?? { re: 1, im: 0 })).toBeLessThan(1);
  });

  test.each([
    ['installation', 'k1'],
    ['installation', 'k2'],
    ['panel', 'p1'],
    ['panel', 'p2'],
  ] as const)('melepas kabel X1 di papan %s (%s) memadamkan lampu', (board, wireId) => {
    expect(lampVolts(simulate(without(project, board, wireId), ON))).toBeLessThan(1);
  });

  test('hubung singkat di papan Instalasi membuat MCB di dalam panel trip', () => {
    const faulty = structuredClone(project);
    faulty.boards.installation.wires.push({
      id: 'gangguan',
      from: { componentId: 'panel', terminalId: '2' },
      to: { componentId: 'sumber', terminalId: 'N' },
      color: 'black',
      bends: [],
    });
    const result = simulate(faulty, {});
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(result.trips.map((t) => t.componentId)).toEqual(['mcb']);
  });

  test('simpan lalu muat menghasilkan simulasi yang identik', () => {
    const again = load(serializeProject(project));
    expect(again).toEqual(project);
    expect(simulate(again, ON)).toEqual(simulate(project, ON));
  });

  test('mengurangi terminal X1 ke batas minimum tidak memutus X1:1 dan X1:2', () => {
    const shrunk = setX1Labels(project, ['L']);
    expect(shrunk.boards.installation.wires).toHaveLength(4);
    expect(lampVolts(simulate(shrunk, ON))).toBeCloseTo(230, 0);
  });
});
