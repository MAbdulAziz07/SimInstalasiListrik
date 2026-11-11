import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import latchRaw from '../../tests/fixtures/pengunci.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

/** Kumparan disambung antar-fasa L1-L2 (400 V) alih-alih L1-N. */
function coilAcrossPhases(project: Project): Project {
  const copy = structuredClone(project);
  for (const wire of copy.boards.panel.wires) {
    if (wire.id === 'p5') wire.to = { componentId: 'x1', terminalId: '3' };
  }
  return copy;
}

const board = () => screen.getByRole('application', { name: 'Papan kerja Dalam Panel' });
const button = (name: string) => within(board()).getByRole('button', { name });
const state = (id: string) =>
  document.querySelector(`[data-component-id="${id}"]`)?.getAttribute('data-state');
const lamp = () => document.querySelector('[data-component-id="h1"]')?.getAttribute('data-lamp');
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));

function open(project: Project) {
  useEditor.setState({ project, activeBoard: 'panel' });
  render(<App />);
}

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
});

describe('palet komponen kontrol', () => {
  test('papan Dalam Panel memuat kontaktor, tombol, lampu indikator, dan MCB 3 kutub', () => {
    useEditor.setState({ activeBoard: 'panel' });
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    for (const item of [
      'MCB 3 kutub',
      'Kontaktor',
      'Push button NO',
      'Push button NC',
      'Lampu indikator',
    ]) {
      expect(within(palette).getByRole('button', { name: item })).toBeInTheDocument();
    }
    expect(within(palette).queryByRole('button', { name: /Sumber 3 fasa/ })).toBeNull();
  });

  test('papan Instalasi memuat sumber 3 fasa tetapi tidak memuat kontaktor', () => {
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(within(palette).getByRole('button', { name: /Sumber 3 fasa/ })).toBeInTheDocument();
    expect(within(palette).queryByRole('button', { name: 'Kontaktor' })).toBeNull();
  });
});

describe('push button dan pengunci', () => {
  test('START ditahan lalu dilepas: tombol kembali, kontaktor tetap menarik', () => {
    open(load(latchRaw));
    energize();
    expect(state('k1')).toBe('OFF');
    expect(lamp()).toBe('padam');

    fireEvent.pointerDown(button('Push button NO'), { button: 0 });
    expect(button('Push button NO')).toHaveAttribute('aria-pressed', 'true');
    expect(state('start')).toBe('DITEKAN');
    expect(state('k1')).toBe('ON');

    fireEvent.pointerUp(board());
    expect(button('Push button NO')).toHaveAttribute('aria-pressed', 'false');
    expect(state('start')).toBe('LEPAS');
    expect(state('k1')).toBe('ON');
    expect(lamp()).toBe('menyala');
  });

  test('STOP melepas kontaktor dan kembali tertutup saat dilepas', () => {
    open(load(latchRaw));
    energize();
    fireEvent.pointerDown(button('Push button NO'), { button: 0 });
    fireEvent.pointerUp(board());

    fireEvent.pointerDown(button('Push button NC'), { button: 0 });
    expect(state('k1')).toBe('OFF');
    fireEvent.pointerUp(board());
    expect(state('stop')).toBe('LEPAS');
    expect(state('k1')).toBe('OFF');
    expect(lamp()).toBe('padam');
  });

  test('papan ketik: tombol ditekan selama Spasi ditahan', () => {
    open(load(latchRaw));
    energize();
    fireEvent.keyDown(button('Push button NO'), { key: ' ' });
    expect(state('start')).toBe('DITEKAN');
    fireEvent.keyUp(button('Push button NO'), { key: ' ' });
    expect(state('start')).toBe('LEPAS');
    expect(state('k1')).toBe('ON');
  });

  test('Shift+klik mengunci tombol sampai di-Shift+klik lagi', () => {
    open(load(latchRaw));
    energize();
    fireEvent.pointerDown(button('Push button NC'), { button: 0, shiftKey: true });
    fireEvent.pointerUp(board());
    expect(state('stop')).toBe('DITEKAN');
    // Selama STOP terkunci, START tidak bisa menarik kontaktor.
    fireEvent.pointerDown(button('Push button NO'), { button: 0 });
    expect(state('k1')).toBe('OFF');
    fireEvent.pointerUp(board());

    fireEvent.pointerDown(button('Push button NC'), { button: 0, shiftKey: true });
    expect(state('stop')).toBe('LEPAS');
  });

  test('mematikan tegangan melepas tombol dan menjatuhkan kontaktor', () => {
    open(load(latchRaw));
    energize();
    fireEvent.pointerDown(button('Push button NO'), { button: 0, shiftKey: true });
    expect(state('k1')).toBe('ON');
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(state('start')).toBe('LEPAS');
    expect(state('k1')).toBe('OFF');

    // Diberi tegangan lagi: kontaktor tidak menarik sendiri.
    energize();
    expect(state('k1')).toBe('OFF');
  });

  test('push button tidak bisa dioperasikan saat rangkaian mati', () => {
    open(load(latchRaw));
    act(() => useEditor.getState().setPressed('start', true));
    expect(state('start')).toBe('LEPAS');
  });
});

