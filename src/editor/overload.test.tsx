import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import dolTorRaw from '../../tests/fixtures/dol-tor.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

function withoutPhase(project: Project): Project {
  const copy = structuredClone(project);
  copy.boards.installation.wires = copy.boards.installation.wires.filter((w) => w.id !== 'i7');
  return copy;
}

const panelBoard = () => screen.getByRole('application', { name: 'Papan kerja Dalam Panel' });
const state = (id: string) =>
  document.querySelector(`[data-component-id="${id}"]`)?.getAttribute('data-state');
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
const select = (id: string) => {
  fireEvent.pointerDown(document.querySelector(`[data-component-id="${id}"]`) as Element, {
    button: 0,
  });
  fireEvent.pointerUp(panelBoard());
};
function pushStart() {
  fireEvent.pointerDown(within(panelBoard()).getByRole('button', { name: 'Push button NO' }), {
    button: 0,
  });
  fireEvent.pointerUp(panelBoard());
}
const settingsOf = (id: string) =>
  useEditor.getState().project.boards.panel.components.find((c) => c.id === id)?.settings;

function open(project: Project) {
  useEditor.setState({ project, activeBoard: 'panel' });
  render(<App />);
}

beforeEach(() => {
  vi.useFakeTimers();
  useEditor.setState(useEditor.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TOR di papan', () => {
  test('palet Dalam Panel memuat TOR', () => {
    useEditor.setState({ activeBoard: 'panel' });
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(
      within(palette).getByRole('button', { name: 'TOR (thermal overload relay)' }),
    ).toBeInTheDocument();
  });

  test('berjalan normal: waktu berjalan tanpa TOR trip', () => {
    open(load(dolTorRaw));
    energize();
    pushStart();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(state('f2')).toBe('NORMAL');
    expect(state('k1')).toBe('ON');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('satu fasa hilang: TOR memanas, trip, memutus kontaktor, dan memberi pesan', () => {
    open(withoutPhase(load(dolTorRaw)));
    energize();
    pushStart();
    expect(state('k1')).toBe('ON');

    act(() => void vi.advanceTimersByTime(1_000));
    expect(state('f2')).toMatch(/^PANAS \d+%$/);
    expect(state('k1')).toBe('ON');

    act(() => void vi.advanceTimersByTime(3_000));
    expect(state('f2')).toBe('TRIP');
    expect(state('k1')).toBe('OFF');
    expect(screen.getByRole('alert')).toHaveTextContent(
      /TOR trip: arus ketiga fasa tidak seimbang/,
    );
  });

  test('arus lebih: pesan menyebut arus dan setelan', () => {
    open(load(dolTorRaw));
    act(() => useEditor.getState().updateSettings('f2', { torAmps: 4 }));
    energize();
    pushStart();
    act(() => void vi.advanceTimersByTime(8_000));
    expect(state('f2')).toBe('TRIP');
    expect(screen.getByRole('alert')).toHaveTextContent(
      /TOR trip: arus 7,9 A melebihi setelan 4 A/,
    );
  });

  test('TOR di-reset dengan mengekliknya; sebelum trip tidak bisa diklik', () => {
    open(withoutPhase(load(dolTorRaw)));
    energize();
    expect(within(panelBoard()).queryByRole('button', { name: 'Reset TOR' })).toBeNull();
    pushStart();
    act(() => void vi.advanceTimersByTime(4_000));

    fireEvent.pointerDown(within(panelBoard()).getByRole('button', { name: 'Reset TOR' }), {
      button: 0,
    });
    fireEvent.pointerUp(panelBoard());
    expect(state('f2')).toBe('NORMAL');
    expect(state('k1')).toBe('OFF');
  });

  test('waktu berhenti saat tegangan dimatikan; TOR yang trip tetap trip', () => {
    open(withoutPhase(load(dolTorRaw)));
    energize();
    pushStart();
    act(() => void vi.advanceTimersByTime(1_000));
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(state('f2')).toBe('NORMAL');
    act(() => void vi.advanceTimersByTime(10_000));
    expect(state('f2')).toBe('NORMAL');

    energize();
    pushStart();
    act(() => void vi.advanceTimersByTime(4_000));
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(state('f2')).toBe('TRIP');
  });
});

describe('setelan arus MCB dan TOR', () => {
  test('arus nominal MCB dipilih dari daftar dan bisa diurungkan', () => {
    open(load(dolTorRaw));
    select('q1');
    const choice = screen.getByRole('combobox', { name: 'Arus nominal' });
    expect(choice).toHaveValue('10');
    fireEvent.change(choice, { target: { value: '16' } });
    expect(settingsOf('q1')).toEqual({ mcbAmps: 16 });
    expect(screen.getByText(/80 A/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Urungkan' }));
    expect(settingsOf('q1')).toBeUndefined();
  });

  test('arus setelan TOR diketik; nilai di luar batas diabaikan', () => {
    open(load(dolTorRaw));
    select('f2');
    const input = screen.getByRole('spinbutton', { name: 'Arus setelan (A)' });
    expect(input).toHaveValue(8);
    const past = useEditor.getState().history.past.length;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '6' } });
    fireEvent.change(input, { target: { value: '6.3' } });
    fireEvent.blur(input);
    expect(settingsOf('f2')).toEqual({ torAmps: 6.3 });
    expect(useEditor.getState().history.past).toHaveLength(past + 1);

    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(settingsOf('f2')).toEqual({ torAmps: 6.3 });
  });

  test('setelan tidak bisa diubah selama bertegangan', () => {
    open(load(dolTorRaw));
    energize();
    act(() => useEditor.getState().updateSettings('f2', { torAmps: 2 }));
    expect(settingsOf('f2')).toBeUndefined();
    expect(screen.queryByRole('complementary', { name: 'Setelan komponen' })).toBeNull();
  });
});
