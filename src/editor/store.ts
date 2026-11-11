import { create } from 'zustand';
import {
  addComponent,
  currentX1Labels,
  addWire,
  findComponent,
  findWire,
  insertBend,
  moveBend,
  moveComponent,
  removeBend,
  removeComponent,
  removeWire,
  rotateComponent,
  setWireColor,
  setSettings,
  setX1Labels,
} from '../core/edit';
import {
  createEmptyProject,
  type BoardId,
  type CoilVolts,
  type ComponentSettings,
  type ComponentType,
  type Point,
  type Project,
  type TerminalRef,
  type WireColor,
} from '../core/types';
import { advance } from '../sim/clock';
import { allComponents } from '../sim/network';
import { simulate } from '../sim/simulate';
import type { ComponentStates, SimResult } from '../sim/types';
import { EMPTY_HISTORY, record, redo, sameProject, undo, type History } from './history';
import { deenergized, faultNotice, toggled } from './simView';

/** Ukuran satu satuan grid papan dalam piksel pada zoom 100%. */
export const GRID = 20;
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 3;

/** Geser (piksel) dan zoom sebuah papan. */
export interface View {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_VIEW: View = { x: 0, y: 0, scale: 1 };

/** Kabel yang sedang ditarik: sudah punya ujung awal, belum punya ujung akhir. */
export interface PendingWire {
  from: TerminalRef;
  bends: Point[];
}

interface EditorState {
  project: Project;
  activeBoard: BoardId;
  /** Id komponen atau kabel yang terpilih. */
  selectedId: string | null;
  views: Record<BoardId, View>;
  /** Ukuran area papan di layar, untuk menaruh komponen di tengah tampilan. */
  viewport: { width: number; height: number };
  /** Jenis komponen yang sedang diseret dari palet. */
  placing: ComponentType | null;
  wiring: PendingWire | null;
  /** Warna untuk kabel baru. */
  wireColor: WireColor;
  /** Posisi saklar dan tuas MCB; bertahan saat tegangan dimatikan. */
  simStates: ComponentStates;
  /** Hasil simulasi; `null` berarti papan tidak bertegangan dan boleh diubah. */
  sim: SimResult | null;
  /** Pesan gangguan (mis. MCB trip) yang sedang ditampilkan. */
  notice: string | null;
  history: History;
  /** Papan sebelum seretan dimulai; selama terisi, perubahan tidak dicatat satu per satu. */
  dragBase: Project | null;

  undo(): void;
  redo(): void;
  /** Mengawali seretan agar seluruh seretan menjadi satu langkah riwayat. */
  beginDrag(): void;
  endDrag(): void;
  /** Mengganti seluruh papan (impor berkas); bisa diurungkan. */
  replaceProject(project: Project): void;
  /** Mengisi papan dari simpanan browser tanpa mencatat riwayat. */
  restoreProject(project: Project): void;
  clearBoards(): void;
  showNotice(text: string): void;

  /** Berpindah papan; pilihan dan kabel yang sedang ditarik dilepas. */
  setActiveBoard(board: BoardId): void;
  setX1Count(count: number): void;
  setX1Label(index: number, label: string): void;

  /** Memberi tegangan: papan terkunci dan simulasi berjalan. */
  energize(): void;
  deenergize(): void;
  /** Mengoperasikan saklar atau tuas MCB; hanya saat bertegangan. */
  operate(id: string, part?: number): void;
  /** Menekan atau melepas push button; hanya saat bertegangan. */
  setPressed(id: string, pressed: boolean): void;
  setCoilVolts(id: string, volts: CoilVolts): void;
  /** Mengubah setelan komponen (arus MCB, arus TOR, waktu timer); hanya saat rangkaian mati. */
  updateSettings(id: string, patch: ComponentSettings): void;
  /** Memajukan waktu simulasi; hanya berpengaruh saat bertegangan. */
  tick(seconds: number): void;
  /** Mengganti kontaktor yang kumparannya terbakar dengan yang baru. */
  replaceBurnt(id: string): void;
  dismissNotice(): void;

  addAt(type: ComponentType, center: Point): void;
  addAtViewCenter(type: ComponentType): void;
  move(id: string, position: Point): void;
  select(id: string | null): void;
  rotateSelected(): void;
  deleteSelected(): void;

  /** Klik terminal: mulai kabel, atau selesaikan kabel yang sedang ditarik. */
  clickTerminal(ref: TerminalRef): void;
  addWiringBend(point: Point): void;
  cancelWiring(): void;
  /** Mengganti warna kabel baru, dan warna kabel yang sedang terpilih. */
  setWireColor(color: WireColor): void;
  insertBend(wireId: string, index: number, point: Point): void;
  moveBend(wireId: string, index: number, point: Point): void;
  removeBend(wireId: string, index: number): void;

