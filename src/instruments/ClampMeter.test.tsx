import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import starDeltaRaw from '../../tests/fixtures/star-delta.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from '../editor/store';
import type { ComponentStates } from '../sim/types';
import { useInstruments } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const ON: ComponentStates = {
  mcb: { kind: 'mcb', closed: true, tripped: false },
  saklar: { kind: 'switch', closed: true },
};

function open(project: Project, states: ComponentStates = ON) {
  useEditor.setState({ project, simStates: states });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Tang ampere' }));
}

const clamp = () => screen.getByRole('region', { name: 'Tang ampere' });
const display = () => screen.getByRole('status', { name: 'Layar tang ampere' });
const jaw = () => within(clamp()).getByRole('button', { name: 'Jepit ke kabel' });
const wire = (id: string) => document.querySelector(`[data-wire-id="${id}"]`) as Element;
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
const amps = () => Number((display().textContent ?? '').replace(' A', '').replace(',', '.'));

/** Klik tombol jepit, lalu klik kabel. */
function clampOn(id: string) {
  fireEvent.pointerDown(jaw(), { button: 0 });
  fireEvent.pointerUp(jaw());
  fireEvent.pointerDown(wire(id), { button: 0 });
  fireEvent.pointerUp(wire(id));
}

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
  useInstruments.setState(useInstruments.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('tang ampere di papan', () => {
  test('dikeluarkan dan disimpan dari kelompok Alat Ukur di palet', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Tang ampere' });
    expect(screen.queryByRole('region', { name: 'Tang ampere' })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(display()).toHaveTextContent('- - - -');
    expect(within(clamp()).getByText('Jepitkan tang ke satu kabel.')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: 'Tang ampere' })).toBeNull();
  });

  test('dijepitkan dengan klik tombol lalu klik kabel; kabel tidak ikut terpilih', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(jaw(), { button: 0 });
    fireEvent.pointerUp(jaw());
    expect(jaw()).toHaveAttribute('aria-pressed', 'true');
    expect(within(clamp()).getByText(/Klik kabel yang akan dijepit/)).toBeInTheDocument();

    fireEvent.pointerDown(wire('k3'), { button: 0 });
    expect(useInstruments.getState().clampWire).toBe('k3');
    expect(useInstruments.getState().clampPicking).toBe(false);
    expect(useEditor.getState().selectedId).toBeNull();
    expect(document.querySelector('[data-clamp="k3"]')).not.toBeNull();
    expect(
      within(clamp()).getByText('Kabel Cokelat (L1): Saklar 1 → Lampu L (Instalasi)'),
    ).toBeInTheDocument();
  });

  test('bisa diseret dari tombol dan dilepas di kabel; Enter pada kabel juga menjepit', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(jaw(), { button: 0 });
    fireEvent.pointerUp(wire('k4'));
    expect(useInstruments.getState().clampWire).toBe('k4');

    fireEvent.click(jaw(), { detail: 0 });
    fireEvent.keyDown(wire('k1'), { key: 'Enter' });
    expect(useInstruments.getState().clampWire).toBe('k1');
  });

  test('Escape membatalkan; setelah itu klik kabel kembali memilih kabel', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(jaw(), { button: 0 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useInstruments.getState().clampPicking).toBe(false);
    fireEvent.pointerDown(wire('k3'), { button: 0 });
    expect(useInstruments.getState().clampWire).toBeNull();
    expect(useEditor.getState().selectedId).toBe('k3');
  });

  test('0 A saat mati, arus lampu saat bertegangan, 0 A lagi saat saklar dibuka', () => {
    open(load(lampRaw));
    clampOn('k3');
    expect(display()).toHaveTextContent('0,00 A');
    energize();
    expect(display()).toHaveTextContent('0,26 A');
    fireEvent.pointerDown(screen.getByRole('switch', { name: 'Saklar tunggal' }), { button: 0 });
    expect(display()).toHaveTextContent('0,00 A');
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(display()).toHaveTextContent('0,00 A');
  });

  test('bisa dijepitkan saat papan bertegangan', () => {
    open(load(lampRaw));
    energize();
    clampOn('k1');
    expect(display()).toHaveTextContent('0,26 A');
  });

  test('Lepas dan kabel yang dihapus mengosongkan layar', () => {
    open(load(lampRaw));
    clampOn('k3');
    fireEvent.click(within(clamp()).getByRole('button', { name: 'Lepas' }));
    expect(display()).toHaveTextContent('- - - -');
    expect(document.querySelector('[data-clamp]')).toBeNull();

    clampOn('k3');
    act(() => useEditor.getState().select('k3'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(display()).toHaveTextContent('- - - -');
  });

  test('membawa tang ampere membatalkan probe multimeter yang sedang dibawa', () => {
    open(load(lampRaw));
    fireEvent.click(screen.getByRole('button', { name: 'Multimeter' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Probe merah' }), { button: 0 });
    expect(useInstruments.getState().picking).toBe('red');
    fireEvent.pointerDown(jaw(), { button: 0 });
    expect(useInstruments.getState().picking).toBeNull();
    expect(useInstruments.getState().clampPicking).toBe(true);
  });
});

describe('tang ampere pada star-delta', () => {
  test('bacaan bintang sepertiga bacaan segitiga (± 5%) di kabel suplai', () => {
    vi.useFakeTimers();
    open(load(starDeltaRaw), {});
    clampOn('i2');
    energize();
    fireEvent.click(screen.getByRole('tab', { name: 'Dalam Panel' }));
    // Jepitan tertinggal di papan Instalasi; bacaannya tetap tampil.
    expect(document.querySelector('[data-clamp]')).toBeNull();
    const board = screen.getByRole('application', { name: 'Papan kerja Dalam Panel' });
    fireEvent.pointerDown(within(board).getByRole('button', { name: 'Push button NO' }), {
      button: 0,
    });
    fireEvent.pointerUp(board);

    const star = amps();
    expect(star).toBeGreaterThan(2);
    act(() => void vi.advanceTimersByTime(6_000));
    const delta = amps();
    expect(Math.abs(star / delta - 1 / 3)).toBeLessThan(0.05 / 3);
  });
});
