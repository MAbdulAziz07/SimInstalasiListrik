import { useEffect, useRef } from 'react';
import type { Point, TerminalRef } from '../core/types';

/** Jarak (piksel) penunjuk berpindah sebelum dianggap menyeret, bukan mengklik. */
const DRAG_PIXELS = 6;

/** Terminal papan di bawah penunjuk, bila ada. */
export function terminalAt(event: Event): TerminalRef | null {
  const target = event.target instanceof Element ? event.target : null;
  const key = target?.closest('[data-terminal]')?.getAttribute('data-terminal');
  if (!key) return null;
  const split = key.indexOf(':');
  return { componentId: key.slice(0, split), terminalId: key.slice(split + 1) };
}

/** Id kabel papan di bawah penunjuk, bila ada. */
export function wireAt(event: Event): string | null {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest('[data-wire-id]')?.getAttribute('data-wire-id') ?? null;
}

interface Picking<T> {
  /** Alat sedang dibawa penunjuk. */
  active: boolean;
  /** Kelas pada `body` selama alat dibawa, untuk kursor dan sorotan sasaran. */
  bodyClass: string;
  /** Sasaran (terminal atau kabel) di bawah penunjuk; `null` bila bukan sasaran. */
  find(event: Event): T | null;
  pick(target: T): void;
  cancel(): void;
  /** Posisi penunjuk saat alat mulai dibawa; membedakan klik dari seretan. */
  origin(): Point | null;
}

/**
 * Selama sebuah alat ukur dibawa: klik atau lepaskan di sasaran untuk memasangnya, Enter pada
 * sasaran untuk papan ketik, Escape untuk batal. Didengarkan di jendela pada fase tangkap,
 * sehingga papan tidak ikut memulai kabel atau memilih kabel dari sasaran yang sama.
 */
export function usePicking<T>(picking: Picking<T>): void {
  const latest = useRef(picking);
  latest.current = picking;
  const { active, bodyClass } = picking;

  useEffect(() => {
    if (!active) return;
    document.body.classList.add(bodyClass);

    const take = (e: Event, target: T) => {
      e.stopPropagation();
      e.preventDefault();
      latest.current.pick(target);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = latest.current.find(e);
      if (target !== null) take(e, target);
    };
    const onPointerUp = (e: PointerEvent) => {
      const target = latest.current.find(e);
      if (target !== null) {
        latest.current.pick(target);
        return;
      }
      // Seretan yang dilepas di luar sasaran batal; klik biasa tetap membawa alat.
      const origin = latest.current.origin();
      const moved = origin ? Math.hypot(e.clientX - origin.x, e.clientY - origin.y) : 0;
      if (moved > DRAG_PIXELS) latest.current.cancel();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        latest.current.cancel();
        return;
      }
      const target = e.key === 'Enter' || e.key === ' ' ? latest.current.find(e) : null;
      if (target !== null) take(e, target);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.body.classList.remove(bodyClass);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, bodyClass]);
}
