import { describe, expect, test } from 'vitest';
import latchRaw from '../../../tests/fixtures/pengunci.json?raw';
import { setSettings } from '../../core/edit';
import { parseProject, serializeProject } from '../../core/serialize';
import type { Project, TerminalRef } from '../../core/types';
import { SHORT_CIRCUIT_AMPS } from '../constants';
import { simulate, voltageBetween } from '../simulate';
import type { ComponentStates, SimResult } from '../types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const pressed = (value: boolean) => ({ kind: 'pushButton', pressed: value }) as const;
const lampVolts = (result: SimResult) => voltageBetween(result, at('h1', 'X1'), at('h1', 'X2'));
const coilVolts = (result: SimResult) => voltageBetween(result, at('k1', 'A1'), at('k1', 'A2'));

/** Menjalankan urutan penekanan tombol; keadaan tiap langkah diteruskan ke langkah berikutnya. */
function run(project: Project, steps: ComponentStates[]): SimResult {
  let result = simulate(project, {});
  for (const step of steps) result = simulate(project, { ...result.states, ...step });
  return result;
}

/** Kumparan disambung antar-fasa L1-L2 (400 V) alih-alih L1-N. */
function coilAcrossPhases(project: Project): Project {
  const copy = structuredClone(project);
  for (const wire of copy.boards.panel.wires) {
    if (wire.id === 'p5') wire.to = at('x1', '3');
  }
  return copy;
}

describe('rangkaian pengunci', () => {
  const project = load(latchRaw);

  test('awal: kontaktor lepas, lampu indikator padam', () => {
    const result = simulate(project, {});
    expect(result.states.k1).toEqual({ kind: 'contactor', pulled: false, burnt: false });
    expect(lampVolts(result)).toBeLessThan(1);
  });

  test('START ditekan: kontaktor menarik dan lampu menyala', () => {
    const result = run(project, [{ start: pressed(true) }]);
    expect(result.status).toBe('stable');
    expect(result.states.k1).toEqual({ kind: 'contactor', pulled: true, burnt: false });
    expect(coilVolts(result)).toBeCloseTo(230, 0);
    expect(lampVolts(result)).toBeCloseTo(230, 0);
  });

  test('START dilepas: kontaktor tetap menarik lewat kontak 13-14', () => {
    const result = run(project, [{ start: pressed(true) }, { start: pressed(false) }]);
    expect(result.states.k1).toMatchObject({ pulled: true });
    expect(lampVolts(result)).toBeCloseTo(230, 0);
  });

  test('STOP ditekan lalu dilepas: kontaktor lepas dan tetap lepas', () => {
    const steps: ComponentStates[] = [
      { start: pressed(true) },
      { start: pressed(false) },
      { stop: pressed(true) },
    ];
    expect(run(project, steps).states.k1).toMatchObject({ pulled: false });
    const after = run(project, [...steps, { stop: pressed(false) }]);
    expect(after.states.k1).toMatchObject({ pulled: false });
    expect(lampVolts(after)).toBeLessThan(1);
  });

  test('STOP menang atas START bila keduanya ditekan', () => {
    const result = run(project, [{ start: pressed(true), stop: pressed(true) }]);
    expect(result.states.k1).toMatchObject({ pulled: false });
  });

  test('tanpa kabel pengunci, kontaktor lepas begitu START dilepas', () => {
    const copy = structuredClone(project);
    copy.boards.panel.wires = copy.boards.panel.wires.filter((w) => w.id !== 'p7');
    const result = run(copy, [{ start: pressed(true) }, { start: pressed(false) }]);
    expect(result.states.k1).toMatchObject({ pulled: false });
  });

  test('MCB dibuka: kontaktor lepas', () => {
    const result = run(project, [
      { start: pressed(true) },
      { start: pressed(false) },
      { mcb: { kind: 'mcb', closed: false, tripped: false } },
    ]);
    expect(result.states.k1).toMatchObject({ pulled: false });
  });

  test('kontak bantu 21-22 tertutup saat lepas dan terbuka saat menarik', () => {
    const copy = structuredClone(project);
    // Lampu indikator dipindah ke kontak NC: menyala selama kontaktor lepas.
    for (const wire of copy.boards.panel.wires) {
      if (wire.id === 'p8') wire.to = at('k1', '21');
      if (wire.id === 'p9') wire.from = at('k1', '22');
    }
    expect(lampVolts(simulate(copy, {}))).toBeCloseTo(230, 0);
    expect(lampVolts(run(copy, [{ start: pressed(true) }]))).toBeLessThan(1);
  });

  test('simpan lalu muat mempertahankan setelan kumparan', () => {
    const changed = setSettings(project, 'k1', { coilVolts: 400 });
    const again = load(serializeProject(changed));
    expect(again).toEqual(changed);
    expect(again.boards.panel.components.find((c) => c.id === 'k1')?.settings).toEqual({
      coilVolts: 400,
    });
  });
});

