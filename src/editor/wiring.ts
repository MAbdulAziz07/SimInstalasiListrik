import { terminalPosition } from '../core/geometry';
import type { PlacedComponent, Point, Wire, WireColor } from '../core/types';

/** Nama dan warna tampilan tiap warna kabel (PUIL 2011). */
export const WIRE_COLOR_INFO: Record<WireColor, { label: string; stroke: string; dash?: string }> =
  {
    brown: { label: 'Cokelat (L1)', stroke: '#8b4a1c' },
    black: { label: 'Hitam (L2)', stroke: '#1c1c1c' },
    grey: { label: 'Abu-abu (L3)', stroke: '#8a8f96' },
    blue: { label: 'Biru (N)', stroke: '#1f6fd1' },
    'green-yellow': { label: 'Hijau-kuning (PE)', stroke: '#2e9b46', dash: '#f2d31b' },
  };

/**
 * Titik-titik yang dilalui kabel dalam satuan grid: ujung `from`, titik belok, ujung `to`.
 * Mengembalikan `undefined` bila salah satu komponennya tidak ada.
 */
export function wirePoints(
  wire: Wire,
  componentsById: ReadonlyMap<string, PlacedComponent>,
): Point[] | undefined {
  const from = componentsById.get(wire.from.componentId);
  const to = componentsById.get(wire.to.componentId);
  if (!from || !to) return undefined;
  return [
    terminalPosition(from, wire.from.terminalId),
    ...wire.bends,
    terminalPosition(to, wire.to.terminalId),
  ];
}

/** Titik tengah tiap ruas; ruas ke-i menghubungkan titik ke-i dan ke-(i+1). */
export function segmentMidpoints(points: readonly Point[]): Point[] {
  const mids: Point[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return mids;
}
