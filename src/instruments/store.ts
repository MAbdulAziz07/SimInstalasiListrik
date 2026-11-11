import { create } from 'zustand';
import type { Point, TerminalRef } from '../core/types';
import type { MeterMode, ProbeId } from './meterReading';

interface InstrumentState {
  /** Multimeter sedang ditampilkan. */
  meterOpen: boolean;
  mode: MeterMode;
  /** Terminal tempat tiap probe menempel; bisa di papan mana pun. */
  probes: Record<ProbeId, TerminalRef | null>;
  /** Probe yang sedang dibawa penunjuk untuk ditempelkan. */
  picking: ProbeId | null;
  /** Posisi penunjuk (piksel layar) saat probe mulai dibawa; membedakan klik dari seretan. */
  pickOrigin: Point | null;

  /** Tang ampere sedang ditampilkan. */
  clampOpen: boolean;
  /** Id kabel yang dijepit tang ampere; bisa di papan mana pun. */
  clampWire: string | null;
  /** Tang ampere sedang dibawa penunjuk untuk dijepitkan. */
  clampPicking: boolean;
  clampOrigin: Point | null;

  /** Tespen sedang ditampilkan. */
  testerOpen: boolean;
  /** Terminal yang disentuh tespen; bisa di papan mana pun. */
  testerAt: TerminalRef | null;
  /** Tespen sedang dibawa penunjuk untuk disentuhkan. */
  testerPicking: boolean;
  testerOrigin: Point | null;

  toggleTester(): void;
  startTesterPicking(origin?: Point): void;
  cancelTesterPicking(): void;
  touchTester(ref: TerminalRef): void;
  liftTester(): void;

  toggleClamp(): void;
  startClampPicking(origin?: Point): void;
  cancelClampPicking(): void;
  clampOn(wireId: string): void;
  unclamp(): void;

  toggleMeter(): void;
  setMode(mode: MeterMode): void;
  startPicking(probe: ProbeId, origin?: Point): void;
  cancelPicking(): void;
  /** Menempelkan probe yang sedang dibawa ke sebuah terminal. */
  attach(ref: TerminalRef): void;
  detach(probe: ProbeId): void;
}

const NO_PROBES: Record<ProbeId, TerminalRef | null> = { red: null, black: null };

/** Tidak ada alat yang sedang dibawa; hanya satu alat dibawa penunjuk pada satu waktu. */
const NOTHING_CARRIED = {
  picking: null,
  pickOrigin: null,
  clampPicking: false,
  clampOrigin: null,
  testerPicking: false,
  testerOrigin: null,
} as const;

export const useInstruments = create<InstrumentState>((set, get) => ({
  meterOpen: false,
  mode: 'vac',
  probes: NO_PROBES,
  picking: null,
  pickOrigin: null,

  testerOpen: false,
  testerAt: null,
  testerPicking: false,
  testerOrigin: null,

  // Menyimpan tespen juga mengangkatnya dari terminal.
  toggleTester: () =>
    set(
      get().testerOpen
        ? { testerOpen: false, testerAt: null, testerPicking: false, testerOrigin: null }
        : { testerOpen: true },
    ),

  startTesterPicking: (origin) =>
    set({ ...NOTHING_CARRIED, testerPicking: true, testerOrigin: origin ?? null }),

  cancelTesterPicking: () => set({ testerPicking: false, testerOrigin: null }),

  touchTester: (ref) => {
    if (get().testerPicking) set({ testerAt: ref, testerPicking: false, testerOrigin: null });
  },

  liftTester: () => set({ testerAt: null }),

  clampOpen: false,
  clampWire: null,
  clampPicking: false,
  clampOrigin: null,

  // Menyimpan tang ampere juga melepas jepitannya.
  toggleClamp: () =>
    set(
      get().clampOpen
        ? { clampOpen: false, clampWire: null, clampPicking: false, clampOrigin: null }
        : { clampOpen: true },
    ),

  startClampPicking: (origin) =>
    set({ ...NOTHING_CARRIED, clampPicking: true, clampOrigin: origin ?? null }),

  cancelClampPicking: () => set({ clampPicking: false, clampOrigin: null }),

  clampOn: (wireId) => {
    if (get().clampPicking) set({ clampWire: wireId, clampPicking: false, clampOrigin: null });
  },

  unclamp: () => set({ clampWire: null }),

  // Menyimpan multimeter juga melepas kedua probenya.
  toggleMeter: () =>
    set(
      get().meterOpen
        ? { meterOpen: false, probes: NO_PROBES, picking: null, pickOrigin: null }
        : { meterOpen: true },
    ),

  setMode: (mode) => set({ mode }),

  startPicking: (probe, origin) =>
    set({ ...NOTHING_CARRIED, picking: probe, pickOrigin: origin ?? null }),

  cancelPicking: () => set({ picking: null, pickOrigin: null }),

  attach: (ref) => {
    const { picking, probes } = get();
    if (!picking) return;
    set({ probes: { ...probes, [picking]: ref }, picking: null, pickOrigin: null });
  },

  detach: (probe) => set({ probes: { ...get().probes, [probe]: null } }),
}));
