import { describe, expect, test } from 'vitest';
import dolRaw from '../../tests/fixtures/dol.json?raw';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import { parseProject } from '../core/serialize';
import type { Project, TerminalRef } from '../core/types';
import { simulate } from '../sim/simulate';
import type { ComponentStates } from '../sim/types';
import { displayNote, displayText, measure, terminalExists } from './meterReading';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const ON: ComponentStates = {
  mcb: { kind: 'mcb', closed: true, tripped: false },
  saklar: { kind: 'switch', closed: true },
};

describe('multimeter mode V AC', () => {
  const project = load(lampRaw);
  const sim = simulate(project, ON);

  test('membaca tegangan antar-probe sesuai hasil simulasi', () => {
    const reading = measure({
      mode: 'vac',
      red: at('lampu', 'L'),
      black: at('lampu', 'N'),
      project,
      sim,
      states: sim.states,
    });
    expect(reading.kind).toBe('volts');
    if (reading.kind === 'volts') expect(Math.abs(reading.volts - 230)).toBeLessThanOrEqual(1);
    expect(displayText(reading)).toMatch(/^2(29,\d|30,0) V$/);
    expect(displayNote(reading)).toBeNull();
  });

  test('dua titik yang sama potensialnya terbaca 0 V', () => {
    const reading = measure({
      mode: 'vac',
      red: at('sumber', 'N'),
      black: at('lampu', 'N'),
      project,
      sim,
      states: sim.states,
    });
    expect(displayText(reading)).toBe('0,0 V');
  });

  test('rangkaian mati terbaca 0 V', () => {
    const reading = measure({
      mode: 'vac',
      red: at('lampu', 'L'),
      black: at('lampu', 'N'),
      project,
      sim: null,
      states: ON,
    });
    expect(reading).toEqual({ kind: 'volts', volts: 0 });
  });

  test('400 V ± 3 V antar-fasa di terminal motor DOL yang berjalan', () => {
    const dol = load(dolRaw);
    let result = simulate(dol, {});
    for (const pressed of [true, false]) {
      result = simulate(dol, { ...result.states, start: { kind: 'pushButton', pressed } });
    }
    const reading = measure({
      mode: 'vac',
      red: at('m1', 'U1'),
      black: at('m1', 'V1'),
      project: dol,
      sim: result,
      states: result.states,
    });
    expect(reading.kind).toBe('volts');
    if (reading.kind === 'volts') expect(Math.abs(reading.volts - 400)).toBeLessThanOrEqual(3);
  });

  test('X1 bernomor sama di kedua papan terbaca sama', () => {
    const two = load(twoBoardsRaw);
    const result = simulate(two, ON);
    const volts = (red: TerminalRef, black: TerminalRef) => {
      const reading = measure({
        mode: 'vac',
        red,
        black,
        project: two,
        sim: result,
        states: result.states,
      });
      return reading.kind === 'volts' ? reading.volts : NaN;
    };
    for (const number of ['1', '2']) {
      const outside = volts(at('panel', number), at('sumber', 'N'));
      const inside = volts(at('x1', number), at('sumber', 'N'));
      expect(outside).toBeGreaterThan(229);
      expect(inside).toBe(outside);
      expect(volts(at('panel', number), at('x1', number))).toBe(0);
    }
  });
});

describe('multimeter mode kontinuitas/Ω', () => {
  const project = load(lampRaw);

  test('saat bertegangan memberi peringatan, bukan angka', () => {
    const sim = simulate(project, ON);
    const reading = measure({
      mode: 'ohm',
      red: at('lampu', 'L'),
      black: at('lampu', 'N'),
      project,
      sim,
      states: sim.states,
    });
    expect(reading).toEqual({ kind: 'warning' });
    expect(displayText(reading)).toBe('!');
    expect(displayNote(reading)).toMatch(/Matikan tegangan/);
  });

  test('saat mati: kontak tertutup tersambung, kontak terbuka putus, lampu terbaca ohm', () => {
    const base = { mode: 'ohm', project, sim: null } as const;
    const across = { red: at('saklar', 'L'), black: at('saklar', '1') };

    const closed = measure({ ...base, ...across, states: ON });
    expect(closed).toMatchObject({ kind: 'ohms', continuity: true });
    expect(displayText(closed)).toBe('0,0 Ω');
    expect(displayNote(closed)).toBe('Tersambung.');

    const open = measure({
      ...base,
      ...across,
      states: { ...ON, saklar: { kind: 'switch', closed: false } },
    });
    expect(open).toEqual({ kind: 'open' });
    expect(displayText(open)).toBe('OL');
    expect(displayNote(open)).toMatch(/Putus/);

    const lamp = measure({
      ...base,
      red: at('lampu', 'L'),
      black: at('lampu', 'N'),
      states: ON,
    });
    expect(lamp).toMatchObject({ kind: 'ohms', continuity: false });
    expect(displayText(lamp)).toBe('881,7 Ω');
    expect(displayNote(lamp)).toBeNull();
  });

  test('resistansi besar ditulis dalam kΩ', () => {
    expect(displayText({ kind: 'ohms', ohms: 1983.75, continuity: false })).toBe('1,98 kΩ');
  });
});

describe('probe multimeter', () => {
  const project = load(lampRaw);

  test('layar kosong bila salah satu probe belum menempel', () => {
    const base = { mode: 'vac', project, sim: null, states: {} } as const;
    for (const probes of [
      { red: null, black: null },
      { red: at('lampu', 'L'), black: null },
      { red: null, black: at('lampu', 'N') },
    ]) {
      const reading = measure({ ...base, ...probes });
      expect(reading).toEqual({ kind: 'idle' });
      expect(displayText(reading)).toBe('- - - -');
      expect(displayNote(reading)).toMatch(/Tempelkan/);
    }
  });

  test('probe pada terminal yang sudah tidak ada dianggap lepas', () => {
    expect(terminalExists(project, at('lampu', 'L'))).toBe(true);
    expect(terminalExists(project, at('lampu', 'Z'))).toBe(false);
    expect(terminalExists(project, at('hilang', 'L'))).toBe(false);
    expect(terminalExists(project, null)).toBe(false);
    const reading = measure({
      mode: 'ohm',
      red: at('hilang', 'L'),
      black: at('lampu', 'N'),
      project,
      sim: null,
      states: {},
    });
    expect(reading).toEqual({ kind: 'idle' });
  });
});
