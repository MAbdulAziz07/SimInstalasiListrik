import { describe, expect, test } from 'vitest';
import { placedTerminals, rotatedSize, rotatePoint, terminalPosition } from './geometry';
import { ROTATIONS, type PlacedComponent, type Rotation } from './types';

const source = (rotation: Rotation): PlacedComponent => ({
  id: 's',
  type: 'source1ph',
  position: { x: 10, y: 20 },
  rotation,
});

describe('rotatedSize', () => {
  test('lebar dan tinggi bertukar pada 90° dan 270°', () => {
    expect(rotatedSize('source1ph', 0)).toEqual({ w: 4, h: 3 });
    expect(rotatedSize('source1ph', 90)).toEqual({ w: 3, h: 4 });
    expect(rotatedSize('source1ph', 180)).toEqual({ w: 4, h: 3 });
    expect(rotatedSize('source1ph', 270)).toEqual({ w: 3, h: 4 });
  });
});

describe('rotatePoint', () => {
  const size = { w: 4, h: 3 };

  test('sudut kiri-atas berpindah searah jarum jam', () => {
    expect(rotatePoint({ x: 0, y: 0 }, size, 0)).toEqual({ x: 0, y: 0 });
    expect(rotatePoint({ x: 0, y: 0 }, size, 90)).toEqual({ x: 3, y: 0 });
    expect(rotatePoint({ x: 0, y: 0 }, size, 180)).toEqual({ x: 4, y: 3 });
    expect(rotatePoint({ x: 0, y: 0 }, size, 270)).toEqual({ x: 0, y: 4 });
  });

  test('titik selalu tetap di dalam kotak yang sudah diputar', () => {
    for (const rotation of ROTATIONS) {
      const box = rotatedSize('source1ph', rotation);
      for (const point of [
        { x: 1, y: 3 },
        { x: 4, y: 0 },
        { x: 2, y: 1 },
      ]) {
        const p = rotatePoint(point, size, rotation);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(box.w);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(box.h);
      }
    }
  });
});

describe('letak terminal di papan', () => {
  test('tanpa rotasi: posisi komponen ditambah letak terminal', () => {
    expect(placedTerminals(source(0))).toEqual([
      { id: 'L', position: { x: 11, y: 23 } },
      { id: 'N', position: { x: 12, y: 23 } },
      { id: 'PE', position: { x: 13, y: 23 } },
    ]);
  });

  test('diputar 90°: terminal bawah pindah ke sisi kiri', () => {
    expect(placedTerminals(source(90))).toEqual([
      { id: 'L', position: { x: 10, y: 21 } },
      { id: 'N', position: { x: 10, y: 22 } },
      { id: 'PE', position: { x: 10, y: 23 } },
    ]);
  });

  test('diputar 180°: terminal bawah pindah ke sisi atas, urutan terbalik', () => {
    expect(terminalPosition(source(180), 'L')).toEqual({ x: 13, y: 20 });
    expect(terminalPosition(source(180), 'PE')).toEqual({ x: 11, y: 20 });
  });

  test('terminal yang tidak ada ditolak', () => {
    expect(() => terminalPosition(source(0), 'X')).toThrow(/terminal/i);
  });
});
