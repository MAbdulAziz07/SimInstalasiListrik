import { describe, expect, test } from 'vitest';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import { X1_DEFAULT, X1_LABEL_MAX, X1_MAX, X1_MIN } from './catalog/panel';
import {
  addComponent,
  addWire,
  currentX1Labels,
  findByType,
  removeComponent,
  rotateComponent,
  setX1Labels,
} from './edit';
import { placedTerminals, rotatedSizeOf, shapeOf, terminalCaption, terminalName } from './geometry';
import { parseProject, serializeProject } from './serialize';
import { createEmptyProject, type PlacedComponent, type Project } from './types';

function withPanel(): Project {
  return addComponent(createEmptyProject(), 'installation', 'panel', { x: 10, y: 10 }).project;
}
const panelOf = (project: Project) => findByType(project, 'panel')?.component as PlacedComponent;
const blockOf = (project: Project) =>
  findByType(project, 'terminalBlock')?.component as PlacedComponent;

describe('panel listrik dan terminal blok X1', () => {
  test('memasang panel ikut memasang terminal blok di papan Dalam Panel', () => {
    const project = withPanel();
    expect(project.boards.installation.components.map((c) => c.type)).toEqual(['panel']);
    expect(project.boards.panel.components.map((c) => c.type)).toEqual(['terminalBlock']);
    expect(panelOf(project).id).not.toBe(blockOf(project).id);
    expect(currentX1Labels(project)).toHaveLength(X1_DEFAULT);
    expect(shapeOf(blockOf(project)).terminals.map((t) => t.id)).toEqual(
      shapeOf(panelOf(project)).terminals.map((t) => t.id),
    );
  });

  test('hanya satu panel: memasang lagi mengembalikan panel yang sudah ada', () => {
    const project = withPanel();
    const again = addComponent(project, 'installation', 'panel', { x: 30, y: 30 });
    expect(again.project).toBe(project);
    expect(again.id).toBe(panelOf(project).id);
  });

  test('terminal blok tidak bisa dipasang atau dihapus sendiri', () => {
    const project = withPanel();
    expect(() => addComponent(project, 'panel', 'terminalBlock', { x: 0, y: 0 })).toThrow(
      /otomatis/,
    );
    expect(removeComponent(project, blockOf(project).id)).toBe(project);
  });

  test('menghapus panel menghapus terminal blok dan kabel di kedua papan', () => {
    let project = withPanel();
    project = addComponent(project, 'installation', 'lamp', { x: 2, y: 2 }).project;
    project = addComponent(project, 'panel', 'mcb1p', { x: 2, y: 2 }).project;
    const lamp = project.boards.installation.components[1] as PlacedComponent;
    const mcb = project.boards.panel.components[1] as PlacedComponent;
    project = addWire(
      project,
      'installation',
      { componentId: lamp.id, terminalId: 'L' },
      { componentId: panelOf(project).id, terminalId: '1' },
      'brown',
    ).project;
    project = addWire(
      project,
      'panel',
      { componentId: mcb.id, terminalId: '1' },
      { componentId: blockOf(project).id, terminalId: '1' },
      'brown',
    ).project;
    expect(project.boards.panel.wires).toHaveLength(1);

    const removed = removeComponent(project, panelOf(project).id);
    expect(removed.boards.installation.components.map((c) => c.type)).toEqual(['lamp']);
    expect(removed.boards.panel.components.map((c) => c.type)).toEqual(['mcb1p']);
    expect(removed.boards.installation.wires).toEqual([]);
    expect(removed.boards.panel.wires).toEqual([]);
  });

  test('jumlah dan label disetel pada panel dan terminal blok sekaligus', () => {
    const project = setX1Labels(withPanel(), ['L1', 'L2', 'L3', 'N', 'PE']);
    expect(panelOf(project).settings?.x1Labels).toEqual(['L1', 'L2', 'L3', 'N', 'PE']);
    expect(blockOf(project).settings).toEqual(panelOf(project).settings);
    expect(shapeOf(panelOf(project)).terminals).toHaveLength(5);
    expect(shapeOf(blockOf(project)).terminals).toHaveLength(5);
    expect(shapeOf(blockOf(project)).size.w).toBe(6);
  });

  test('jumlah dibatasi dan label dipotong', () => {
    expect(currentX1Labels(setX1Labels(withPanel(), []))).toHaveLength(X1_MIN);
    const many = Array<string>(X1_MAX + 10).fill('terlalu panjang');
    const labels = currentX1Labels(setX1Labels(withPanel(), many)) as string[];
    expect(labels).toHaveLength(X1_MAX);
    expect(labels[0]).toHaveLength(X1_LABEL_MAX);
  });

  test('tanpa panel, menyetel X1 tidak mengubah apa pun', () => {
    const empty = createEmptyProject();
    expect(setX1Labels(empty, ['a', 'b'])).toBe(empty);
    expect(currentX1Labels(empty)).toBeUndefined();
  });

  test('mengurangi terminal menghapus kabel pada terminal yang hilang saja', () => {
    let project = withPanel();
    project = addComponent(project, 'installation', 'lamp', { x: 2, y: 2 }).project;
    const lamp = project.boards.installation.components[1] as PlacedComponent;
    const panelId = panelOf(project).id;
    project = addWire(
      project,
      'installation',
      { componentId: lamp.id, terminalId: 'L' },
      { componentId: panelId, terminalId: '2' },
      'brown',
    ).project;
    project = addWire(
      project,
      'installation',
      { componentId: lamp.id, terminalId: 'N' },
      { componentId: panelId, terminalId: '6' },
      'blue',
    ).project;
    const shrunk = setX1Labels(project, ['', '', '']);
    expect(shrunk.boards.installation.wires.map((w) => w.to.terminalId)).toEqual(['2']);
  });

  test('terminal ditulis dengan labelnya; tanpa label dengan nomornya', () => {
    const project = setX1Labels(withPanel(), ['L1', '']);
    const panel = panelOf(project);
    expect(terminalCaption(panel, '1')).toBe('L1');
    expect(terminalCaption(panel, '2')).toBe('2');
    expect(terminalName(panel, '1')).toBe('X1:1 (L1)');
    expect(terminalName(panel, '2')).toBe('X1:2');
    const lamp: PlacedComponent = { id: 'x', type: 'lamp', position: { x: 0, y: 0 }, rotation: 0 };
    expect(terminalCaption(lamp, 'L')).toBe('L');
    expect(terminalName(lamp, 'N')).toBe('N');
  });

  test('panel yang diputar tetap menaruh terminal di tepinya', () => {
    const project = setX1Labels(withPanel(), ['', '', '']);
    const rotated = panelOf(rotateComponent(project, panelOf(project).id));
    expect(rotatedSizeOf(rotated)).toEqual({ w: 5, h: 6 });
    for (const terminal of placedTerminals(rotated)) {
      expect(terminal.position.x).toBe(rotated.position.x);
    }
  });
});

