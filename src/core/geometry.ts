import { catalog } from './catalog';
import { isX1Type, x1Labels } from './catalog/panel';
import type { ComponentType, PlacedComponent, Point, Rotation, Shape } from './types';

export interface Size {
  w: number;
  h: number;
}

/** Ukuran dan terminal komponen menurut setelannya (mis. jumlah terminal X1). */
export function shapeOf(component: Pick<PlacedComponent, 'type' | 'settings'>): Shape {
  const def = catalog[component.type];
  return (
    def.shape?.(component.settings ?? def.defaultSettings ?? {}) ?? {
      size: def.size,
      terminals: def.terminals,
    }
  );
}

function rotate(size: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270 ? { w: size.h, h: size.w } : size;
}

/** Ukuran kotak komponen bawaan (tanpa setelan) setelah diputar. */
export function rotatedSize(type: ComponentType, rotation: Rotation): Size {
  return rotate({ ...catalog[type].size }, rotation);
}

/** Ukuran kotak sebuah komponen di papan setelah diputar. */
export function rotatedSizeOf(
  component: Pick<PlacedComponent, 'type' | 'settings' | 'rotation'>,
): Size {
  return rotate({ ...shapeOf(component).size }, component.rotation);
}

/**
 * Memutar titik di dalam kotak berukuran `size` searah jarum jam.
 * Hasilnya relatif terhadap sudut kiri-atas kotak yang sudah diputar.
 */
export function rotatePoint(point: Point, size: Size, rotation: Rotation): Point {
  switch (rotation) {
    case 0:
      return { x: point.x, y: point.y };
    case 90:
      return { x: size.h - point.y, y: point.x };
    case 180:
      return { x: size.w - point.x, y: size.h - point.y };
    case 270:
      return { x: point.y, y: size.w - point.x };
  }
}

export interface PlacedTerminal {
  id: string;
  /** Letak terminal di papan, dalam satuan grid. */
  position: Point;
}

export function placedTerminals(component: PlacedComponent): PlacedTerminal[] {
  const shape = shapeOf(component);
  return shape.terminals.map((terminal) => {
    const local = rotatePoint(terminal, shape.size, component.rotation);
    return {
      id: terminal.id,
      position: { x: component.position.x + local.x, y: component.position.y + local.y },
    };
  });
}

export function terminalPosition(component: PlacedComponent, terminalId: string): Point {
  const found = placedTerminals(component).find((t) => t.id === terminalId);
  if (!found) {
    throw new Error(`Terminal "${terminalId}" pada komponen "${component.id}" tidak ada.`);
  }
  return found.position;
}

/** Tulisan terminal pada gambar komponen: label X1 bila diisi, selain itu id terminalnya. */
export function terminalCaption(component: PlacedComponent, terminalId: string): string {
  if (!isX1Type(component.type)) return terminalId;
  return x1Labels(component.settings)[Number(terminalId) - 1] || terminalId;
}

/** Nama lengkap terminal untuk pembaca layar, mis. "X1:3 (L1)". */
export function terminalName(component: PlacedComponent, terminalId: string): string {
  if (!isX1Type(component.type)) return terminalId;
  const label = x1Labels(component.settings)[Number(terminalId) - 1];
  return label ? `X1:${terminalId} (${label})` : `X1:${terminalId}`;
}
