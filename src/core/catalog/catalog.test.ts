import { describe, expect, test } from 'vitest';
import { COMPONENT_TYPES } from '../types';
import { catalog } from './index';

describe.each(COMPONENT_TYPES)('definisi katalog %s', (type) => {
  const def = catalog[type];

  test('kunci katalog sama dengan tipe komponen', () => {
    expect(def.type).toBe(type);
  });

  test('punya label dan minimal satu papan yang diizinkan', () => {
    expect(def.label.length).toBeGreaterThan(0);
    expect(def.shortLabel.length).toBeGreaterThan(0);
    expect(def.boards.length).toBeGreaterThan(0);
  });

  test('id terminal unik', () => {
    const ids = def.terminals.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  test('semua terminal berada di dalam ukuran komponen, pada titik grid', () => {
    for (const t of def.terminals) {
      expect(Number.isInteger(t.x) && Number.isInteger(t.y)).toBe(true);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(def.size.w);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(def.size.h);
    }
  });

  test('tidak ada dua terminal di titik yang sama', () => {
    const spots = def.terminals.map((t) => `${t.x},${t.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });
});