describe('tegangan kumparan', () => {
  const settings = () => screen.queryByRole('complementary', { name: 'Setelan komponen' });
  const select = (id: string) =>
    fireEvent.pointerDown(document.querySelector(`[data-component-id="${id}"]`) as Element, {
      button: 0,
    });

  test('setelan kumparan bisa diubah saat rangkaian mati dan bisa diurungkan', () => {
    open(load(latchRaw));
    select('k1');
    fireEvent.pointerUp(board());
    expect(screen.getByRole('radio', { name: '230 V AC' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '400 V AC' }));
    const coil = () =>
      useEditor.getState().project.boards.panel.components.find((c) => c.id === 'k1')?.settings
        ?.coilVolts;
    expect(coil()).toBe(400);
    fireEvent.click(screen.getByRole('button', { name: 'Urungkan' }));
    expect(coil()).toBeUndefined();
  });

  test('kumparan 400 V yang diberi 230 V tidak menarik', () => {
    open(load(latchRaw));
    act(() => useEditor.getState().setCoilVolts('k1', 400));
    energize();
    fireEvent.pointerDown(button('Push button NO'), { button: 0 });
    expect(state('k1')).toBe('OFF');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('kumparan 230 V yang diberi 400 V terbakar, ditandai, dan bisa diganti', () => {
    open(coilAcrossPhases(load(latchRaw)));
    energize();
    fireEvent.pointerDown(button('Push button NO'), { button: 0 });
    fireEvent.pointerUp(board());
    expect(state('k1')).toBe('TERBAKAR');
    expect(within(board()).getByRole('group', { name: 'Kontaktor, terbakar' })).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Kumparan kontaktor terbakar: menerima sekitar 39\d V, padahal kumparannya untuk 230 V/,
    );

    // Tetap terbakar setelah tegangan dimatikan dan diberi lagi.
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(state('k1')).toBe('TERBAKAR');
    expect(settings()).toBeNull();

    select('k1');
    fireEvent.pointerUp(board());
    fireEvent.click(
      within(settings() as HTMLElement).getByRole('button', { name: 'Ganti kontaktor' }),
    );
    expect(state('k1')).toBe('OFF');
    expect(
      within(settings() as HTMLElement).queryByRole('button', { name: 'Ganti kontaktor' }),
    ).toBeNull();
  });

  test('setelan tidak bisa diubah selama bertegangan', () => {
    open(load(latchRaw));
    energize();
    act(() => {
      useEditor.getState().setCoilVolts('k1', 400);
      useEditor.getState().replaceBurnt('k1');
    });
    expect(
      useEditor.getState().project.boards.panel.components.find((c) => c.id === 'k1')?.settings,
    ).toBeUndefined();
    expect(useEditor.getState().simStates.k1).toBeDefined();
  });
});
