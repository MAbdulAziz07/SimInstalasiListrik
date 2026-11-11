import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import starDeltaRaw from '../../tests/fixtures/star-delta.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
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
function push(name: string) {
  fireEvent.pointerDown(within(panelBoard()).getByRole('button', { name }), { button: 0 });
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

describe('timer dan star-delta di papan', () => {
  test('palet Dalam Panel memuat timer', () => {
    useEditor.setState({ activeBoard: 'panel' });
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(within(palette).getByRole('button', { name: 'Timer on-delay' })).toBeInTheDocument();
  });

  test('START: bintang dulu, timer menghitung, lalu pindah ke segitiga', () => {
    open(load(starDeltaRaw));
    energize();
    expect(state('t1')).toBe('OFF');
    push('Push button NO');
    expect(state('k1')).toBe('ON');
    expect(state('k2')).toBe('ON');
    expect(state('k3')).toBe('OFF');

    act(() => void vi.advanceTimersByTime(1_000));
    expect(state('t1')).toBe('1,0 s');
    expect(state('k2')).toBe('ON');

    act(() => void vi.advanceTimersByTime(4_200));
    expect(state('t1')).toBe('ON');
    expect(state('k1')).toBe('ON');
    expect(state('k2')).toBe('OFF');
    expect(state('k3')).toBe('ON');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('motor berputar di kedua tahap', () => {
    open(load(starDeltaRaw));
    energize();
    push('Push button NO');
    fireEvent.click(screen.getByRole('tab', { name: 'Instalasi' }));
    expect(state('m1')).toBe('PUTAR KANAN');
    act(() => void vi.advanceTimersByTime(6_000));
    expect(state('m1')).toBe('PUTAR KANAN');
  });

  test('STOP dan Matikan mengembalikan timer ke awal', () => {
    open(load(starDeltaRaw));
    energize();
    push('Push button NO');
    act(() => void vi.advanceTimersByTime(6_000));
    expect(state('t1')).toBe('ON');
    push('Push button NC');
    expect(state('t1')).toBe('OFF');
    expect(state('k3')).toBe('OFF');

    push('Push button NO');
    act(() => void vi.advanceTimersByTime(2_000));
    expect(state('t1')).toBe('2,0 s');
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(state('t1')).toBe('OFF');
    act(() => void vi.advanceTimersByTime(10_000));
    expect(state('t1')).toBe('OFF');
  });
});

describe('setelan timer', () => {
  test('waktu tunda diketik; nilai di luar batas diabaikan; bisa diurungkan', () => {
    open(load(starDeltaRaw));
    select('t1');
    const input = screen.getByRole('spinbutton', { name: 'Waktu tunda (detik)' });
    expect(input).toHaveValue(5);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    expect(settingsOf('t1')).toEqual({ timerSeconds: 12 });

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.change(input, { target: { value: '999' } });
    expect(settingsOf('t1')).toEqual({ timerSeconds: 12 });

    fireEvent.click(screen.getByRole('button', { name: 'Urungkan' }));
    expect(settingsOf('t1')).toBeUndefined();
  });

  test('tegangan kumparan timer bisa dipilih', () => {
    open(load(starDeltaRaw));
    select('t1');
    expect(screen.getByRole('radio', { name: '230 V AC' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '400 V AC' }));
    expect(settingsOf('t1')).toEqual({ coilVolts: 400 });
  });

  test('waktu tunda yang disetel dipakai simulasi', () => {
    open(load(starDeltaRaw));
    act(() => useEditor.getState().updateSettings('t1', { timerSeconds: 2 }));
    energize();
    push('Push button NO');
    act(() => void vi.advanceTimersByTime(1_600));
    expect(state('k3')).toBe('OFF');
    act(() => void vi.advanceTimersByTime(600));
    expect(state('k3')).toBe('ON');
  });
});
