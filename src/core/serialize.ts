import { catalog } from './catalog';
import { isX1Type, X1_LABEL_MAX, X1_MAX, X1_MIN } from './catalog/panel';
import { shapeOf } from './geometry';
import {
  BOARD_IDS,
  COIL_VOLTS,
  COMPONENT_TYPES,
  MCB_AMPS,
  ROTATIONS,
  TIMER_SECONDS_MAX,
  TIMER_SECONDS_MIN,
  TOR_AMPS_MAX,
  TOR_AMPS_MIN,
  WIRE_COLORS,
  type Board,
  type BoardId,
  type CoilVolts,
  type ComponentSettings,
  type ComponentType,
  type McbAmps,
  type PlacedComponent,
  type Point,
  type Project,
  type Rotation,
  type TerminalRef,
  type Wire,
  type WireColor,
} from './types';

export const FILE_FORMAT = 'sim-instalasi-listrik';
/** Naikkan bila bentuk berkas berubah, dan tambahkan migrasi dari versi lama. */
export const FILE_VERSION = 1;

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string };

const BOARD_LABELS: Record<BoardId, string> = {
  installation: 'Instalasi',
  panel: 'Dalam Panel',
};

export function serializeProject(project: Project): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, boards: project.boards });
}

export function parseProject(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Berkas tidak bisa dibaca: isinya bukan JSON yang sah.' };
  }
  try {
    return { ok: true, project: readProject(raw) };
  } catch (e) {
    if (e instanceof InvalidFile) return { ok: false, error: e.message };
    throw e;
  }
}

class InvalidFile extends Error {}

