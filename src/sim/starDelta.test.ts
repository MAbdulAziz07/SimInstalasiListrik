import { describe, expect, test } from 'vitest';
import forwardReverseRaw from '../../tests/fixtures/forward-reverse.json?raw';
import starDeltaRaw from '../../tests/fixtures/star-delta.json?raw';
import { DEFAULT_TIMER_SECONDS } from '../core/catalog/timer';
import { setSettings } from '../core/edit';
import { parseProject, serializeProject } from '../core/serialize';
import type { Project, TerminalRef } from '../core/types';
import { advance, TICK_SECONDS } from './clock';
import { simulate, voltageBetween } from './simulate';
import { abs } from './solver/complex';
import type { ComponentStates, SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const pressed = (value: boolean) => ({ kind: 'pushButton', pressed: value }) as const;

function step(project: Project, from: SimResult, states: ComponentStates): SimResult {
  return simulate(project, { ...from.states, ...states });
}

/** Menekan lalu melepas sebuah push button. */
function push(project: Project, from: SimResult, id: string): SimResult {
  return step(project, step(project, from, { [id]: pressed(true) }), { [id]: pressed(false) });
}

function wait(project: Project, from: SimResult, seconds: number): SimResult {
  let result = from;
  for (let i = Math.round(seconds / TICK_SECONDS); i > 0; i--) {
    result = advance(project, result, TICK_SECONDS);
  }
  return result;
}

const pulled = (result: SimResult, id: string) => (result.states[id] as { pulled: boolean }).pulled;
const winding = (result: SimResult, name: 'U' | 'V' | 'W') =>
  voltageBetween(result, at('m1', `${name}1`), at('m1', `${name}2`));
/** Arus saluran L2 di MCB daya; rangkaian kontrol menyadap L1, jadi L2 murni arus motor. */
const lineAmps = (result: SimResult) => abs(result.elementCurrents.q1?.[1] ?? { re: 0, im: 0 });

describe('star-delta dengan timer', () => {
  const project = load(starDeltaRaw);
  // k1 = kontaktor utama, k2 = bintang, k3 = segitiga, t1 = timer.
  const started = push(project, simulate(project, {}), 'start');

  test('sebelum START semua kontaktor lepas dan timer diam', () => {
    const idle = simulate(project, {});
    for (const id of ['k1', 'k2', 'k3']) expect(pulled(idle, id)).toBe(false);
    expect(idle.states.t1).toEqual({ kind: 'timer', elapsed: 0, done: false });
    expect(idle.states.m1).toMatchObject({ mode: 'stopped' });
  });

  test('START: utama dan bintang menarik, belitan 230 V ± 2 V, motor berputar ke kanan', () => {
    expect(started.status).toBe('stable');
    expect(pulled(started, 'k1')).toBe(true);
    expect(pulled(started, 'k2')).toBe(true);
    expect(pulled(started, 'k3')).toBe(false);
    for (const name of ['U', 'V', 'W'] as const) {
      expect(Math.abs(winding(started, name) - 230)).toBeLessThanOrEqual(2);
    }
    expect(started.states.m1).toEqual({ kind: 'motor', mode: 'running', direction: 'cw' });
  });

  test('sebelum waktu timer habis rangkaian tetap bintang', () => {
    const result = wait(project, started, DEFAULT_TIMER_SECONDS - 0.4);
    expect(result.states.t1).toMatchObject({ done: false });
    expect((result.states.t1 as { elapsed: number }).elapsed).toBeCloseTo(4.6, 5);
    expect(pulled(result, 'k2')).toBe(true);
    expect(pulled(result, 'k3')).toBe(false);
  });

  test('setelah waktu timer: bintang lepas, segitiga menarik, belitan 400 V ± 3 V', () => {
    const result = wait(project, started, DEFAULT_TIMER_SECONDS);
    expect(result.status).toBe('stable');
    expect(result.states.t1).toEqual({ kind: 'timer', elapsed: 5, done: true });
    expect(pulled(result, 'k1')).toBe(true);
    expect(pulled(result, 'k2')).toBe(false);
    expect(pulled(result, 'k3')).toBe(true);
    for (const name of ['U', 'V', 'W'] as const) {
      expect(Math.abs(winding(result, name) - 400)).toBeLessThanOrEqual(3);
    }
    expect(result.states.m1).toEqual({ kind: 'motor', mode: 'running', direction: 'cw' });
    expect(result.trips).toEqual([]);
    // Tidak ada yang berubah lagi setelah itu, dan TOR tidak memanas.
    const later = wait(project, result, 30);
    expect(later).toBe(result);
  });

  test('arus saluran bintang sepertiga arus segitiga (± 5%)', () => {
    const delta = wait(project, started, DEFAULT_TIMER_SECONDS);
    const ratio = lineAmps(started) / lineAmps(delta);
    expect(Math.abs(ratio - 1 / 3)).toBeLessThan(0.05 / 3);
  });

  test('bintang dan segitiga tidak pernah menarik bersamaan', () => {
    let result = started;
    for (let i = 0; i < 40; i++) {
      result = advance(project, result, TICK_SECONDS);
      expect(pulled(result, 'k2') && pulled(result, 'k3')).toBe(false);
    }
  });

  test('waktu tunda mengikuti setelan timer', () => {
    const quick = setSettings(project, 't1', { timerSeconds: 2 });
    const start = push(quick, simulate(quick, {}), 'start');
    expect(pulled(wait(quick, start, 1.8), 'k3')).toBe(false);
    expect(pulled(wait(quick, start, 2), 'k3')).toBe(true);
  });

  test('STOP mengembalikan timer ke awal; START berikutnya mulai dari bintang lagi', () => {
    const delta = wait(project, started, DEFAULT_TIMER_SECONDS);
    const stopped = push(project, delta, 'stop');
    for (const id of ['k1', 'k2', 'k3']) expect(pulled(stopped, id)).toBe(false);
    expect(stopped.states.t1).toEqual({ kind: 'timer', elapsed: 0, done: false });
    expect(stopped.states.m1).toMatchObject({ mode: 'stopped' });

    const again = push(project, stopped, 'start');
    expect(pulled(again, 'k2')).toBe(true);
    expect(pulled(again, 'k3')).toBe(false);
    expect(pulled(wait(project, again, DEFAULT_TIMER_SECONDS), 'k3')).toBe(true);
  });

  test('STOP di tengah hitungan juga mengembalikan timer ke awal', () => {
    const half = wait(project, started, 2);
    expect((half.states.t1 as { elapsed: number }).elapsed).toBeCloseTo(2, 5);
    expect(push(project, half, 'stop').states.t1).toEqual({
      kind: 'timer',
      elapsed: 0,
      done: false,
    });
  });

  test('timer berkumparan 400 V tidak bekerja pada 230 V: rangkaian tetap bintang', () => {
    const wrong = setSettings(project, 't1', { coilVolts: 400 });
    const result = wait(wrong, push(wrong, simulate(wrong, {}), 'start'), 10);
    expect(result.states.t1).toEqual({ kind: 'timer', elapsed: 0, done: false });
    expect(pulled(result, 'k2')).toBe(true);
    expect(pulled(result, 'k3')).toBe(false);
  });

  test('setelan timer ikut tersimpan di berkas', () => {
    const changed = setSettings(project, 't1', { timerSeconds: 12, coilVolts: 400 });
    expect(load(serializeProject(changed))).toEqual(changed);
  });

  test.each([
    [{ timerSeconds: 0 }, /waktu tunda timer/],
    [{ timerSeconds: 'lima' }, /waktu tunda timer/],
    [{ timerSeconds: 600 }, /waktu tunda timer/],
    [{ coilVolts: 24 }, /tegangan kumparan/],
  ])('setelan timer tidak sah %o ditolak', (settings, message) => {
    const raw = JSON.parse(starDeltaRaw) as {
      boards: { panel: { components: Record<string, unknown>[] } };
    };
    const target = raw.boards.panel.components.find((c) => c.id === 't1');
    if (target) target.settings = settings;
    const result = parseProject(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});

describe('forward-reverse', () => {
  const project = load(forwardReverseRaw);
  // k1 = maju, k2 = mundur.
  const idle = simulate(project, {});
  const both = (result: SimResult) => pulled(result, 'k1') && pulled(result, 'k2');

  test('MAJU: kontaktor pertama mengunci dan motor berputar ke kanan', () => {
    const result = push(project, idle, 'maju');
    expect(result.status).toBe('stable');
    expect(pulled(result, 'k1')).toBe(true);
    expect(pulled(result, 'k2')).toBe(false);
    expect(result.states.m1).toEqual({ kind: 'motor', mode: 'running', direction: 'cw' });
  });

  test('MUNDUR: kontaktor kedua mengunci dan motor berputar ke kiri', () => {
    const result = push(project, idle, 'mundur');
    expect(pulled(result, 'k1')).toBe(false);
    expect(pulled(result, 'k2')).toBe(true);
    expect(result.states.m1).toEqual({ kind: 'motor', mode: 'running', direction: 'ccw' });
    for (const [a, b] of [
      ['U1', 'V1'],
      ['V1', 'W1'],
      ['W1', 'U1'],
    ] as const) {
      expect(Math.abs(voltageBetween(result, at('m1', a), at('m1', b)) - 400)).toBeLessThanOrEqual(
        3,
      );
    }
  });

  test('interlock: tombol arah lawan tidak berpengaruh selama motor berjalan', () => {
    const forward = push(project, idle, 'maju');
    const held = step(project, forward, { mundur: pressed(true) });
    expect(both(held)).toBe(false);
    expect(pulled(held, 'k1')).toBe(true);
    expect(held.states.m1).toMatchObject({ direction: 'cw', mode: 'running' });
    expect(held.trips).toEqual([]);

    const reverse = push(project, idle, 'mundur');
    const heldBack = step(project, reverse, { maju: pressed(true) });
    expect(both(heldBack)).toBe(false);
    expect(pulled(heldBack, 'k2')).toBe(true);
  });

  test('membalik arah harus lewat STOP', () => {
    let result = push(project, idle, 'maju');
    result = push(project, result, 'stop');
    expect(result.states.m1).toMatchObject({ mode: 'stopped' });
    result = push(project, result, 'mundur');
    expect(result.states.m1).toMatchObject({ mode: 'running', direction: 'ccw' });
    expect(both(result)).toBe(false);
  });

  test('tanpa interlock dan kedua tombol ditekan: hubung singkat antar-fasa, MCB trip', () => {
    // Kontak interlock 21-22 pada kedua kontaktor dijembatani.
    const bypassed = structuredClone(project);
    for (const id of ['k1', 'k2']) {
      bypassed.boards.panel.wires.push({
        id: `jembatan-${id}`,
        from: at(id, '21'),
        to: at(id, '22'),
        color: 'brown',
        bends: [],
      });
    }
    const forward = push(bypassed, simulate(bypassed, {}), 'maju');
    expect(forward.states.m1).toMatchObject({ mode: 'running' });

    const result = step(bypassed, forward, { mundur: pressed(true) });
    expect(result.states.q1).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(result.trips.some((trip) => trip.componentId === 'q1')).toBe(true);
    expect(result.trips.find((trip) => trip.componentId === 'q1')?.amps).toBeGreaterThan(1000);
    expect(result.states.m1).toMatchObject({ mode: 'stopped' });
    expect(both(result)).toBe(false);
  });
});