  setView(view: View): void;
  zoomBy(factor: number, anchor?: Point): void;
  resetView(): void;
  setViewport(width: number, height: number): void;
  startPlacing(type: ComponentType): void;
  stopPlacing(): void;
}

/** Bagian state untuk sebuah perubahan papan, termasuk catatan riwayatnya. */
function edited(state: EditorState, next: Project): Pick<EditorState, 'project' | 'history'> {
  if (state.dragBase || sameProject(next, state.project)) {
    return { project: next, history: state.history };
  }
  return { project: next, history: record(state.history, state.project) };
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export const useEditor = create<EditorState>((set, get) => ({
  project: createEmptyProject(),
  activeBoard: 'installation',
  selectedId: null,
  views: { installation: DEFAULT_VIEW, panel: DEFAULT_VIEW },
  viewport: { width: 800, height: 600 },
  placing: null,
  wiring: null,
  wireColor: 'brown',
  simStates: {},
  sim: null,
  notice: null,
  history: EMPTY_HISTORY,
  dragBase: null,

  undo: () => {
    const { history, project, sim } = get();
    const step = sim ? null : undo(history, project);
    if (step) set({ ...step, selectedId: null, wiring: null });
  },

  redo: () => {
    const { history, project, sim } = get();
    const step = sim ? null : redo(history, project);
    if (step) set({ ...step, selectedId: null, wiring: null });
  },

  beginDrag: () => {
    if (!get().sim) set({ dragBase: get().project });
  },

  endDrag: () => {
    const { dragBase, project, history } = get();
    if (!dragBase) return;
    set({
      dragBase: null,
      history: sameProject(dragBase, project) ? history : record(history, dragBase),
    });
  },

  replaceProject: (project) => {
    if (get().sim) return;
    set({
      ...edited(get(), project),
      selectedId: null,
      wiring: null,
      simStates: {},
      notice: null,
      views: { installation: DEFAULT_VIEW, panel: DEFAULT_VIEW },
    });
  },

  restoreProject: (project) => set({ project, history: EMPTY_HISTORY, simStates: {} }),

  clearBoards: () => get().replaceProject(createEmptyProject()),

  showNotice: (text) => set({ notice: text }),

  setActiveBoard: (board) =>
    set({ activeBoard: board, selectedId: null, wiring: null, placing: null }),

  setX1Count: (count) => {
    const labels = currentX1Labels(get().project);
    if (!labels || get().sim) return;
    const next = Array.from({ length: Math.max(0, count) }, (_, i) => labels[i] ?? '');
    set(edited(get(), setX1Labels(get().project, next)));
  },

  setX1Label: (index, label) => {
    const labels = currentX1Labels(get().project);
    if (!labels || get().sim || index < 0 || index >= labels.length) return;
    set(
      edited(
        get(),
        setX1Labels(
          get().project,
          labels.map((old, i) => (i === index ? label : old)),
        ),
      ),
    );
  },

  energize: () => {
    const { project, simStates } = get();
    // Buang keadaan komponen yang sudah dihapus dari papan.
    const ids = new Set(allComponents(project).map((c) => c.id));
    const states = Object.fromEntries(Object.entries(simStates).filter(([id]) => ids.has(id)));
    const sim = simulate(project, states);
    set({
      sim,
      simStates: sim.states,
      notice: faultNotice(sim, project),
      selectedId: null,
      wiring: null,
      placing: null,
    });
  },

  deenergize: () => set({ sim: null, simStates: deenergized(get().simStates) }),

  setPressed: (id, pressed) => {
    const { project, sim, notice } = get();
    const current = sim?.states[id];
    if (!sim || current?.kind !== 'pushButton' || current.pressed === pressed) return;
    const result = simulate(project, { ...sim.states, [id]: { kind: 'pushButton', pressed } });
    set({ sim: result, simStates: result.states, notice: faultNotice(result, project) ?? notice });
  },

  updateSettings: (id, patch) => {
    if (get().sim) return;
    set(edited(get(), setSettings(get().project, id, patch)));
  },

  tick: (seconds) => {
    const { project, sim, notice } = get();
    if (!sim) return;
    const result = advance(project, sim, seconds);
    if (result === sim) return;
    set({ sim: result, simStates: result.states, notice: faultNotice(result, project) ?? notice });
  },

  setCoilVolts: (id, volts) => {
    if (get().sim) return;
    set(edited(get(), setSettings(get().project, id, { coilVolts: volts })));
  },

  replaceBurnt: (id) => {
    const { simStates, sim } = get();
    if (sim || !(id in simStates)) return;
    set({ simStates: Object.fromEntries(Object.entries(simStates).filter(([key]) => key !== id)) });
  },

  operate: (id, part = 0) => {
    const { project, sim, notice } = get();
    const current = sim?.states[id];
    const next = current && toggled(current, part);
    if (!sim || !next) return;
    const result = simulate(project, { ...sim.states, [id]: next });
    // Pesan lama tetap tampil sampai ditutup atau diganti gangguan baru.
    set({ sim: result, simStates: result.states, notice: faultNotice(result, project) ?? notice });
  },

  dismissNotice: () => set({ notice: null }),

  addAt: (type, center) => {
    if (get().sim) return;
    const { project, activeBoard } = get();
    const added = addComponent(project, activeBoard, type, center);
    set({ ...edited(get(), added.project), selectedId: added.id, wiring: null });
  },

  addAtViewCenter: (type) => {
    const { views, activeBoard, viewport } = get();
    const view = views[activeBoard];
    get().addAt(type, {
      x: (viewport.width / 2 - view.x) / (GRID * view.scale),
      y: (viewport.height / 2 - view.y) / (GRID * view.scale),
    });
  },

  move: (id, position) => {
    if (get().sim) return;
    set(edited(get(), moveComponent(get().project, id, position)));
  },

  select: (id) => set({ selectedId: get().sim ? null : id }),

  rotateSelected: () => {
    const { project, selectedId, sim } = get();
    if (selectedId && !sim) set(edited(get(), rotateComponent(project, selectedId)));
  },

  deleteSelected: () => {
    const { project, selectedId, sim } = get();
    if (!selectedId || sim) return;
    set({
      ...edited(get(), removeWire(removeComponent(project, selectedId), selectedId)),
      selectedId: null,
      wiring: null,
    });
  },

  clickTerminal: (ref) => {
    if (get().sim) return;
    const { project, activeBoard, wiring, wireColor } = get();
    if (!wiring) {
      set({ wiring: { from: ref, bends: [] }, selectedId: null });
      return;
    }
    const added = addWire(project, activeBoard, wiring.from, ref, wireColor, wiring.bends);
    // Kabel yang ditolak (ujung sama atau ganda) membatalkan penarikan tanpa membuat apa pun.
    // Kabel baru sengaja tidak dipilih: memilih warna untuk kabel berikutnya tidak boleh
    // mengubah warna kabel yang baru saja dipasang.
    set({ ...edited(get(), added.project), wiring: null, selectedId: null });
  },

  addWiringBend: (point) => {
    const { wiring } = get();
    if (!wiring) return;
    set({
      wiring: {
        ...wiring,
        bends: [...wiring.bends, { x: Math.round(point.x), y: Math.round(point.y) }],
      },
    });
  },

  cancelWiring: () => set({ wiring: null }),

  setWireColor: (color) => {
    const { project, selectedId } = get();
    set({
      wireColor: color,
      ...edited(
        get(),
        selectedId && !get().sim ? setWireColor(project, selectedId, color) : project,
      ),
    });
  },

  insertBend: (wireId, index, point) => {
    if (!get().sim) set(edited(get(), insertBend(get().project, wireId, index, point)));
  },
  moveBend: (wireId, index, point) => {
    if (!get().sim) set(edited(get(), moveBend(get().project, wireId, index, point)));
  },
  removeBend: (wireId, index) => {
    if (!get().sim) set(edited(get(), removeBend(get().project, wireId, index)));
  },

  setView: (view) => {
    const { views, activeBoard } = get();
    set({ views: { ...views, [activeBoard]: { ...view, scale: clampScale(view.scale) } } });
  },

  /** Zoom dengan titik `anchor` (piksel, relatif ke area papan) tetap di tempatnya. */
  zoomBy: (factor, anchor) => {
    const { views, activeBoard, viewport } = get();
    const view = views[activeBoard];
    const at = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
    const scale = clampScale(view.scale * factor);
    const ratio = scale / view.scale;
    get().setView({
      x: at.x - (at.x - view.x) * ratio,
      y: at.y - (at.y - view.y) * ratio,
      scale,
    });
  },

  resetView: () => get().setView(DEFAULT_VIEW),

  setViewport: (width, height) => set({ viewport: { width, height } }),

  startPlacing: (type) => {
    if (!get().sim) set({ placing: type, wiring: null });
  },
  stopPlacing: () => set({ placing: null }),
}));

/** Jenis benda yang sedang terpilih. */
export function selectionKind(state: EditorState): 'component' | 'wire' | null {
  if (!state.selectedId) return null;
  if (findComponent(state.project, state.selectedId)) return 'component';
  if (findWire(state.project, state.selectedId)) return 'wire';
  return null;
}
