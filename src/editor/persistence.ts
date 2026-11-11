import { parseProject, serializeProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

export const STORAGE_KEY = 'sim-instalasi-listrik:papan';
export const EXPORT_FILE_NAME = 'instalasi-listrik.json';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** Papan yang tersimpan di browser; `null` bila belum ada atau simpanannya rusak. */
export function loadSaved(storage: Storage): Project | null {
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return null;
    const result = parseProject(text);
    return result.ok ? result.project : null;
  } catch {
    return null;
  }
}

/**
 * Memulihkan papan dari simpanan browser, lalu menyimpan setiap perubahan.
 * Mengembalikan fungsi untuk menghentikan simpan otomatis.
 */
export function startAutosave(storage: Storage = window.localStorage): () => void {
  const saved = loadSaved(storage);
  if (saved) useEditor.getState().restoreProject(saved);

  let last = useEditor.getState().project;
  return useEditor.subscribe((state) => {
    // Selama menyeret, tunggu sampai seretan selesai.
    if (state.dragBase || state.project === last) return;
    last = state.project;
    try {
      storage.setItem(STORAGE_KEY, serializeProject(state.project));
    } catch {
      // Penyimpanan penuh atau diblokir: aplikasi tetap berjalan tanpa simpan otomatis.
    }
  });
}

/** Mengunduh papan sebagai berkas `.json`. */
export function downloadProject(project: Project): void {
  const url = URL.createObjectURL(
    new Blob([serializeProject(project)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = EXPORT_FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

/** Membuka berkas `.json`; berkas rusak ditolak dengan pesan dan papan tidak berubah. */
export async function importFile(file: Pick<File, 'text'>): Promise<boolean> {
  const { replaceProject, showNotice } = useEditor.getState();
  const result = parseProject(await file.text());
  if (!result.ok) {
    showNotice(`Berkas tidak bisa dibuka: ${result.error}`);
    return false;
  }
  replaceProject(result.project);
  return true;
}
