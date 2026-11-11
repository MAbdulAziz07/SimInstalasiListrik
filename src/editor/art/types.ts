import type { ComponentSettings, ComponentState } from '../../core/types';

/**
 * Gambar piktorial sebuah komponen, digambar pada posisi tidak diputar dengan sudut kiri-atas
 * di (0, 0). `w` dan `h` dalam piksel pada zoom 100%. Letak terminal mengikuti katalog; gambar
 * hanya menghias badan komponen dan tidak menerima penunjuk.
 */
export interface ArtProps {
  w: number;
  h: number;
  state: ComponentState;
  settings: ComponentSettings;
  /** Daya lampu dibanding nominalnya (0–1); hanya diisi saat papan bertegangan. */
  brightness?: number;
}

export type Art = (props: ArtProps) => React.JSX.Element;
