/** Dua papan kerja: keseluruhan instalasi dan isi panel. */
export const BOARD_IDS = ['installation', 'panel'] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const COMPONENT_TYPES = [
  'source1ph',
  'mcb1p',
  'switch1',
  'switch2gang',
  'switch2way',
  'socket',
  'lamp',
  'panel',
  'terminalBlock',
  'source3ph',
  'mcb3p',
  'contactor',
  'pushButtonNO',
  'pushButtonNC',
  'pilotLamp',
  'motor',
  'overloadRelay',
  'timer',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export type ComponentGroup =
  'source' | 'panel' | 'protection' | 'lighting' | 'control' | 'load' | 'instrument';

/** Warna kabel menurut PUIL 2011: L1, L2, L3, N, PE. */
export const WIRE_COLORS = ['brown', 'black', 'grey', 'blue', 'green-yellow'] as const;
export type WireColor = (typeof WIRE_COLORS)[number];

export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rotation = (typeof ROTATIONS)[number];

/** Koordinat dalam satuan grid papan. */
export interface Point {
  x: number;
  y: number;
}

/** Letak terminal relatif terhadap sudut kiri-atas komponen sebelum diputar. */
export interface TerminalDef {
  id: string;
  x: number;
  y: number;
}

export type ComponentState =
  | { kind: 'source' }
  | { kind: 'mcb'; closed: boolean; tripped: boolean }
  | { kind: 'switch'; closed: boolean }
  /** Saklar seri: dua tuas dengan satu terminal masuk. */
  | { kind: 'switch2gang'; closed1: boolean; closed2: boolean }
  /** Saklar tukar: terminal C tersambung ke terminal 1 atau 2. */
  | { kind: 'switch2way'; position: 1 | 2 }
  | { kind: 'socket' }
  /** `burnt`: kumparan rusak karena tegangan lebih; tetap rusak sampai kontaktor diganti. */
  | { kind: 'contactor'; pulled: boolean; burnt: boolean }
  | { kind: 'pushButton'; pressed: boolean }
  /**
   * TOR. `heat` 0..1 adalah panas bimetal; trip saat mencapai 1. `cause` mencatat penyebab trip
   * terakhir sampai TOR di-reset.
   */
  | { kind: 'overload'; tripped: boolean; heat: number; cause: 'overload' | 'phaseLoss' | null }
  /**
   * Timer on-delay. `elapsed` adalah lama kumparan sudah bertegangan (detik); `done` berarti
   * waktu tunda tercapai dan kontak 15 berpindah dari 16 ke 18.
   */
  | { kind: 'timer'; elapsed: number; done: boolean }
  /**
   * `humming`: bertegangan tetapi medan putarnya tidak terbentuk (mis. kehilangan satu fasa).
   * `direction` hanya berarti saat `running`: `cw` untuk urutan fasa L1-L2-L3 di U1-V1-W1.
   */
  | { kind: 'motor'; mode: 'stopped' | 'running' | 'humming'; direction: 'cw' | 'ccw' }
  /** Komponen tanpa keadaan: panel listrik dan terminal blok. */
  | { kind: 'none' }
  | { kind: 'lamp' };

/** Setelan per komponen yang ikut tersimpan di berkas. */
export interface ComponentSettings {
  /** Label tiap terminal X1 (boleh kosong); panjangnya adalah jumlah terminal. */
  x1Labels?: string[];
  /** Tegangan kerja kumparan kontaktor atau timer (volt AC). */
  coilVolts?: CoilVolts;
  /** Arus nominal MCB (ampere). */
  mcbAmps?: McbAmps;
  /** Arus setelan TOR (ampere). */
  torAmps?: number;
  /** Waktu tunda timer (detik). */
  timerSeconds?: number;
}

export const TIMER_SECONDS_MIN = 1;
export const TIMER_SECONDS_MAX = 60;

export const MCB_AMPS = [1, 2, 4, 6, 10, 16, 20, 25, 32] as const;
export type McbAmps = (typeof MCB_AMPS)[number];

export const TOR_AMPS_MIN = 0.5;
export const TOR_AMPS_MAX = 32;

export const COIL_VOLTS = [230, 400] as const;
export type CoilVolts = (typeof COIL_VOLTS)[number];

/** Ukuran dan letak terminal sebuah komponen. */
export interface Shape {
  size: { w: number; h: number };
  terminals: readonly TerminalDef[];
}

export interface ComponentDef {
  type: ComponentType;
  /** Nama yang tampil ke pengguna. */
  label: string;
  /** Nama singkat yang muat di dalam gambar komponen. */
  shortLabel: string;
  group: ComponentGroup;
  /** Papan tempat komponen ini boleh dipasang. */
  boards: readonly BoardId[];
  size: { w: number; h: number };
  terminals: readonly TerminalDef[];
  initialState: ComponentState;
  /** Bentuk yang bergantung pada setelan; tanpa ini dipakai `size` dan `terminals`. */
  shape?(settings: ComponentSettings): Shape;
  /** Setelan awal saat komponen ditaruh. */
  defaultSettings?: ComponentSettings;
  /** Dipasang dan dihapus otomatis oleh aplikasi, tidak muncul di palet. */
  managed?: boolean;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: Point;
  rotation: Rotation;
  settings?: ComponentSettings;
}

export interface TerminalRef {
  componentId: string;
  terminalId: string;
}

export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  color: WireColor;
  /** Titik belok kabel, berurutan dari `from` ke `to`. */
  bends: Point[];
}

export interface Board {
  components: PlacedComponent[];
  wires: Wire[];
}

export interface Project {
  boards: Record<BoardId, Board>;
}

export function createEmptyProject(): Project {
  return {
    boards: {
      installation: { components: [], wires: [] },
      panel: { components: [], wires: [] },
    },
  };
}
