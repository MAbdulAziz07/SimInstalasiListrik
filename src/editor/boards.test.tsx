import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const palette = () => screen.getByRole('complementary', { name: 'Palet peralatan' });
const add = (name: string) => fireEvent.click(within(palette()).getByRole('button', { name }));
const tab = (name: string) => screen.getByRole('tab', { name });
const boards = () => useEditor.getState().project.boards;
const press = (element: Element) => fireEvent.pointerDown(element, { button: 0 });

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
});

describe('tab papan', () => {
  test('berpindah papan mengganti papan, palet, dan melepas pilihan', () => {
    render(<App />);
    expect(tab('Instalasi')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('application', { name: 'Papan kerja Instalasi' })).toBeInTheDocument();
    add('Lampu');
    expect(useEditor.getState().selectedId).toBe('c1');

    fireEvent.click(tab('Dalam Panel'));
    expect(tab('Dalam Panel')).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('application', { name: 'Papan kerja Dalam Panel' }),
    ).toBeInTheDocument();
    expect(useEditor.getState().selectedId).toBeNull();
    expect(within(palette()).queryByRole('button', { name: 'Lampu' })).not.toBeInTheDocument();
    expect(within(palette()).getByRole('button', { name: 'MCB 1 kutub' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Lampu' })).not.toBeInTheDocument();
  });

  test('komponen ditaruh di papan yang sedang dibuka', () => {
    render(<App />);
    fireEvent.click(tab('Dalam Panel'));
    add('MCB 1 kutub');
    expect(boards().panel.components.map((c) => c.type)).toEqual(['mcb1p']);
    expect(boards().installation.components).toEqual([]);
  });

  test('papan Dalam Panel memberi petunjuk selama belum ada panel', () => {
    render(<App />);
    fireEvent.click(tab('Dalam Panel'));
    expect(screen.getByText(/Belum ada panel listrik/)).toBeInTheDocument();
    fireEvent.click(tab('Instalasi'));
    add('Panel listrik');
    fireEvent.click(tab('Dalam Panel'));
    expect(screen.queryByText(/Belum ada panel listrik/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Terminal blok X1' })).toBeInTheDocument();
  });
});

describe('panel listrik', () => {
  test('hanya satu panel; terminal blok tidak ada di palet', () => {
    render(<App />);
    add('Panel listrik');
    expect(within(palette()).getByRole('button', { name: 'Panel listrik' })).toBeDisabled();
    expect(boards().panel.components.map((c) => c.type)).toEqual(['terminalBlock']);
    fireEvent.click(tab('Dalam Panel'));
    expect(
      within(palette()).queryByRole('button', { name: 'Terminal blok X1' }),
    ).not.toBeInTheDocument();
  });

  test('klik dua kali panel membuka papan Dalam Panel', () => {
    render(<App />);
    add('Panel listrik');
    fireEvent.doubleClick(screen.getByRole('group', { name: 'Panel listrik' }));
    expect(useEditor.getState().activeBoard).toBe('panel');
  });

  test('terminal blok tidak bisa dihapus; menghapus panel menghapus keduanya', () => {
    render(<App />);
    add('Panel listrik');
    fireEvent.click(tab('Dalam Panel'));
    press(screen.getByRole('group', { name: 'Terminal blok X1' }));
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(boards().panel.components).toHaveLength(1);

    fireEvent.click(tab('Instalasi'));
    press(screen.getByRole('group', { name: 'Panel listrik' }));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(boards().installation.components).toEqual([]);
    expect(boards().panel.components).toEqual([]);
    expect(within(palette()).getByRole('button', { name: 'Panel listrik' })).toBeEnabled();
  });
});

describe('setelan terminal X1', () => {
  const labels = () => boards().installation.components[0]?.settings?.x1Labels;

  test('muncul saat panel atau terminal blok terpilih', () => {
    render(<App />);
    add('Lampu');
    expect(screen.queryByRole('complementary', { name: 'Setelan komponen' })).toBeNull();
    add('Panel listrik');
    expect(screen.getByRole('complementary', { name: 'Setelan komponen' })).toBeInTheDocument();
    fireEvent.click(tab('Dalam Panel'));
    expect(screen.queryByRole('complementary', { name: 'Setelan komponen' })).toBeNull();
    press(screen.getByRole('group', { name: 'Terminal blok X1' }));
    expect(screen.getByRole('complementary', { name: 'Setelan komponen' })).toBeInTheDocument();
  });

  test('jumlah terminal bisa ditambah dan dikurangi di kedua papan sekaligus', () => {
    render(<App />);
    add('Panel listrik');
    expect(labels()).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah terminal' }));
    expect(labels()).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Terminal X1:9 Panel listrik' })).toBeInTheDocument();
    expect(boards().panel.components[0]?.settings?.x1Labels).toHaveLength(9);

    fireEvent.click(screen.getByRole('button', { name: 'Kurangi terminal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi terminal' }));
    expect(labels()).toHaveLength(7);
    expect(screen.queryByRole('button', { name: 'Terminal X1:8 Panel listrik' })).toBeNull();
  });

  test('label tampil di kedua papan; mengetik satu label menjadi satu langkah riwayat', () => {
    render(<App />);
    add('Panel listrik');
    const past = useEditor.getState().history.past.length;
    const input = screen.getByRole('textbox', { name: 'Label X1:3' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'U' } });
    fireEvent.change(input, { target: { value: 'U1' } });
    fireEvent.blur(input);
    expect(labels()?.[2]).toBe('U1');
    expect(useEditor.getState().history.past).toHaveLength(past + 1);
    expect(
      screen.getByRole('button', { name: 'Terminal X1:3 (U1) Panel listrik' }),
    ).toBeInTheDocument();

    fireEvent.click(tab('Dalam Panel'));
    expect(
      screen.getByRole('button', { name: 'Terminal X1:3 (U1) Terminal blok X1' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Terminal blok X1' })).getByText('U1'),
    ).toBeTruthy();
  });

  test('tidak bisa disetel selama bertegangan', () => {
    render(<App />);
    add('Panel listrik');
    fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
    expect(screen.queryByRole('complementary', { name: 'Setelan komponen' })).toBeNull();
    act(() => {
      useEditor.getState().setX1Count(3);
      useEditor.getState().setX1Label(0, 'X');
    });
    expect(labels()).toEqual(Array(8).fill(''));
  });
});

describe('simulasi atas dua papan', () => {
  test('saklar di Instalasi dan MCB di Dalam Panel mengendalikan lampu yang sama', () => {
    useEditor.setState({ project: load(twoBoardsRaw) });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
    const lamp = () =>
      document.querySelector('[data-component-id="lampu"]')?.getAttribute('data-lamp');

    press(screen.getByRole('switch', { name: 'Saklar tunggal' }));
    expect(lamp()).toBe('menyala');

    // Status bertegangan berlaku untuk kedua papan.
    fireEvent.click(tab('Dalam Panel'));
    expect(screen.getByRole('button', { name: 'Matikan' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Kabel Cokelat (L1), bertegangan' })).toHaveLength(
      2,
    );
    press(screen.getByRole('switch', { name: 'MCB 1 kutub' }));

    fireEvent.click(tab('Instalasi'));
    expect(lamp()).toBe('padam');
  });
});
