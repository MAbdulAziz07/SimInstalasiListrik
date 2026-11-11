import { findWire } from '../core/edit';
import type { Project } from '../core/types';
import { abs } from '../sim/solver/complex';
import type { SimResult } from '../sim/types';

export type ClampReading =
  /** Tang ampere belum dijepitkan ke kabel. */
  { kind: 'idle' } | { kind: 'amps'; amps: number };

export interface ClampInput {
  wireId: string | null;
  project: Project;
  /** Hasil simulasi; `null` bila rangkaian mati. */
  sim: SimResult | null;
}

/** Jepitan hanya sah bila kabelnya masih ada di papan. */
export function wireExists(project: Project, wireId: string | null): wireId is string {
  return wireId !== null && findWire(project, wireId) !== undefined;
}

/** Arus efektif kabel yang dijepit; 0 A saat rangkaian mati. */
export function readClamp({ wireId, project, sim }: ClampInput): ClampReading {
  if (!wireExists(project, wireId)) return { kind: 'idle' };
  const current = sim?.wireCurrents[wireId];
  return { kind: 'amps', amps: current ? abs(current) : 0 };
}

/** Teks di layar tang ampere. */
export function clampText(reading: ClampReading): string {
  if (reading.kind === 'idle') return '- - - -';
  return `${reading.amps.toFixed(2).replace('.', ',')} A`;
}
