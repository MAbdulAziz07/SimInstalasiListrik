import type { Project } from '../core/types';

/** Jumlah langkah yang bisa diurungkan. */
export const HISTORY_LIMIT = 100;

/** Riwayat papan: `past` berurutan dari yang terlama, `future` dari yang terdekat. */
export interface History {
  past: readonly Project[];
  future: readonly Project[];
}

export const EMPTY_HISTORY: History = { past: [], future: [] };

export function sameProject(a: Project, b: Project): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** Mencatat keadaan sebelum sebuah perubahan; langkah "ulangi" yang ada hangus. */
export function record(history: History, before: Project): History {
  return { past: [...history.past, before].slice(-HISTORY_LIMIT), future: [] };
}

export interface Step {
  history: History;
  project: Project;
}

/** Mundur satu langkah; `null` bila tidak ada yang bisa diurungkan. */
export function undo(history: History, current: Project): Step | null {
  const project = history.past[history.past.length - 1];
  if (!project) return null;
  return {
    project,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
  };
}

/** Maju satu langkah; `null` bila tidak ada yang bisa diulangi. */
export function redo(history: History, current: Project): Step | null {
  const project = history.future[0];
  if (!project) return null;
  return {
    project,
    history: { past: [...history.past, current], future: history.future.slice(1) },
  };
}
