import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import twoBoardsRaw from '../../tests/fixtures/lampu-dua-papan.json?raw';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
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

function open(project: Project) {
  useEditor.setState({ project, simStates: ON });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Multimeter' }));
}

const meter = () => screen.getByRole('region', { name: 'Multimeter' });
const display = () => screen.getByRole('status', { name: 'Layar multimeter' });
const probe = (name: 'Probe merah' | 'Probe hitam') =>
  within(meter()).getByRole('button', { name });
const terminal = (key: string) => document.querySelector(`[data-terminal="${key}"]`) as Element;
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));

/** Klik probe, lalu klik terminal. */
function place(name: 'Probe merah' | 'Probe hitam', key: string) {
  fireEvent.pointerDown(probe(name), { button: 0 });
  fireEvent.pointerUp(probe(name));
  fireEvent.pointerDown(terminal(key), { button: 0 });
  fireEvent.pointerUp(terminal(key));
}

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
  useInstruments.setState(useInstruments.getInitialState(), true);
});

describe('multimeter di papan', () => {
  test('dikeluarkan dan disimpan dari kelompok Alat Ukur di palet', () => {
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(within(palette).getByRole('heading', { name: 'Alat Ukur' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Multimeter' })).toBeNull();

    const toggle = within(palette).getByRole('button', { name: 'Multimeter' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(display()).toHaveTextContent('- - - -');

    fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: 'Multimeter' })).toBeNull();
  });

  test('probe ditempelkan dengan klik probe lalu klik terminal; kabel tidak ikut dimulai', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(probe('Probe merah'), { button: 0 });
    fireEvent.pointerUp(probe('Probe merah'));
    expect(probe('Probe merah')).toHaveAttribute('aria-pressed', 'true');
    expect(within(meter()).getByText(/Klik terminal untuk menempelkan probe merah/)).toBeVisible();

    fireEvent.pointerDown(terminal('lampu:L'), { button: 0 });
    expect(useInstruments.getState().probes.red).toEqual({ componentId: 'lampu', terminalId: 'L' });
    expect(useInstruments.getState().picking).toBeNull();
    expect(useEditor.getState().wiring).toBeNull();
    expect(within(meter()).getByText('L · Lampu (Instalasi)')).toBeInTheDocument();
    expect(document.querySelector('[data-probe="red"]')).not.toBeNull();
  });

  test('probe juga bisa diseret dari multimeter dan dilepas di terminal', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(probe('Probe hitam'), { button: 0 });
    fireEvent.pointerUp(terminal('lampu:N'));
    expect(useInstruments.getState().probes.black).toEqual({
      componentId: 'lampu',
      terminalId: 'N',
    });
  });

  test('probe di papan bisa dipindah lewat gagangnya', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Probe merah di papan' }), {
      button: 0,
    });
    fireEvent.pointerUp(terminal('saklar:1'));
    expect(useInstruments.getState().probes.red).toEqual({
      componentId: 'saklar',
      terminalId: '1',
    });
  });

  test('Escape membatalkan probe yang sedang dibawa', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(probe('Probe merah'), { button: 0 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useInstruments.getState().picking).toBeNull();
    fireEvent.pointerDown(terminal('lampu:L'), { button: 0 });
    expect(useInstruments.getState().probes.red).toBeNull();
    // Tanpa probe yang dibawa, klik terminal kembali memulai kabel.
    expect(useEditor.getState().wiring).not.toBeNull();
  });

  test('papan ketik: Enter pada probe lalu Enter pada terminal', () => {
    open(load(lampRaw));
    fireEvent.click(probe('Probe merah'), { detail: 0 });
    expect(useInstruments.getState().picking).toBe('red');
    fireEvent.keyDown(terminal('lampu:L'), { key: 'Enter' });
    expect(useInstruments.getState().probes.red).toEqual({ componentId: 'lampu', terminalId: 'L' });
    expect(useEditor.getState().wiring).toBeNull();
  });

  test('V AC: 0 V saat mati, sekitar 230 V saat bertegangan', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    place('Probe hitam', 'lampu:N');
    expect(display()).toHaveTextContent('0,0 V');
    energize();
    expect(display().textContent).toMatch(/^2(29,\d|30,0) V$/);
    // Membuka saklar saat bertegangan langsung mengubah bacaan.
    fireEvent.pointerDown(screen.getByRole('switch', { name: 'Saklar tunggal' }), { button: 0 });
    expect(display()).toHaveTextContent('0,0 V');
  });

  test('probe bisa ditempelkan saat papan bertegangan', () => {
    open(load(lampRaw));
    energize();
    place('Probe merah', 'sumber:L');
    place('Probe hitam', 'sumber:N');
    expect(display()).toHaveTextContent('230,0 V');
  });

  test('kontinuitas/Ω: peringatan saat bertegangan, angka saat mati', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    place('Probe hitam', 'lampu:N');
    fireEvent.click(within(meter()).getByRole('radio', { name: 'Kontinuitas/Ω' }));
    expect(display()).toHaveTextContent('881,7 Ω');

    energize();
    expect(display()).toHaveTextContent('!');
    expect(display().textContent).not.toMatch(/\d/);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Rangkaian bertegangan. Matikan tegangan sebelum mengukur kontinuitas/Ω.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(display()).toHaveTextContent('881,7 Ω');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('kontinuitas mengikuti posisi saklar', () => {
    open(load(lampRaw));
    place('Probe merah', 'saklar:L');
    place('Probe hitam', 'saklar:1');
    fireEvent.click(within(meter()).getByRole('radio', { name: 'Kontinuitas/Ω' }));
    expect(display()).toHaveTextContent('0,0 Ω');
    expect(within(meter()).getByText('Tersambung.')).toBeInTheDocument();

    energize();
    fireEvent.pointerDown(screen.getByRole('switch', { name: 'Saklar tunggal' }), { button: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(display()).toHaveTextContent('OL');
  });

  test('tombol Lepas mencabut probe', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    place('Probe hitam', 'lampu:N');
    fireEvent.click(within(meter()).getByRole('button', { name: 'Lepas probe merah' }));
    expect(display()).toHaveTextContent('- - - -');
    expect(document.querySelector('[data-probe="red"]')).toBeNull();
    expect(document.querySelector('[data-probe="black"]')).not.toBeNull();
  });

  test('probe yang komponennya dihapus dianggap lepas', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    place('Probe hitam', 'lampu:N');
    act(() => useEditor.getState().select('lampu'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(display()).toHaveTextContent('- - - -');
    expect(within(meter()).getAllByText('belum ditempelkan')).toHaveLength(2);
  });

  test('menyimpan multimeter melepas kedua probe', () => {
    open(load(lampRaw));
    place('Probe merah', 'lampu:L');
    fireEvent.click(within(meter()).getByRole('button', { name: 'Simpan' }));
    expect(screen.queryByRole('region', { name: 'Multimeter' })).toBeNull();
    expect(useInstruments.getState().probes).toEqual({ red: null, black: null });
    expect(document.querySelector('[data-probe]')).toBeNull();
  });
});

describe('multimeter pada dua papan', () => {
  test('X1 bernomor sama terbaca sama di kedua papan; probe tetap menempel saat pindah papan', () => {
    open(load(twoBoardsRaw));
    place('Probe hitam', 'sumber:N');
    place('Probe merah', 'panel:2');
    energize();
    const outside = display().textContent;
    expect(outside).toMatch(/^2(29,\d|30,0) V$/);

    fireEvent.click(screen.getByRole('tab', { name: 'Dalam Panel' }));
    // Probe hitam tertinggal di papan Instalasi dan tidak digambar di sini.
    expect(document.querySelector('[data-probe="black"]')).toBeNull();
    expect(display().textContent).toBe(outside);

    place('Probe merah', 'x1:2');
    expect(document.querySelector('[data-probe="red"]')).not.toBeNull();
    expect(display().textContent).toBe(outside);
    expect(within(meter()).getByText(/Terminal blok X1 \(Dalam Panel\)/)).toBeInTheDocument();
    expect(within(meter()).getByText(/\(Instalasi\)/)).toBeInTheDocument();
  });
});
