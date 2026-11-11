import { findComponent } from '../core/edit';
import { shapeOf } from '../core/geometry';
import type { Project, TerminalRef } from '../core/types';
import { resistanceBetween } from '../sim/continuity';
import { voltageBetween } from '../sim/simulate';
import type { ComponentStates, SimResult } from '../sim/types';

export type MeterMode = 'vac' | 'ohm';

export const PROBES = ['red', 'black'] as const;
export type ProbeId = (typeof PROBES)[number];

export const PROBE_LABELS: Record<ProbeId, string> = { red: 'Probe merah', black: 'Probe hitam' };

/** Di bawah resistansi ini (ohm) mode kontinuitas menyatakan tersambung. */
export const CONTINUITY_OHMS = 50;

export type MeterReading =
  /** Salah satu probe belum menempel di terminal. */
  | { kind: 'idle' }
  | { kind: 'volts'; volts: number }
  | { kind: 'ohms'; ohms: number; continuity: boolean }
  /** Tidak ada jalur di antara kedua probe. */
  | { kind: 'open' }
  /** Mode kontinuitas/Ω dipakai pada rangkaian bertegangan. */
  | { kind: 'warning' };

export interface MeterInput {
  mode: MeterMode;
  red: TerminalRef | null;
  black: TerminalRef | null;
  project: Project;
  /** Hasil simulasi; `null` bila rangkaian mati. */
  sim: SimResult | null;
  /** Posisi saklar dan sejenisnya saat rangkaian mati. */
  states: ComponentStates;
}

/** Probe hanya sah bila terminalnya masih ada di papan. */
export function terminalExists(project: Project, ref: TerminalRef | null): ref is TerminalRef {
  if (!ref) return false;
  const found = findComponent(project, ref.componentId);
  return Boolean(found && shapeOf(found.component).terminals.some((t) => t.id === ref.terminalId));
}

export function measure({ mode, red, black, project, sim, states }: MeterInput): MeterReading {
  if (!terminalExists(project, red) || !terminalExists(project, black)) return { kind: 'idle' };
  if (mode === 'vac') {
    return { kind: 'volts', volts: sim ? voltageBetween(sim, red, black) : 0 };
  }
  if (sim) return { kind: 'warning' };
  const ohms = resistanceBetween(project, states, red, black);
  if (!Number.isFinite(ohms)) return { kind: 'open' };
  return { kind: 'ohms', ohms, continuity: ohms < CONTINUITY_OHMS };
}

function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

/** Teks di layar multimeter. */
export function displayText(reading: MeterReading): string {
  switch (reading.kind) {
    case 'idle':
      return '- - - -';
    case 'volts':
      return `${decimal(reading.volts, 1)} V`;
    case 'ohms':
      return reading.ohms >= 1000
        ? `${decimal(reading.ohms / 1000, 2)} kΩ`
        : `${decimal(reading.ohms, 1)} Ω`;
    case 'open':
      return 'OL';
    case 'warning':
      return '!';
  }
}

/** Keterangan di bawah layar; `null` bila angka sudah cukup jelas. */
export function displayNote(reading: MeterReading): string | null {
  switch (reading.kind) {
    case 'idle':
      return 'Tempelkan kedua probe ke terminal.';
    case 'warning':
      return 'Rangkaian bertegangan. Matikan tegangan sebelum mengukur kontinuitas/Ω.';
    case 'open':
      return 'Putus: tidak ada jalur di antara kedua probe.';
    case 'ohms':
      return reading.continuity ? 'Tersambung.' : null;
    case 'volts':
      return null;
  }
}
