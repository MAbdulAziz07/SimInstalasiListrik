import { describe, expect, test } from 'vitest';
import {
  addComponent,
  addWire,
  findWire,
  insertBend,
  moveBend,
  moveComponent,
  removeBend,
  removeComponent,
  removeWire,
  setWireColor,
} from './edit';
import { parseProject, serializeProject } from './serialize';
import { createEmptyProject, type Project, type TerminalRef } from './types';

const ref = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });

/** c1 = sumber, c2 = lampu di Instalasi; c3 = MCB di Dalam Panel. */
function base(): Project {
  let project = createEmptyProject();
  project = addComponent(project, 'installation', 'source1ph', { x: 10, y: 10 }).project;
  project = addComponent(project, 'installation', 'lamp', { x: 20, y: 10 }).project;
  project = addComponent(project, 'panel', 'mcb1p', { x: 5, y: 5 }).project;
  return project;
}

function wired(): Project {
  return addWire(base(), 'installation', ref('c1', 'L'), ref('c2', 'L'), 'brown').project;
}

describe('addWire', () => {
  test('menyambung dua terminal dan memberi id baru', () => {
    const { project, id } = addWire(
      base(),
      'installation',
      ref('c1', 'L'),
      ref('c2', 'L'),
      'brown',
    );
    expect(id).toBe('w1');
    expect(project.boards.installation.wires).toEqual([
      { id: 'w1', from: ref('c1', 'L'), to: ref('c2', 'L'), color: 'brown', bends: [] },
    ]);
  });

  test('titik belok awal dikunci ke grid', () => {
    const { project } = addWire(base(), 'installation', ref('c1', 'N'), ref('c2', 'N'), 'blue', [
      { x: 3.4, y: 7.6 },
    ]);
    expect(project.boards.installation.wires[0]?.bends).toEqual([{ x: 3, y: 8 }]);
  });

  test('satu terminal boleh menerima lebih dari satu kabel', () => {
    let project = wired();
    project = addWire(project, 'installation', ref('c1', 'L'), ref('c2', 'N'), 'brown').project;
    expect(project.boards.installation.wires).toHaveLength(2);
  });

  test.each([
    ['ujung yang sama', ref('c1', 'L'), ref('c1', 'L')],
    ['komponen yang tidak ada', ref('c1', 'L'), ref('hantu', 'L')],
    ['terminal yang tidak ada', ref('c1', 'L'), ref('c2', 'Z')],
    ['komponen di papan lain', ref('c1', 'L'), ref('c3', '1')],
  ])('menolak %s', (_name, from, to) => {
    const before = base();
    const result = addWire(before, 'installation', from, to, 'brown');
    expect(result.id).toBeUndefined();
    expect(result.project).toBe(before);
  });

  test('menolak kabel ganda, juga yang arahnya terbalik', () => {
    const before = wired();
    expect(addWire(before, 'installation', ref('c1', 'L'), ref('c2', 'L'), 'blue').id).toBe(
      undefined,
    );
    expect(addWire(before, 'installation', ref('c2', 'L'), ref('c1', 'L'), 'blue').id).toBe(
      undefined,
    );
  });

  test('hasilnya lolos simpan dan baca kembali', () => {
    const project = wired();
    expect(parseProject(serializeProject(project))).toEqual({ ok: true, project });
  });
});

describe('ubah kabel', () => {
  test('removeWire menghapus hanya kabel itu', () => {
    let project = wired();
    project = addWire(project, 'installation', ref('c1', 'N'), ref('c2', 'N'), 'blue').project;
    project = removeWire(project, 'w1');
    expect(project.boards.installation.wires.map((w) => w.id)).toEqual(['w2']);
  });

  test('setWireColor mengganti warna', () => {
    expect(findWire(setWireColor(wired(), 'w1', 'blue'), 'w1')?.wire.color).toBe('blue');
  });

  test('id yang tidak ada tidak mengubah apa pun', () => {
    const before = wired();
    expect(removeWire(before, 'hantu')).toBe(before);
    expect(setWireColor(before, 'hantu', 'blue')).toBe(before);
    expect(insertBend(before, 'hantu', 0, { x: 1, y: 1 })).toBe(before);
  });

  test('kabel tetap menempel saat komponennya dipindah, dan hilang saat komponennya dihapus', () => {
    const moved = moveComponent(wired(), 'c2', { x: 40, y: 40 });
    expect(findWire(moved, 'w1')?.wire.to).toEqual(ref('c2', 'L'));
    expect(findWire(removeComponent(moved, 'c2'), 'w1')).toBeUndefined();
  });
});

describe('titik belok', () => {
  const bends = (project: Project) => findWire(project, 'w1')?.wire.bends;

  test('sisip, pindah, dan hapus', () => {
    let project = insertBend(wired(), 'w1', 0, { x: 5, y: 5 });
    project = insertBend(project, 'w1', 1, { x: 9, y: 9 });
    project = insertBend(project, 'w1', 1, { x: 7.2, y: 6.8 });
    expect(bends(project)).toEqual([
      { x: 5, y: 5 },
      { x: 7, y: 7 },
      { x: 9, y: 9 },
    ]);

    project = moveBend(project, 'w1', 1, { x: 1.4, y: 2.6 });
    expect(bends(project)?.[1]).toEqual({ x: 1, y: 3 });

    project = removeBend(project, 'w1', 0);
    expect(bends(project)).toEqual([
      { x: 1, y: 3 },
      { x: 9, y: 9 },
    ]);
  });

  test('indeks sisip di luar rentang dijepit ke ujung', () => {
    const project = insertBend(insertBend(wired(), 'w1', 99, { x: 1, y: 1 }), 'w1', -5, {
      x: 2,
      y: 2,
    });
    expect(bends(project)).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 1 },
    ]);
  });

  test('pindah atau hapus indeks yang tidak ada tidak mengubah kabel', () => {
    const before = insertBend(wired(), 'w1', 0, { x: 5, y: 5 });
    expect(findWire(moveBend(before, 'w1', 3, { x: 0, y: 0 }), 'w1')?.wire).toBe(
      findWire(before, 'w1')?.wire,
    );
    expect(findWire(removeBend(before, 'w1', 3), 'w1')?.wire).toBe(findWire(before, 'w1')?.wire);
  });

  test('pindah ke titik grid yang sama tidak membuat kabel baru', () => {
    const before = insertBend(wired(), 'w1', 0, { x: 5, y: 5 });
    expect(findWire(moveBend(before, 'w1', 0, { x: 5.2, y: 4.9 }), 'w1')?.wire).toBe(
      findWire(before, 'w1')?.wire,
    );
  });
});
