import { describe, expect, test } from 'vitest';
import dolTorRaw from '../../tests/fixtures/dol-tor.json?raw';
import { setSettings } from '../core/edit';
import { parseProject, serializeProject } from '../core/serialize';
import type { Project } from '../core/types';
import { advance, TICK_SECONDS } from './clock';
import { TOR_OVERLOAD_SECONDS, TOR_PHASE_LOSS_SECONDS } from './constants';
import { simulate } from './simulate';
import type { ComponentStates, SimResult } from './types';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const pressed = (value: boolean) => ({ kind: 'pushButton', pressed: value }) as const;

function start(project: Project): SimResult {
  let result = simulate(project, {});
  for (const step of [{ start: pressed(true) }, { start: pressed(false) }] as ComponentStates[]) {
    result = simulate(project, { ...result.states, ...step });
  }
  return result;
}

/** Memajukan waktu sampai `seconds`; mengembalikan hasil akhir dan detik saat TOR trip. */
function wait(project: Project, from: SimResult, seconds: number) {
  let result = from;
  let trippedAt: number | null = null;
  const steps = Math.round(seconds / TICK_SECONDS);
  for (let i = 1; i <= steps; i++) {
    result = advance(project, result, TICK_SECONDS);
    if (trippedAt === null && result.trips.some((t) => t.componentId === 'f2')) {
      trippedAt = i * TICK_SECONDS;
    }
  }
  return { result, trippedAt };
}

function withoutWire(project: Project, board: 'installation' | 'panel', id: string): Project {
  const copy = structuredClone(project);
  copy.boards[board].wires = copy.boards[board].wires.filter((w) => w.id !== id);
  return copy;
}

const relay = (result: SimResult) => result.states.f2;
const motor = (result: SimResult) => result.states.m1;

