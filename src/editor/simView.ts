import { coilVoltsOf } from '../core/catalog/contactor';
import { torAmpsOf } from '../core/catalog/overloadRelay';
import { findComponent } from '../core/edit';
import type { ComponentState, ComponentType, PlacedComponent, Project, Wire } from '../core/types';
import { catalog } from '../core/catalog';
import { NOMINAL_VOLTS, SHORT_CIRCUIT_AMPS } from '../sim/constants';
import { terminalKey } from '../sim/network';
import { voltageBetween } from '../sim/simulate';
import { abs } from '../sim/solver/complex';
import type { ComponentStates, SimResult } from '../sim/types';

/** Tegangan terhadap tanah (volt) di atas ini dianggap bertegangan. */
export const LIVE_VOLTS = 50;

/** Daya lampu di bawah bagian ini dari daya nominalnya dianggap padam. */
const LAMP_OFF_RATIO = 0.01;
/** Di bawah bagian ini lampu disebut redup. */
const LAMP_DIM_RATIO = 0.8;

/**
 * Keadaan komponen yang bisa dioperasikan pengguna setelah diklik; `null` bila tidak bisa.
 * `part` memilih tuas pada komponen bertuas lebih dari satu (saklar seri: 0 atau 1).
 */
export function toggled(state: ComponentState, part = 0): ComponentState | null {
  if (state.kind === 'switch') return { kind: 'switch', closed: !state.closed };
  if (state.kind === 'switch2gang') {
    return part === 0
      ? { ...state, closed1: !state.closed1 }
      : { ...state, closed2: !state.closed2 };
  }
  if (state.kind === 'switch2way') {
    return { kind: 'switch2way', position: state.position === 1 ? 2 : 1 };
  }
  // TOR hanya bisa di-reset setelah trip.
  if (state.kind === 'overload') {
    return state.tripped ? { kind: 'overload', tripped: false, heat: 0, cause: null } : null;
  }
  // Menaikkan tuas MCB juga menghapus tanda trip.
  if (state.kind === 'mcb') return { kind: 'mcb', closed: !state.closed, tripped: false };
  return null;
}

/** Keadaan komponen untuk digambar: posisi terakhirnya, atau keadaan awal dari katalog. */
export function stateFor(component: PlacedComponent, states: ComponentStates): ComponentState {
  return states[component.id] ?? catalog[component.type].initialState;
}

/** Keterangan keadaan motor untuk ditampilkan. */
export function motorText(state: Extract<ComponentState, { kind: 'motor' }>): string {
  if (state.mode === 'humming') return 'MENDENGUNG';
  if (state.mode === 'stopped') return 'BERHENTI';
  return state.direction === 'cw' ? 'PUTAR KANAN' : 'PUTAR KIRI';
}

/** Terminal lampu menurut jenisnya; `undefined` untuk komponen yang bukan lampu. */
const LAMP_TERMINALS: Partial<Record<ComponentType, readonly [string, string]>> = {
  lamp: ['L', 'N'],
  pilotLamp: ['X1', 'X2'],
};

export function isLampType(type: ComponentType): boolean {
  return type in LAMP_TERMINALS;
}

/** Daya lampu dibanding daya nominalnya (0–1); lampu dianggap beban resistif. */
export function lampBrightness(result: SimResult, component: PlacedComponent): number {
  const [a, b] = LAMP_TERMINALS[component.type] ?? ['L', 'N'];
  const volts = voltageBetween(
    result,
    { componentId: component.id, terminalId: a },
    { componentId: component.id, terminalId: b },
  );
  return Math.min(1, (volts / NOMINAL_VOLTS) ** 2);
}

/**
 * Keadaan komponen setelah tegangan dimatikan: tombol tekan lepas, kontaktor jatuh, dan
 * timer kembali ke awal.
 * Posisi saklar, tuas MCB, dan kumparan yang terbakar tetap.
 */
