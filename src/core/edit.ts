import { catalog } from './catalog';
import { isX1Type, X1_LABEL_MAX, X1_MAX, X1_MIN, x1Labels } from './catalog/panel';
import { rotatedSizeOf, shapeOf } from './geometry';
import {
  BOARD_IDS,
  type Board,
  type BoardId,
  type ComponentSettings,
  type ComponentType,
  type PlacedComponent,
  type Point,
  type Project,
  type Rotation,
  type TerminalRef,
  type Wire,
  type WireColor,
} from './types';

// Semua fungsi di sini mengembalikan proyek baru dan tidak mengubah masukannya.

export interface LocatedComponent {
  boardId: BoardId;
  component: PlacedComponent;
}

export function findComponent(project: Project, id: string): LocatedComponent | undefined {
  for (const boardId of BOARD_IDS) {
    const component = project.boards[boardId].components.find((c) => c.id === id);
    if (component) return { boardId, component };
  }
  return undefined;
}

/** Komponen pertama berjenis `type`; panel dan terminal blok hanya ada satu. */
export function findByType(project: Project, type: ComponentType): LocatedComponent | undefined {
  for (const boardId of BOARD_IDS) {
    const component = project.boards[boardId].components.find((c) => c.type === type);
    if (component) return { boardId, component };
  }
  return undefined;
}

/** Letak awal terminal blok X1 di papan Dalam Panel. */
const TERMINAL_BLOCK_POSITION: Point = { x: 4, y: 20 };

/** Id baru yang belum dipakai di papan mana pun: awalan + nomor urut. */
export function nextId(project: Project, prefix: string): string {
  const used = new Set<string>();
  for (const boardId of BOARD_IDS) {
    for (const c of project.boards[boardId].components) used.add(c.id);
    for (const w of project.boards[boardId].wires) used.add(w.id);
  }
  for (let n = 1; ; n++) {
    const id = `${prefix}${n}`;
    if (!used.has(id)) return id;
  }
}

function withBoard(project: Project, boardId: BoardId, change: (board: Board) => Board): Project {
  return { boards: { ...project.boards, [boardId]: change(project.boards[boardId]) } };
}

function withComponent(
  project: Project,
  id: string,
  change: (component: PlacedComponent) => PlacedComponent,
): Project {
  const located = findComponent(project, id);
  if (!located) return project;
  return withBoard(project, located.boardId, (board) => ({
    ...board,
    components: board.components.map((c) => (c.id === id ? change(c) : c)),
  }));
}

/** Menaruh komponen baru dengan titik tengah di `center`, mengunci ke grid. */
export function addComponent(
  project: Project,
  boardId: BoardId,
  type: ComponentType,
  center: Point,
): { project: Project; id: string } {
  const def = catalog[type];
  if (!def.boards.includes(boardId)) {
    throw new Error(`${def.label} tidak boleh dipasang di papan ini.`);
  }
  if (def.managed) throw new Error(`${def.label} dipasang otomatis bersama panel listrik.`);
  if (type === 'panel') {
    // Versi ini hanya mendukung satu panel.
    const existing = findByType(project, 'panel');
    if (existing) return { project, id: existing.component.id };
  }
  const id = nextId(project, 'c');
  const settings = def.defaultSettings;
  const { size } = shapeOf({ type, settings });
  const component: PlacedComponent = {
    id,
    type,
    position: {
      x: Math.round(center.x - size.w / 2),
      y: Math.round(center.y - size.h / 2),
    },
    rotation: 0,
    ...(settings ? { settings } : {}),
  };
  const append = (target: Project, to: BoardId, added: PlacedComponent) =>
    withBoard(target, to, (board) => ({ ...board, components: [...board.components, added] }));

  let next = append(project, boardId, component);
  if (type === 'panel') {
    // Terminal blok X1 di papan Dalam Panel ikut dipasang.
    next = append(next, 'panel', {
      id: nextId(next, 'c'),
      type: 'terminalBlock',
      position: TERMINAL_BLOCK_POSITION,
      rotation: 0,
      ...(settings ? { settings } : {}),
    });
  }
  return { id, project: next };
}

/** Memindah sudut kiri-atas komponen ke `position`, mengunci ke grid. */
export function moveComponent(project: Project, id: string, position: Point): Project {
  const snapped = { x: Math.round(position.x), y: Math.round(position.y) };
  return withComponent(project, id, (c) =>
    c.position.x === snapped.x && c.position.y === snapped.y ? c : { ...c, position: snapped },
  );
}

/** Memutar komponen 90° searah jarum jam di sekitar titik tengahnya. */
export function rotateComponent(project: Project, id: string): Project {
  return withComponent(project, id, (c) => {
    const rotation = ((c.rotation + 90) % 360) as Rotation;
    const before = rotatedSizeOf(c);
    const after = rotatedSizeOf({ ...c, rotation });
    return {
      ...c,
      rotation,
      position: {
        x: Math.round(c.position.x + (before.w - after.w) / 2),
        y: Math.round(c.position.y + (before.h - after.h) / 2),
      },
    };
  });
}

/**
 * Menghapus komponen beserta semua kabel yang menempel padanya. Menghapus panel listrik ikut
 * menghapus terminal blok X1; terminal blok sendiri tidak bisa dihapus.
 */
export function removeComponent(project: Project, id: string): Project {
  const located = findComponent(project, id);
  if (!located || located.component.type === 'terminalBlock') return project;
  const ids = new Set([id]);
  if (located.component.type === 'panel') {
    const block = findByType(project, 'terminalBlock');
    if (block) ids.add(block.component.id);
  }
  let next = project;
  for (const boardId of BOARD_IDS) {
    if (!project.boards[boardId].components.some((c) => ids.has(c.id))) continue;
    next = withBoard(next, boardId, (board) => ({
      components: board.components.filter((c) => !ids.has(c.id)),
      wires: board.wires.filter((w) => !ids.has(w.from.componentId) && !ids.has(w.to.componentId)),
    }));
  }
  return next;
}

