import type { ComponentGroup } from '../core/types';

/** Urutan dan nama kelompok komponen di palet. */
export const GROUPS: readonly { id: ComponentGroup; label: string }[] = [
  { id: 'source', label: 'Sumber' },
  { id: 'panel', label: 'Panel' },
  { id: 'protection', label: 'Proteksi' },
  { id: 'lighting', label: 'Penerangan' },
  { id: 'control', label: 'Kontrol' },
  { id: 'load', label: 'Beban' },
  { id: 'instrument', label: 'Alat Ukur' },
];
