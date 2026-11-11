import { useEditor } from './store';

function statusText(unstable: boolean, energized: boolean, wiring: boolean): string {
  if (unstable) {
    return 'Rangkaian tidak stabil: keadaan komponen terus berubah. Matikan dan periksa rangkaian.';
  }
  if (energized) {
    return 'Bertegangan: klik saklar atau MCB; tahan push button (Shift+klik untuk menguncinya). Matikan untuk mengubah papan.';
  }
  if (wiring) {
    return 'Menarik kabel: klik terminal tujuan, klik papan untuk titik belok, Esc untuk batal.';
  }
  return '';
}

/**
 * Petunjuk singkat untuk keadaan papan saat ini. Selalu satu baris di samping tab papan, agar
 * tinggi kepala aplikasi tidak berubah saat tegangan diberikan.
 */
export function StatusLine() {
  const wiring = useEditor((s) => s.wiring !== null);
  const energized = useEditor((s) => s.sim !== null);
  const unstable = useEditor((s) => s.sim?.status === 'oscillating');
  const text = statusText(unstable, energized, wiring);
  return (
    <span className={unstable ? 'status-line warning' : 'status-line'} role="status" title={text}>
      {text}
    </span>
  );
}