describe('tegangan kumparan', () => {
  const project = load(latchRaw);

  test('kumparan 230 V yang diberi 400 V terbakar dan tidak menarik', () => {
    const result = run(coilAcrossPhases(project), [{ start: pressed(true) }]);
    expect(result.status).toBe('stable');
    expect(result.states.k1).toEqual({ kind: 'contactor', pulled: false, burnt: true });
    expect(result.burns).toEqual(['k1']);
    expect(coilVolts(result)).toBeGreaterThan(395);
    expect(lampVolts(result)).toBeLessThan(1);
  });

  test('kumparan yang sudah terbakar tetap rusak dan tidak dicatat lagi', () => {
    const wrong = coilAcrossPhases(project);
    const burnt = run(wrong, [{ start: pressed(true) }]);
    const later = simulate(project, { ...burnt.states, start: pressed(true) });
    expect(later.states.k1).toEqual({ kind: 'contactor', pulled: false, burnt: true });
    expect(later.burns).toEqual([]);
  });

  test('kumparan 400 V yang diberi 230 V tidak menarik dan tidak rusak', () => {
    const result = run(setSettings(project, 'k1', { coilVolts: 400 }), [{ start: pressed(true) }]);
    expect(coilVolts(result)).toBeCloseTo(230, 0);
    expect(result.states.k1).toEqual({ kind: 'contactor', pulled: false, burnt: false });
    expect(result.burns).toEqual([]);
  });

  test('kumparan 400 V yang diberi 400 V menarik', () => {
    const wired = coilAcrossPhases(setSettings(project, 'k1', { coilVolts: 400 }));
    const result = run(wired, [{ start: pressed(true) }]);
    expect(coilVolts(result)).toBeGreaterThan(395);
    expect(result.states.k1).toEqual({ kind: 'contactor', pulled: true, burnt: false });
  });

  test('setelan kumparan yang tidak sah ditolak saat berkas dibuka', () => {
    const raw = JSON.parse(latchRaw) as {
      boards: { panel: { components: Record<string, unknown>[] } };
    };
    const k1 = raw.boards.panel.components.find((c) => c.id === 'k1');
    if (k1) k1.settings = { coilVolts: 24 };
    const result = parseProject(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tegangan kumparan/);
  });
});

describe('sumber 3 fasa dan MCB 3 kutub', () => {
  /** Sumber 3 fasa → MCB 3 kutub → tiga lampu indikator dalam hubungan bintang. */
  function threePhase(): Project {
    const lampPairs = [
      ['2', 'h1'],
      ['4', 'h2'],
      ['6', 'h3'],
    ] as const;
    const project: Project = {
      boards: {
        installation: {
          components: [
            { id: 'sumber', type: 'source3ph', position: { x: 0, y: 0 }, rotation: 0 },
            { id: 'mcb', type: 'mcb3p', position: { x: 10, y: 0 }, rotation: 0 },
            ...lampPairs.map(([, id], i) => ({
              id,
              type: 'pilotLamp' as const,
              position: { x: 20 + 4 * i, y: 0 },
              rotation: 0 as const,
            })),
          ],
          wires: [],
        },
        panel: { components: [], wires: [] },
      },
    };
    const wires = project.boards.installation.wires;
    const add = (from: TerminalRef, to: TerminalRef) =>
      wires.push({ id: `k${wires.length + 1}`, from, to, color: 'black', bends: [] });
    add(at('sumber', 'L1'), at('mcb', '1'));
    add(at('sumber', 'L2'), at('mcb', '3'));
    add(at('sumber', 'L3'), at('mcb', '5'));
    for (const [pole, lamp] of lampPairs) {
      add(at('mcb', pole), at(lamp, 'X1'));
      add(at(lamp, 'X2'), at('sumber', 'N'));
    }
    return project;
  }

  test('tegangan antar-fasa 400 V ± 2 V, fasa-netral 230 V', () => {
    const result = simulate(threePhase(), {});
    for (const [a, b] of [
      ['L1', 'L2'],
      ['L2', 'L3'],
      ['L3', 'L1'],
    ] as const) {
      const volts = voltageBetween(result, at('sumber', a), at('sumber', b));
      expect(Math.abs(volts - 400)).toBeLessThanOrEqual(2);
    }
    expect(voltageBetween(result, at('sumber', 'L3'), at('sumber', 'N'))).toBeCloseTo(230, 6);
    expect(voltageBetween(result, at('sumber', 'N'), at('sumber', 'PE'))).toBe(0);
  });

  test('ketiga kutub menghantar saat tertutup dan memutus saat dibuka', () => {
    const project = threePhase();
    const closed = simulate(project, {});
    const open = simulate(project, { mcb: { kind: 'mcb', closed: false, tripped: false } });
    for (const lamp of ['h1', 'h2', 'h3']) {
      expect(voltageBetween(closed, at(lamp, 'X1'), at(lamp, 'X2'))).toBeCloseTo(230, 0);
      expect(voltageBetween(open, at(lamp, 'X1'), at(lamp, 'X2'))).toBeLessThan(1);
    }
    expect(closed.trips).toEqual([]);
  });

  test('hubung singkat antar-fasa setelah MCB: ketiga kutub trip bersama', () => {
    const project = threePhase();
    project.boards.installation.wires.push({
      id: 'gangguan',
      from: at('mcb', '2'),
      to: at('mcb', '4'),
      color: 'black',
      bends: [],
    });
    const result = simulate(project, {});
    expect(result.states.mcb).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(result.trips[0]?.amps).toBeGreaterThan(SHORT_CIRCUIT_AMPS);
    // Fasa ketiga yang tidak terganggu ikut terputus.
    expect(voltageBetween(result, at('h3', 'X1'), at('h3', 'X2'))).toBeLessThan(1);
  });
});
