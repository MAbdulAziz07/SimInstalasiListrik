import type { Project, TerminalRef } from '../core/types';
import { terminalKey } from '../sim/network';
import { abs } from '../sim/solver/complex';
import type { SimResult } from '../sim/types';
import { terminalExists } from './meterReading';

/** Tegangan terhadap tanah (volt) yang membuat lampu tespen menyala. */
export const TESTER_VOLTS = 50;

/** `idle`: belum disentuhkan ke terminal. */
export type TesterReading = 'idle' | 'lit' | 'dark';

export interface TesterInput {
  at: TerminalRef | null;
  project: Project;
  /** Hasil simulasi; `null` bila rangkaian mati. */
  sim: SimResult | null;
}

/**
 * Tespen menyala bila terminal yang disentuh bertegangan terhadap tanah: terminal fasa yang
 * hidup. Netral, PE, dan rangkaian yang mati tidak menyalakannya.
 */
export function readTester({ at, project, sim }: TesterInput): TesterReading {
  if (!terminalExists(project, at)) return 'idle';
  const voltage = sim?.terminalVoltages[terminalKey(at.componentId, at.terminalId)];
  return voltage && abs(voltage) > TESTER_VOLTS ? 'lit' : 'dark';
}

export function testerText(reading: TesterReading): string {
  if (reading === 'idle') return '- - - -';
  return reading === 'lit' ? 'MENYALA' : 'PADAM';
}
