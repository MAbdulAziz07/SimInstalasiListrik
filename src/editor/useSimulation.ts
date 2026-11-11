import { useEffect } from 'react';
import { TICK_SECONDS } from '../sim/clock';
import { useEditor } from './store';

/** Menjalankan detak waktu simulasi selama papan bertegangan (untuk TOR dan timer). */
export function useSimulationClock(): void {
  const energized = useEditor((s) => s.sim !== null);
  useEffect(() => {
    if (!energized) return;
    const timer = window.setInterval(
      () => useEditor.getState().tick(TICK_SECONDS),
      TICK_SECONDS * 1000,
    );
    return () => window.clearInterval(timer);
  }, [energized]);
}
