import type { ComponentSettings, ComponentState, ComponentType } from '../core/types';
import type { Complex } from './solver/complex';

/** Keadaan tiap komponen, dikunci dengan id komponen. */
export type ComponentStates = Record<string, ComponentState>;

/** Cabang listrik di dalam komponen, di antara dua terminalnya sendiri. */
export interface Element {
  a: string;
  b: string;
  admittance: Complex;
}

/** Terminal yang tegangannya ditentukan komponen (sumber). */
export interface FixedTerminal {
  terminal: string;
  voltage: Complex;
}

/** Hasil perhitungan yang dilihat sebuah komponen saat menentukan keadaan barunya. */
export interface Reading {
  /** Tegangan terminal terhadap acuan 0 V. */
  voltageAt(terminal: string): Complex;
  /** Arus tiap elemen, berurutan seperti keluaran `elements`, positif dari `a` ke `b`. */
  elementCurrents: readonly Complex[];
}

export interface Behavior {
  /** Terminal bertegangan tetap; hanya dimiliki sumber. */
  fixed?(state: ComponentState): FixedTerminal[];
  /** Cabang listrik komponen pada keadaan ini. */
  elements(state: ComponentState, settings: ComponentSettings): Element[];
  /** Keadaan baru setelah melihat hasil perhitungan; tanpa ini keadaan tidak berubah sendiri. */
  next?(state: ComponentState, reading: Reading, settings: ComponentSettings): ComponentState;
  /** Keadaan setelah waktu maju `seconds` detik; untuk komponen yang bergantung waktu. */
  tick?(
    state: ComponentState,
    reading: Reading,
    settings: ComponentSettings,
    seconds: number,
  ): ComponentState;
}

export type Behaviors = Record<ComponentType, Behavior>;

/** Pengaman yang trip selama perhitungan, beserta arus yang memutusnya. */
export interface Trip {
  componentId: string;
  /** Arus sesaat sebelum trip (ampere). */
  amps: number;
}

export interface SimResult {
  /** `oscillating`: keadaan komponen tidak kunjung stabil sampai batas iterasi. */
  status: 'stable' | 'oscillating';
  iterations: number;
  states: ComponentStates;
  /** Tegangan tiap terminal terhadap acuan 0 V; kunci dari `terminalKey`. */
  terminalVoltages: Record<string, Complex>;
  /** Arus tiap kabel, positif dari `from` ke `to`; kunci id kabel. */
  wireCurrents: Record<string, Complex>;
  /** Arus tiap elemen komponen; kunci id komponen. */
  elementCurrents: Record<string, Complex[]>;
  /** Pengaman yang trip pada perhitungan ini; kosong bila tidak ada gangguan. */
  trips: Trip[];
  /** Id komponen yang kumparannya terbakar pada perhitungan ini. */
  burns: string[];
}

/** Mempersempit keadaan ke jenis yang diharapkan sebuah perilaku. */
export function stateOf<K extends ComponentState['kind']>(
  state: ComponentState,
  kind: K,
): Extract<ComponentState, { kind: K }> {
  if (state.kind !== kind) {
    throw new Error(`Keadaan komponen berjenis "${state.kind}", seharusnya "${kind}".`);
  }
  return state as Extract<ComponentState, { kind: K }>;
}