describe('DOL dengan TOR', () => {
  const project = load(dolTorRaw);

  test('berjalan normal: TOR tidak memanas dan tidak trip', () => {
    const running = start(project);
    expect(motor(running)).toMatchObject({ mode: 'running', direction: 'cw' });
    const { result, trippedAt } = wait(project, running, 60);
    expect(trippedAt).toBeNull();
    expect(relay(result)).toEqual({ kind: 'overload', tripped: false, heat: 0, cause: null });
    // Tanpa perubahan, memajukan waktu mengembalikan hasil yang sama persis.
    expect(advance(project, running, TICK_SECONDS)).toBe(running);
  });

  test('kehilangan satu fasa: motor mendengung, TOR trip setelah waktu tunda', () => {
    const broken = withoutWire(project, 'installation', 'i7');
    const humming = start(broken);
    expect(motor(humming)).toMatchObject({ mode: 'humming' });
    expect(relay(humming)).toMatchObject({ tripped: false, heat: 0 });

    const early = wait(broken, humming, TOR_PHASE_LOSS_SECONDS - 1);
    expect(early.trippedAt).toBeNull();
    expect(relay(early.result)).toMatchObject({ tripped: false });

    const { result, trippedAt } = wait(broken, humming, TOR_PHASE_LOSS_SECONDS + 1);
    expect(trippedAt).not.toBeNull();
    expect(Math.abs((trippedAt as number) - TOR_PHASE_LOSS_SECONDS)).toBeLessThanOrEqual(0.4);
    expect(relay(result)).toEqual({ kind: 'overload', tripped: true, heat: 1, cause: 'phaseLoss' });
  });

  test('TOR yang trip memutus rangkaian kontrol: kontaktor lepas dan motor berhenti', () => {
    const broken = withoutWire(project, 'installation', 'i7');
    const { result } = wait(broken, start(broken), TOR_PHASE_LOSS_SECONDS + 1);
    expect(result.states.k1).toMatchObject({ pulled: false });
    expect(motor(result)).toMatchObject({ mode: 'stopped' });

    // START tidak bisa menarik kontaktor selama TOR belum di-reset.
    const retry = simulate(broken, { ...result.states, start: pressed(true) });
    expect(retry.states.k1).toMatchObject({ pulled: false });
  });

  test('setelah di-reset dan fasa dipulihkan, motor bisa dijalankan lagi', () => {
    const broken = withoutWire(project, 'installation', 'i7');
    const tripped = wait(broken, start(broken), TOR_PHASE_LOSS_SECONDS + 1).result;
    let result = simulate(project, {
      ...tripped.states,
      f2: { kind: 'overload', tripped: false, heat: 0, cause: null },
    });
    result = simulate(project, { ...result.states, start: pressed(true) });
    result = simulate(project, { ...result.states, start: pressed(false) });
    expect(motor(result)).toMatchObject({ mode: 'running' });
    expect(wait(project, result, 30).trippedAt).toBeNull();
  });

  test('arus lebih: setelan TOR setengah arus motor membuatnya trip', () => {
    const low = setSettings(project, 'f2', { torAmps: 4 });
    const { result, trippedAt } = wait(low, start(low), 15);
    expect(trippedAt).not.toBeNull();
    // Arus sekitar 2 kali setelan: waktu trip kira-kira TOR_OVERLOAD_SECONDS / 2².
    expect(Math.abs((trippedAt as number) - TOR_OVERLOAD_SECONDS / 4)).toBeLessThan(1);
    expect(relay(result)).toMatchObject({ tripped: true, cause: 'overload' });
    expect(motor(result)).toMatchObject({ mode: 'stopped' });
  });

  test('arus lebih yang lebih besar membuat TOR trip lebih cepat', () => {
    const at = (amps: number) => {
      const set = setSettings(project, 'f2', { torAmps: amps });
      return wait(set, start(set), 30).trippedAt as number;
    };
    expect(at(2)).toBeLessThan(at(4));
    expect(at(4)).toBeLessThan(at(6));
  });

  test('bimetal mendingin bila gangguan hilang sebelum trip', () => {
    const broken = withoutWire(project, 'installation', 'i7');
    const warm = wait(broken, start(broken), 1).result;
    const heat = (warm.states.f2 as { heat: number }).heat;
    expect(heat).toBeGreaterThan(0.2);
    expect(heat).toBeLessThan(1);

    // Fasa dipulihkan: keadaan dibawa ke rangkaian yang sehat.
    const healed = simulate(project, warm.states);
    const cooler = wait(project, healed, 2).result;
    expect((cooler.states.f2 as { heat: number }).heat).toBeLessThan(heat);
    expect(wait(project, healed, 20).result.states.f2).toMatchObject({ heat: 0, tripped: false });
  });

  test('tanpa 95-96 di rangkaian kontrol, TOR trip tetapi motor tetap dialiri', () => {
    const bypass = structuredClone(project);
    const wires = bypass.boards.panel.wires.filter((w) => w.id !== 'c8');
    for (const wire of wires) {
      if (wire.id === 'c2') wire.to = { componentId: 'stop', terminalId: '1' };
    }
    bypass.boards.panel.wires = wires;
    const broken = withoutWire(bypass, 'installation', 'i7');
    const { result } = wait(broken, start(broken), TOR_PHASE_LOSS_SECONDS + 1);
    expect(relay(result)).toMatchObject({ tripped: true });
    expect(result.states.k1).toMatchObject({ pulled: true });
    expect(motor(result)).toMatchObject({ mode: 'humming' });
  });

  test('kontak 97-98 menutup saat TOR trip', () => {
    const copy = withoutWire(project, 'installation', 'i7');
    copy.boards.panel.components.push({
      id: 'h1',
      type: 'pilotLamp',
      position: { x: 30, y: 2 },
      rotation: 0,
    });
    const add = (id: string, from: [string, string], to: [string, string]) =>
      copy.boards.panel.wires.push({
        id,
        from: { componentId: from[0], terminalId: from[1] },
        to: { componentId: to[0], terminalId: to[1] },
        color: 'black',
        bends: [],
      });
    add('h-a', ['f1', '2'], ['f2', '97']);
    add('h-b', ['f2', '98'], ['h1', 'X1']);
    add('h-c', ['h1', 'X2'], ['x1', '4']);
    const lampVolts = (result: SimResult) => {
      const a = result.terminalVoltages['h1:X1'] ?? { re: 0, im: 0 };
      return Math.hypot(a.re, a.im);
    };
    const running = start(copy);
    expect(lampVolts(running)).toBeLessThan(1);
    expect(lampVolts(wait(copy, running, TOR_PHASE_LOSS_SECONDS + 1).result)).toBeGreaterThan(225);
  });
});

describe('setelan arus', () => {
  const project = load(dolTorRaw);

  test('MCB bernominal kecil trip seketika oleh arus motor', () => {
    const small = setSettings(project, 'q1', { mcbAmps: 1 });
    const result = start(small);
    expect(result.states.q1).toEqual({ kind: 'mcb', closed: false, tripped: true });
    expect(motor(result)).toMatchObject({ mode: 'stopped' });
  });

  test('MCB bernominal bawaan tidak trip oleh arus motor', () => {
    expect(start(project).states.q1).toEqual({ kind: 'mcb', closed: true, tripped: false });
  });

  test('setelan ikut tersimpan di berkas', () => {
    const changed = setSettings(setSettings(project, 'q1', { mcbAmps: 16 }), 'f2', {
      torAmps: 6.3,
    });
    const again = load(serializeProject(changed));
    expect(again).toEqual(changed);
  });

  test.each([
    ['q1', { mcbAmps: 7 }, /arus nominal MCB/],
    ['f2', { torAmps: 0 }, /arus setelan TOR/],
    ['f2', { torAmps: 'delapan' }, /arus setelan TOR/],
  ])('setelan tidak sah pada %s ditolak', (id, settings, message) => {
    const raw = JSON.parse(dolTorRaw) as {
      boards: { panel: { components: Record<string, unknown>[] } };
    };
    const target = raw.boards.panel.components.find((c) => c.id === id);
    if (target) target.settings = settings;
    const result = parseProject(JSON.stringify(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});