export function deenergized(states: ComponentStates): ComponentStates {
  const next: ComponentStates = {};
  for (const [id, state] of Object.entries(states)) {
    if (state.kind === 'pushButton') next[id] = { kind: 'pushButton', pressed: false };
    else if (state.kind === 'contactor') next[id] = { ...state, pulled: false };
    else if (state.kind === 'motor') next[id] = { ...state, mode: 'stopped' };
    else if (state.kind === 'overload' && !state.tripped) next[id] = { ...state, heat: 0 };
    else if (state.kind === 'timer') next[id] = { kind: 'timer', elapsed: 0, done: false };
    else next[id] = state;
  }
  return next;
}

export type LampLevel = 'padam' | 'redup' | 'menyala';

export function lampLevel(brightness: number): LampLevel {
  if (brightness < LAMP_OFF_RATIO) return 'padam';
  return brightness < LAMP_DIM_RATIO ? 'redup' : 'menyala';
}

/** Kabel bertegangan: salah satu ujungnya bertegangan terhadap tanah. */
export function isWireLive(result: SimResult, wire: Wire): boolean {
  return [wire.from, wire.to].some((end) => {
    const voltage = result.terminalVoltages[terminalKey(end.componentId, end.terminalId)];
    return voltage !== undefined && abs(voltage) > LIVE_VOLTS;
  });
}

function formatAmps(amps: number): string {
  const rounded = amps < 100 ? Math.round(amps * 10) / 10 : Math.round(amps);
  return `${rounded.toLocaleString('id-ID')} A`;
}

/** Pesan gangguan untuk pengguna dari hasil simulasi; `null` bila tidak ada gangguan. */
export function faultNotice(result: SimResult, project: Project): string | null {
  const burntId = result.burns[0];
  const burnt = burntId === undefined ? undefined : findComponent(project, burntId)?.component;
  if (burnt) {
    const volts = voltageBetween(
      result,
      { componentId: burnt.id, terminalId: 'A1' },
      { componentId: burnt.id, terminalId: 'A2' },
    );
    return (
      `Kumparan kontaktor terbakar: menerima sekitar ${Math.round(volts)} V, padahal kumparannya ` +
      `untuk ${coilVoltsOf(burnt.settings)} V. Matikan tegangan, perbaiki sambungan A1-A2, ` +
      'lalu ganti kontaktor lewat panel setelan.'
    );
  }
  for (const trip of result.trips) {
    const relay = result.states[trip.componentId];
    if (relay?.kind !== 'overload') continue;
    const setting = torAmpsOf(findComponent(project, trip.componentId)?.component.settings);
    const reason =
      relay.cause === 'phaseLoss'
        ? 'arus ketiga fasa tidak seimbang (satu fasa hilang)'
        : `arus ${formatAmps(trip.amps)} melebihi setelan ${formatAmps(setting)}`;
    return (
      `TOR trip: ${reason}. Kontak 95-96 membuka. Matikan tegangan, perbaiki penyebabnya, ` +
      'lalu reset TOR dengan mengekliknya saat bertegangan.'
    );
  }
  const worstTrip = Math.max(0, ...result.trips.map((trip) => trip.amps));
  if (result.trips.length > 0) {
    return (
      `MCB trip karena hubung singkat (arus sesaat sekitar ${formatAmps(worstTrip)}). ` +
      'Matikan tegangan, perbaiki sambungan yang salah, lalu naikkan kembali tuas MCB.'
    );
  }
  const worstWire = Math.max(0, ...Object.values(result.wireCurrents).map(abs));
  if (worstWire >= SHORT_CIRCUIT_AMPS) {
    return (
      `Hubung singkat tanpa pengaman (arus sekitar ${formatAmps(worstWire)}). ` +
      'Tidak ada MCB di jalur ini yang memutus arus. Matikan tegangan dan pasang MCB setelah sumber.'
    );
  }
  return null;
}