function fail(message: string): never {
  throw new InvalidFile(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T>(options: readonly T[], value: unknown): value is T {
  return (options as readonly unknown[]).includes(value);
}

function readProject(raw: unknown): Project {
  if (!isRecord(raw) || raw.format !== FILE_FORMAT) {
    fail('Berkas ini bukan berkas Simulator Instalasi Listrik.');
  }
  if (raw.version !== FILE_VERSION) {
    fail(
      `Berkas ini dibuat dengan format versi ${String(raw.version)}, ` +
        `sedangkan aplikasi ini hanya mengenal versi ${FILE_VERSION}.`,
    );
  }
  const rawBoards = raw.boards;
  if (!isRecord(rawBoards)) fail('Berkas rusak: data papan tidak ditemukan.');

  const usedIds = new Set<string>();
  const boards = {} as Record<BoardId, Board>;
  for (const boardId of BOARD_IDS) {
    boards[boardId] = readBoard(rawBoards[boardId], boardId, usedIds);
  }
  checkPanelPair(boards);
  return { boards };
}

/** Panel listrik dan terminal blok X1 harus berpasangan dan bersetelan sama. */
function checkPanelPair(boards: Record<BoardId, Board>): void {
  const panels = boards.installation.components.filter((c) => c.type === 'panel');
  const blocks = boards.panel.components.filter((c) => c.type === 'terminalBlock');
  if (panels.length > 1 || blocks.length > 1) {
    fail('Berkas rusak: hanya boleh ada satu panel listrik dan satu terminal blok X1.');
  }
  if (panels.length !== blocks.length) {
    fail('Berkas rusak: panel listrik dan terminal blok X1 harus ada berpasangan.');
  }
  const [panel] = panels;
  const [block] = blocks;
  if (
    panel &&
    block &&
    JSON.stringify(panel.settings?.x1Labels) !== JSON.stringify(block.settings?.x1Labels)
  ) {
    fail('Berkas rusak: terminal X1 pada panel dan terminal blok tidak sama.');
  }
}

function readBoard(raw: unknown, boardId: BoardId, usedIds: Set<string>): Board {
  const where = `papan ${BOARD_LABELS[boardId]}`;
  if (!isRecord(raw) || !Array.isArray(raw.components) || !Array.isArray(raw.wires)) {
    fail(`Berkas rusak: data ${where} tidak lengkap.`);
  }
  const components = raw.components.map((c) => readComponent(c, boardId, usedIds));
  const byId = new Map(components.map((c) => [c.id, c]));
  const wires = raw.wires.map((w) => readWire(w, where, byId, usedIds));
  return { components, wires };
}

function readId(raw: unknown, what: string, usedIds: Set<string>): string {
  if (typeof raw !== 'string' || raw.length === 0) fail(`Berkas rusak: ada ${what} tanpa id.`);
  if (usedIds.has(raw)) fail(`Berkas rusak: id "${raw}" ganda.`);
  usedIds.add(raw);
  return raw;
}

function readPoint(raw: unknown): Point | undefined {
  if (!isRecord(raw) || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return undefined;
  return { x: raw.x as number, y: raw.y as number };
}

function readComponent(raw: unknown, boardId: BoardId, usedIds: Set<string>): PlacedComponent {
  if (!isRecord(raw)) fail('Berkas rusak: data komponen tidak sah.');
  const id = readId(raw.id, 'komponen', usedIds);

  if (!isOneOf<ComponentType>(COMPONENT_TYPES, raw.type)) {
    fail(`Berkas memuat komponen yang tidak dikenal: "${String(raw.type)}".`);
  }
  const def = catalog[raw.type];
  if (!def.boards.includes(boardId)) {
    fail(`Berkas rusak: ${def.label} tidak boleh dipasang di papan ${BOARD_LABELS[boardId]}.`);
  }
  const position = readPoint(raw.position);
  if (!position) fail(`Berkas rusak: posisi komponen "${id}" tidak sah.`);
  if (!isOneOf<Rotation>(ROTATIONS, raw.rotation)) {
    fail(`Berkas rusak: rotasi komponen "${id}" tidak sah.`);
  }
  const settings = readSettings(raw.settings, raw.type, id);
  return {
    id,
    type: raw.type,
    position,
    rotation: raw.rotation,
    ...(settings ? { settings } : {}),
  };
}

function readSettings(
  raw: unknown,
  type: ComponentType,
  id: string,
): ComponentSettings | undefined {
  if (type === 'contactor') {
    if (!isRecord(raw) || raw.coilVolts === undefined) return undefined;
    if (!isOneOf<CoilVolts>(COIL_VOLTS, raw.coilVolts)) {
      fail(`Berkas rusak: tegangan kumparan komponen "${id}" tidak sah.`);
    }
    return { coilVolts: raw.coilVolts };
  }
  if (type === 'timer') {
    if (!isRecord(raw)) return undefined;
    const settings: ComponentSettings = {};
    if (raw.coilVolts !== undefined) {
      if (!isOneOf<CoilVolts>(COIL_VOLTS, raw.coilVolts)) {
        fail(`Berkas rusak: tegangan kumparan komponen "${id}" tidak sah.`);
      }
      settings.coilVolts = raw.coilVolts;
    }
    if (raw.timerSeconds !== undefined) {
      const seconds = raw.timerSeconds;
      if (
        typeof seconds !== 'number' ||
        !(seconds >= TIMER_SECONDS_MIN && seconds <= TIMER_SECONDS_MAX)
      ) {
        fail(`Berkas rusak: waktu tunda timer "${id}" tidak sah.`);
      }
      settings.timerSeconds = seconds;
    }
    return Object.keys(settings).length > 0 ? settings : undefined;
  }
  if (type === 'mcb1p' || type === 'mcb3p') {
    if (!isRecord(raw) || raw.mcbAmps === undefined) return undefined;
    if (!isOneOf<McbAmps>(MCB_AMPS, raw.mcbAmps)) {
      fail(`Berkas rusak: arus nominal MCB "${id}" tidak sah.`);
    }
    return { mcbAmps: raw.mcbAmps };
  }
  if (type === 'overloadRelay') {
    if (!isRecord(raw) || raw.torAmps === undefined) return undefined;
    const amps = raw.torAmps;
    if (typeof amps !== 'number' || !(amps >= TOR_AMPS_MIN && amps <= TOR_AMPS_MAX)) {
      fail(`Berkas rusak: arus setelan TOR "${id}" tidak sah.`);
    }
    return { torAmps: amps };
  }
  if (!isX1Type(type)) return undefined;
  const labels = isRecord(raw) ? raw.x1Labels : undefined;
  if (
    !Array.isArray(labels) ||
    labels.length < X1_MIN ||
    labels.length > X1_MAX ||
    !labels.every((label) => typeof label === 'string' && label.length <= X1_LABEL_MAX)
  ) {
    fail(`Berkas rusak: setelan terminal X1 pada komponen "${id}" tidak sah.`);
  }
  return { x1Labels: labels as string[] };
}

function readWire(
  raw: unknown,
  where: string,
  byId: Map<string, PlacedComponent>,
  usedIds: Set<string>,
): Wire {
  if (!isRecord(raw)) fail('Berkas rusak: data kabel tidak sah.');
  const id = readId(raw.id, 'kabel', usedIds);
  const from = readTerminalRef(raw.from, id, where, byId);
  const to = readTerminalRef(raw.to, id, where, byId);

  if (!isOneOf<WireColor>(WIRE_COLORS, raw.color)) {
    fail(`Berkas rusak: warna kabel "${id}" tidak sah.`);
  }
  if (!Array.isArray(raw.bends)) fail(`Berkas rusak: titik belok kabel "${id}" tidak sah.`);
  const bends = raw.bends.map(
    (b) => readPoint(b) ?? fail(`Berkas rusak: titik belok kabel "${id}" tidak sah.`),
  );
  return { id, from, to, color: raw.color, bends };
}

function readTerminalRef(
  raw: unknown,
  wireId: string,
  where: string,
  byId: Map<string, PlacedComponent>,
): TerminalRef {
  if (!isRecord(raw) || typeof raw.componentId !== 'string' || typeof raw.terminalId !== 'string') {
    fail(`Berkas rusak: ujung kabel "${wireId}" tidak sah.`);
  }
  const { componentId, terminalId } = raw;
  const component = byId.get(componentId);
  if (!component) {
    fail(
      `Berkas rusak: kabel "${wireId}" tersambung ke komponen "${componentId}" ` +
        `yang tidak ada di ${where}.`,
    );
  }
  if (!shapeOf(component).terminals.some((t) => t.id === terminalId)) {
    fail(
      `Berkas rusak: kabel "${wireId}" tersambung ke terminal "${terminalId}" ` +
        `yang tidak ada pada ${catalog[component.type].label}.`,
    );
  }
  return { componentId, terminalId };
}
