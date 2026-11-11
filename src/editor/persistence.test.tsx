import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import singleRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import twoWayRaw from '../../tests/fixtures/saklar-tukar.json?raw';
import { App } from '../App';
import { parseProject, serializeProject } from '../core/serialize';
import { createEmptyProject, type Project } from '../core/types';
import { simulate } from '../sim/simulate';
import { importFile, loadSaved, startAutosave, STORAGE_KEY } from './persistence';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const installation = () => useEditor.getState().project.boards.installation;
const palette = () => screen.getByRole('complementary', { name: 'Palet peralatan' });
const add = (name: string) => fireEvent.click(within(palette()).getByRole('button', { name }));
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
});

describe('urungkan dan ulangi', () => {
  test('tombol nonaktif tanpa riwayat', () => {
    render(<App />);
    expect(button('Urungkan')).toBeDisabled();
    expect(button('Ulangi')).toBeDisabled();
  });

  test('memulihkan penambahan, pemindahan, dan penghapusan komponen', () => {
    render(<App />);
    add('Lampu');
    act(() => useEditor.getState().move('c1', { x: 3, y: 4 }));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(installation().components).toEqual([]);

    fireEvent.click(button('Urungkan'));
    expect(installation().components[0]?.position).toEqual({ x: 3, y: 4 });
    fireEvent.click(button('Urungkan'));
    expect(installation().components[0]?.position).toEqual({ x: 19, y: 14 });
    fireEvent.click(button('Urungkan'));
    expect(installation().components).toEqual([]);
    expect(button('Urungkan')).toBeDisabled();

    fireEvent.click(button('Ulangi'));
    fireEvent.click(button('Ulangi'));
    expect(installation().components[0]?.position).toEqual({ x: 3, y: 4 });
    fireEvent.click(button('Ulangi'));
    expect(installation().components).toEqual([]);
    expect(button('Ulangi')).toBeDisabled();
  });

  test('memulihkan kabel: dibuat, diwarnai, dihapus bersama komponennya', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('Lampu');
    act(() => {
      const { clickTerminal } = useEditor.getState();
      clickTerminal({ componentId: 'c1', terminalId: 'L' });
      clickTerminal({ componentId: 'c2', terminalId: 'L' });
    });
    act(() => useEditor.getState().select('c2'));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(installation().wires).toEqual([]);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(installation().wires).toHaveLength(1);
    expect(installation().components).toHaveLength(2);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(installation().wires).toEqual([]);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(installation().wires).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(installation().wires).toHaveLength(1);
  });

  test('satu seretan menjadi satu langkah; klik tanpa geser tidak dicatat', () => {
    render(<App />);
    add('Lampu');
    const before = useEditor.getState().history.past.length;
    act(() => {
      const s = useEditor.getState();
      s.beginDrag();
      s.endDrag();
    });
    expect(useEditor.getState().history.past).toHaveLength(before);

    act(() => {
      const s = useEditor.getState();
      s.beginDrag();
      for (let x = 1; x <= 5; x++) s.move('c1', { x, y: 2 });
      s.endDrag();
    });
    expect(useEditor.getState().history.past).toHaveLength(before + 1);
    fireEvent.click(button('Urungkan'));
    expect(installation().components[0]?.position).toEqual({ x: 19, y: 14 });
  });

  test('tindakan yang tidak mengubah apa pun tidak dicatat', () => {
    render(<App />);
    add('Lampu');
    const before = useEditor.getState().history.past.length;
    act(() => {
      const s = useEditor.getState();
      s.move('c1', { x: 19, y: 14 });
      s.clickTerminal({ componentId: 'c1', terminalId: 'L' });
      s.clickTerminal({ componentId: 'c1', terminalId: 'L' });
      s.setWireColor('blue');
    });
    expect(useEditor.getState().history.past).toHaveLength(before);
  });

  test('tidak bisa mengurungkan selama papan bertegangan', () => {
    render(<App />);
    add('Lampu');
    fireEvent.click(button('Beri tegangan'));
    expect(button('Urungkan')).toBeDisabled();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(installation().components).toHaveLength(1);
  });
});