type RawFile = {
  boards: Record<'installation' | 'panel', { components: Record<string, unknown>[] }>;
};

describe('berkas dengan panel', () => {
  const raw = JSON.parse(twoBoardsRaw) as RawFile;
  const broken = (change: (data: RawFile) => void) => {
    const copy = structuredClone(raw);
    change(copy);
    return parseProject(JSON.stringify(copy));
  };
  const block = (data: RawFile) => data.boards.panel.components[0] as Record<string, unknown>;

  test('berkas acuan dua papan sah dan bolak-balik tanpa berubah', () => {
    const result = parseProject(twoBoardsRaw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(parseProject(serializeProject(result.project))).toEqual(result);
  });

  test.each<[string, (data: RawFile) => void]>([
    ['panel tanpa terminal blok', (d) => void d.boards.panel.components.shift()],
    [
      'terminal blok tanpa panel',
      (d) => {
        d.boards.installation.components = d.boards.installation.components.filter(
          (c) => c.type !== 'panel',
        );
        (
          d as unknown as { boards: { installation: { wires: unknown[] } } }
        ).boards.installation.wires = [];
      },
    ],
    ['setelan X1 berbeda', (d) => void (block(d).settings = { x1Labels: ['a', 'b', 'c', 'd'] })],
    ['setelan X1 hilang', (d) => void delete block(d).settings],
    ['terlalu sedikit terminal', (d) => void (block(d).settings = { x1Labels: ['a'] })],
    [
      'dua panel',
      (d) => {
        d.boards.installation.components.push({
          ...(d.boards.installation.components[1] as Record<string, unknown>),
          id: 'panel2',
        });
      },
    ],
  ])('ditolak: %s', (_name, change) => {
    const result = broken(change);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^Berkas rusak/);
  });
});
