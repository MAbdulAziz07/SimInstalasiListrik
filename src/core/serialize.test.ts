import { describe, expect, test } from 'vitest';
import { FILE_VERSION, parseProject, serializeProject } from './serialize';
import { createEmptyProject, type Project } from './types';

function lampCircuit(): Project {
  const project = createEmptyProject();
  project.boards.installation.components = [
    { id: 'c1', type: 'source1ph', position: { x: 2, y: 2 }, rotation: 0 },
    { id: 'c2', type: 'mcb1p', position: { x: 10, y: 2 }, rotation: 0 },
    { id: 'c3', type: 'switch1', position: { x: 16, y: 2 }, rotation: 90 },
    { id: 'c4', type: 'lamp', position: { x: 22, y: 2 }, rotation: 0 },
  ];
  project.boards.installation.wires = [
    wire('w1', 'c1', 'L', 'c2', '1', 'brown'),
    wire('w2', 'c2', '2', 'c3', 'L', 'brown'),
    wire('w3', 'c3', '1', 'c4', 'L', 'brown'),
    { ...wire('w4', 'c4', 'N', 'c1', 'N', 'blue'), bends: [{ x: 24, y: 9 }] },
  ];
  project.boards.panel.components = [
    { id: 'p1', type: 'mcb1p', position: { x: 4, y: 4 }, rotation: 0 },
  ];
  return project;
}

function wire(
  id: string,
  fromComponent: string,
  fromTerminal: string,
  toComponent: string,
  toTerminal: string,
  color: 'brown' | 'blue',
) {
  return {
    id,
    from: { componentId: fromComponent, terminalId: fromTerminal },
    to: { componentId: toComponent, terminalId: toTerminal },
    color,
    bends: [],
  };
}

/** Mengubah berkas hasil serialisasi lalu mencoba membacanya lagi. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- berkas sengaja dirusak tanpa tipe
function parseAltered(alter: (file: any) => void) {
  const file = JSON.parse(serializeProject(lampCircuit()));
  alter(file);
  return parseProject(JSON.stringify(file));
}

function expectError(result: ReturnType<typeof parseProject>, pattern: RegExp) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toMatch(pattern);
}

describe('serialisasi proyek', () => {
  test('serialisasi lalu baca kembali menghasilkan proyek identik', () => {
    const project = lampCircuit();
    const result = parseProject(serializeProject(project));
    expect(result).toEqual({ ok: true, project });
  });

  test('proyek kosong bisa disimpan dan dibaca', () => {
    const result = parseProject(serializeProject(createEmptyProject()));
    expect(result).toEqual({ ok: true, project: createEmptyProject() });
  });

  test('berkas mencantumkan penanda format dan versi', () => {
    const file = JSON.parse(serializeProject(createEmptyProject()));
    expect(file.format).toBe('sim-instalasi-listrik');
    expect(file.version).toBe(FILE_VERSION);
  });
});

describe('penolakan berkas', () => {
  test('bukan JSON', () => {
    expectError(parseProject('ini bukan json {'), /bukan JSON/i);
  });

  test('JSON yang bukan objek', () => {
    expectError(parseProject('[1, 2, 3]'), /bukan berkas/i);
  });

  test('penanda format salah', () => {
    expectError(
      parseAltered((f) => (f.format = 'lain')),
      /bukan berkas/i,
    );
  });

  test('versi tak dikenal', () => {
    expectError(
      parseAltered((f) => (f.version = 999)),
      /versi 999/,
    );
  });

  test('papan hilang', () => {
    expectError(
      parseAltered((f) => delete f.boards.panel),
      /papan/i,
    );
  });

  test('tipe komponen tak dikenal', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.components[0].type = 'reaktor')),
      /reaktor/,
    );
  });

  test('komponen di papan yang tidak diizinkan', () => {
    expectError(
      parseAltered((f) => (f.boards.panel.components[0].type = 'lamp')),
      /tidak boleh/i,
    );
  });

  test('id komponen ganda', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.components[1].id = 'c1')),
      /ganda/i,
    );
  });

  test('id komponen ganda antar-papan', () => {
    expectError(
      parseAltered((f) => (f.boards.panel.components[0].id = 'c1')),
      /ganda/i,
    );
  });

  test('posisi bukan angka', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.components[0].position.x = 'kiri')),
      /posisi/i,
    );
  });

  test('rotasi tidak sah', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.components[0].rotation = 45)),
      /rotasi/i,
    );
  });

  test('kabel menunjuk komponen yang tidak ada', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[0].to.componentId = 'hantu')),
      /hantu/,
    );
  });

  test('kabel menunjuk terminal yang tidak ada', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[0].to.terminalId = 'Z9')),
      /Z9/,
    );
  });

  test('kabel menunjuk komponen di papan lain', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[0].to.componentId = 'p1')),
      /p1/,
    );
  });

  test('warna kabel tidak sah', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[0].color = 'ungu')),
      /warna/i,
    );
  });

  test('titik belok rusak', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[3].bends = [{ x: 1 }])),
      /belok/i,
    );
  });

  test('id kabel ganda', () => {
    expectError(
      parseAltered((f) => (f.boards.installation.wires[1].id = 'w1')),
      /ganda/i,
    );
  });
});