/**
 * Menyetel jumlah dan label terminal X1 pada panel dan terminal bloknya sekaligus.
 * Kabel pada terminal yang hilang ikut dihapus di kedua papan.
 */
export function setX1Labels(project: Project, labels: readonly string[]): Project {
  if (!findByType(project, 'panel')) return project;
  const next = labels.slice(0, X1_MAX).map((label) => label.slice(0, X1_LABEL_MAX));
  while (next.length < X1_MIN) next.push('');

  const gone = (ref: TerminalRef, x1Ids: Set<string>) =>
    x1Ids.has(ref.componentId) && Number(ref.terminalId) > next.length;

  let result = project;
  for (const boardId of BOARD_IDS) {
    const board = project.boards[boardId];
    const x1Ids = new Set(board.components.filter((c) => isX1Type(c.type)).map((c) => c.id));
    if (x1Ids.size === 0) continue;
    result = withBoard(result, boardId, () => ({
      components: board.components.map((c) =>
        x1Ids.has(c.id) ? { ...c, settings: { ...c.settings, x1Labels: next } } : c,
      ),
      wires: board.wires.filter((w) => !gone(w.from, x1Ids) && !gone(w.to, x1Ids)),
    }));
  }
  return result;
}

/** Mengubah sebagian setelan satu komponen. */
export function setSettings(project: Project, id: string, patch: ComponentSettings): Project {
  return withComponent(project, id, (c) => ({ ...c, settings: { ...c.settings, ...patch } }));
}

/** Label terminal X1 yang sedang berlaku; `undefined` bila belum ada panel. */
export function currentX1Labels(project: Project): string[] | undefined {
  const panel = findByType(project, 'panel');
  return panel && x1Labels(panel.component.settings);
}

// ---------- Kabel ----------

export interface LocatedWire {
  boardId: BoardId;
  wire: Wire;
}

export function findWire(project: Project, id: string): LocatedWire | undefined {
  for (const boardId of BOARD_IDS) {
    const wire = project.boards[boardId].wires.find((w) => w.id === id);
    if (wire) return { boardId, wire };
  }
  return undefined;
}

function sameTerminal(a: TerminalRef, b: TerminalRef): boolean {
  return a.componentId === b.componentId && a.terminalId === b.terminalId;
}

function hasTerminal(board: Board, ref: TerminalRef): boolean {
  const component = board.components.find((c) => c.id === ref.componentId);
  return Boolean(component && shapeOf(component).terminals.some((t) => t.id === ref.terminalId));
}

function snap(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

/**
 * Menyambung dua terminal di papan yang sama. Tanpa `id` di hasil berarti kabel ditolak:
 * ujungnya sama, terminalnya tidak ada di papan itu, atau kabel serupa sudah ada.
 */
export function addWire(
  project: Project,
  boardId: BoardId,
  from: TerminalRef,
  to: TerminalRef,
  color: WireColor,
  bends: Point[] = [],
): { project: Project; id?: string } {
  const board = project.boards[boardId];
  if (sameTerminal(from, to) || !hasTerminal(board, from) || !hasTerminal(board, to)) {
    return { project };
  }
  const duplicate = board.wires.some(
    (w) =>
      (sameTerminal(w.from, from) && sameTerminal(w.to, to)) ||
      (sameTerminal(w.from, to) && sameTerminal(w.to, from)),
  );
  if (duplicate) return { project };

  const id = nextId(project, 'w');
  const wire: Wire = { id, from: { ...from }, to: { ...to }, color, bends: bends.map(snap) };
  return {
    id,
    project: withBoard(project, boardId, (b) => ({ ...b, wires: [...b.wires, wire] })),
  };
}

function withWire(project: Project, id: string, change: (wire: Wire) => Wire): Project {
  const located = findWire(project, id);
  if (!located) return project;
  return withBoard(project, located.boardId, (board) => ({
    ...board,
    wires: board.wires.map((w) => (w.id === id ? change(w) : w)),
  }));
}

export function removeWire(project: Project, id: string): Project {
  const located = findWire(project, id);
  if (!located) return project;
  return withBoard(project, located.boardId, (board) => ({
    ...board,
    wires: board.wires.filter((w) => w.id !== id),
  }));
}

export function setWireColor(project: Project, id: string, color: WireColor): Project {
  return withWire(project, id, (w) => (w.color === color ? w : { ...w, color }));
}

/** Menyisipkan titik belok sebelum titik belok ke-`index` (0 = tepat setelah ujung `from`). */
export function insertBend(project: Project, id: string, index: number, point: Point): Project {
  return withWire(project, id, (w) => {
    const at = Math.min(Math.max(index, 0), w.bends.length);
    return { ...w, bends: [...w.bends.slice(0, at), snap(point), ...w.bends.slice(at)] };
  });
}

export function moveBend(project: Project, id: string, index: number, point: Point): Project {
  return withWire(project, id, (w) => {
    const current = w.bends[index];
    const next = snap(point);
    if (!current || (current.x === next.x && current.y === next.y)) return w;
    return { ...w, bends: w.bends.map((b, i) => (i === index ? next : b)) };
  });
}

export function removeBend(project: Project, id: string, index: number): Project {
  return withWire(project, id, (w) =>
    index >= 0 && index < w.bends.length
      ? { ...w, bends: w.bends.filter((_, i) => i !== index) }
      : w,
  );
}