describe('kosongkan papan', () => {
  test('meminta konfirmasi; Batal tidak menghapus apa pun', () => {
    render(<App />);
    expect(button('Kosongkan')).toBeDisabled();
    add('Lampu');
    fireEvent.click(button('Kosongkan'));
    const dialog = screen.getByRole('alertdialog', { name: 'Kosongkan papan?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(installation().components).toHaveLength(1);
  });

  test('Escape menutup dialog', () => {
    render(<App />);
    add('Lampu');
    fireEvent.click(button('Kosongkan'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(installation().components).toHaveLength(1);
  });

  test('setelah dikonfirmasi kedua papan kosong, dan bisa diurungkan', () => {
    useEditor.setState({ project: load(singleRaw) });
    render(<App />);
    fireEvent.click(button('Kosongkan'));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Kosongkan' }),
    );
    expect(useEditor.getState().project).toEqual(createEmptyProject());
    fireEvent.click(button('Urungkan'));
    expect(installation().components).toHaveLength(4);
  });
});

describe('simpan otomatis', () => {
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());

  test('setiap perubahan papan disimpan, dan dipulihkan saat dimuat ulang', () => {
    const storage = memoryStorage();
    stop = startAutosave(storage);
    expect(storage.data.size).toBe(0);
    act(() => useEditor.getState().addAt('lamp', { x: 5, y: 5 }));
    const saved = useEditor.getState().project;
    expect(loadSaved(storage)).toEqual(saved);
    stop();

    // "Muat ulang": state kembali awal, lalu simpan otomatis dijalankan lagi.
    useEditor.setState(useEditor.getInitialState(), true);
    stop = startAutosave(storage);
    expect(useEditor.getState().project).toEqual(saved);
    expect(useEditor.getState().history.past).toEqual([]);
  });

  test('selama menyeret tidak menyimpan; hasil akhirnya tersimpan saat seretan selesai', () => {
    const storage = memoryStorage();
    stop = startAutosave(storage);
    act(() => useEditor.getState().addAt('lamp', { x: 5, y: 5 }));
    const setItem = vi.spyOn(storage, 'setItem');
    act(() => {
      const s = useEditor.getState();
      s.beginDrag();
      s.move('c1', { x: 1, y: 1 });
      s.move('c1', { x: 2, y: 2 });
    });
    expect(setItem).not.toHaveBeenCalled();
    act(() => useEditor.getState().endDrag());
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(loadSaved(storage)?.boards.installation.components[0]?.position).toEqual({
      x: 2,
      y: 2,
    });
  });

  test('simpanan rusak diabaikan', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{ bukan json' });
    expect(loadSaved(storage)).toBeNull();
    stop = startAutosave(storage);
    expect(useEditor.getState().project).toEqual(createEmptyProject());
  });

  test('penyimpanan yang gagal tidak menghentikan aplikasi', () => {
    const storage = {
      getItem: () => {
        throw new Error('diblokir');
      },
      setItem: () => {
        throw new Error('penuh');
      },
    };
    stop = startAutosave(storage);
    expect(() => act(() => useEditor.getState().addAt('lamp', { x: 5, y: 5 }))).not.toThrow();
    expect(installation().components).toHaveLength(1);
  });
});

describe('ekspor dan impor', () => {
  test('ekspor lalu impor menghasilkan papan dan hasil simulasi yang identik', async () => {
    const original = load(twoWayRaw);
    const text = serializeProject(original);
    expect(await importFile({ text: () => Promise.resolve(text) })).toBe(true);
    const imported = useEditor.getState().project;
    expect(imported).toEqual(original);
    expect(simulate(imported, {})).toEqual(simulate(original, {}));
  });

  test('ekspor mengunduh berkas .json berisi papan', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:uji';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    useEditor.setState({ project: load(singleRaw) });
    render(<App />);
    fireEvent.click(button('Ekspor'));

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/\.json$/);
    const parsed = parseProject(await (blobs[0] as Blob).text());
    expect(parsed.ok && parsed.project).toEqual(load(singleRaw));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:uji');
    click.mockRestore();
  });

  test('memilih berkas lewat tombol Impor mengganti papan; bisa diurungkan', async () => {
    render(<App />);
    add('Lampu');
    const file = new File([singleRaw], 'lampu.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Berkas papan'), { target: { files: [file] } });
    await waitFor(() => expect(installation().components).toHaveLength(4));
    expect(installation().wires).toHaveLength(4);

    fireEvent.click(button('Urungkan'));
    expect(installation().components).toHaveLength(1);
  });

  test('berkas rusak ditolak dengan pesan dan papan tidak berubah', async () => {
    render(<App />);
    add('Lampu');
    const before = useEditor.getState().project;
    const file = new File(['{"format":"lain"}'], 'salah.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Berkas papan'), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Berkas tidak bisa dibuka/);
    expect(useEditor.getState().project).toBe(before);
  });

  test('impor nonaktif selama bertegangan', () => {
    render(<App />);
    fireEvent.click(button('Beri tegangan'));
    expect(button('Impor')).toBeDisabled();
    act(() => useEditor.getState().replaceProject(load(singleRaw)));
    expect(installation().components).toEqual([]);
  });
});
