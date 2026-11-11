import { describe, expect, test } from 'vitest';
import {
  addComponent,
  findComponent,
  moveComponent,
  nextId,
  removeComponent,
  rotateComponent,
} from './edit';
import { createEmptyProject, type Project } from './types';

function twoComponents(): Project {
  let project = createEmptyProject();
  project = addComponent(project, 'installation', 'source1ph', { x: 10, y: 10 }).project;
  project = addComponent(project, 'installation', 'lamp', { x: 20, y: 10 }).project;
  project.boards.installation.wires.push({
    id: 'w1',
    from: { componentId: 'c1', terminalId: 'L' },
    to: { componentId: 'c2', terminalId: 'L' },
    color: 'brown',
    bends: [],
  });
  return project;
}

describe('addComponent', () => {
  test('menaruh komponen dengan titik tengah di posisi yang diminta, terkunci ke grid', () => {
    const { project, id } = addComponent(createEmptyProject(), 'installation', 'source1ph', {
      x: 10.3,
      y: 10.2,
    });
    expect(id).toBe('c1');
    expect(project.boards.installation.components).toEqual([
      { id: 'c1', type: 'source1ph', position: { x: 8, y: 9 }, rotation: 0 },
    ]);
  });

  test('id berikutnya tidak bentrok dengan yang sudah ada di papan mana pun', () => {
    let project = addComponent(createEmptyProject(), 'panel', 'mcb1p', { x: 0, y: 0 }).project;
    const second = addComponent(project, 'installation', 'mcb1p', { x: 0, y: 0 });
    project = second.project;
    expect(second.id).toBe('c2');
    expect(nextId(project, 'c')).toBe('c3');
  });

  test('menolak komponen di papan yang tidak diizinkan', () => {
    expect(() => addComponent(createEmptyProject(), 'panel', 'lamp', { x: 0, y: 0 })).toThrow(
      /tidak boleh/i,
    );
  });

  test('tidak mengubah proyek asal', () => {
    const original = createEmptyProject();
    addComponent(original, 'installation', 'lamp', { x: 5, y: 5 });
    expect(original).toEqual(createEmptyProject());
  });
});

describe('moveComponent', () => {
  test('memindah dan mengunci ke grid', () => {
    const project = moveComponent(twoComponents(), 'c2', { x: 30.6, y: 4.4 });
    expect(findComponent(project, 'c2')?.component.position).toEqual({ x: 31, y: 4 });
  });

  test('posisi yang sama mengembalikan komponen yang sama', () => {
    const before = twoComponents();
    const position = findComponent(before, 'c2')!.component.position;
    const after = moveComponent(before, 'c2', position);
    expect(findComponent(after, 'c2')!.component).toBe(findComponent(before, 'c2')!.component);
  });

  test('id yang tidak ada tidak mengubah apa pun', () => {
    const before = twoComponents();
    expect(moveComponent(before, 'hantu', { x: 1, y: 1 })).toBe(before);
  });
});

describe('rotateComponent', () => {
  test('berputar 90° searah jarum jam dan kembali setelah empat kali', () => {
    const start = twoComponents();
    let project = rotateComponent(start, 'c1');
    expect(findComponent(project, 'c1')?.component.rotation).toBe(90);
    for (let i = 0; i < 3; i++) project = rotateComponent(project, 'c1');
    expect(findComponent(project, 'c1')?.component.rotation).toBe(0);
  });

  test('titik tengah bergeser paling banyak setengah grid', () => {
    const start = twoComponents();
    const before = findComponent(start, 'c1')!.component; // 4×3 di (8, 9)
    const after = findComponent(rotateComponent(start, 'c1'), 'c1')!.component; // 3×4
    const centerBefore = { x: before.position.x + 2, y: before.position.y + 1.5 };
    const centerAfter = { x: after.position.x + 1.5, y: after.position.y + 2 };
    expect(Math.abs(centerAfter.x - centerBefore.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(centerAfter.y - centerBefore.y)).toBeLessThanOrEqual(0.5);
    expect(Number.isInteger(after.position.x) && Number.isInteger(after.position.y)).toBe(true);
  });
});

describe('removeComponent', () => {
  test('menghapus komponen beserta kabel yang menempel', () => {
    const project = removeComponent(twoComponents(), 'c2');
    expect(project.boards.installation.components.map((c) => c.id)).toEqual(['c1']);
    expect(project.boards.installation.wires).toEqual([]);
  });

  test('kabel yang tidak menempel tetap ada', () => {
    let project = twoComponents();
    project = addComponent(project, 'installation', 'switch1', { x: 30, y: 10 }).project;
    project = removeComponent(project, 'c3');
    expect(project.boards.installation.wires).toHaveLength(1);
  });

  test('id yang tidak ada tidak mengubah apa pun', () => {
    const before = twoComponents();
    expect(removeComponent(before, 'hantu')).toBe(before);
  });
});
