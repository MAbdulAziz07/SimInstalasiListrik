import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import dolRaw from '../../tests/fixtures/dol.json?raw';
import lampRaw from '../../tests/fixtures/lampu-tunggal.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project, TerminalRef } from '../core/types';
import { useEditor } from '../editor/store';
import { simulate } from '../sim/simulate';
import type { ComponentStates } from '../sim/types';
import { useInstruments } from './store';
import { readTester, testerText } from './testerReading';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const at = (componentId: string, terminalId: string): TerminalRef => ({ componentId, terminalId });
const ON: ComponentStates = {
  mcb: { kind: 'mcb', closed: true, tripped: false },
  saklar: { kind: 'switch', closed: true },
};

describe('bacaan tespen', () => {
  const project = load(lampRaw);
  const sim = simulate(project, ON);

  test('menyala di terminal fasa yang bertegangan', () => {
    for (const ref of [at('sumber', 'L'), at('mcb', '2'), at('saklar', '1'), at('lampu', 'L')]) {
      expect(readTester({ at: ref, project, sim })).toBe('lit');
    }
    expect(testerText('lit')).toBe('MENYALA');
  });

  test('padam di netral', () => {
    for (const ref of [at('sumber', 'N'), at('lampu', 'N')]) {
      expect(readTester({ at: ref, project, sim })).toBe('dark');
    }
    expect(testerText('dark')).toBe('PADAM');
  });

  test('padam di semua terminal saat rangkaian mati', () => {
    for (const ref of [at('sumber', 'L'), at('lampu', 'L'), at('sumber', 'N')]) {
      expect(readTester({ at: ref, project, sim: null })).toBe('dark');
    }
  });

  test('padam setelah saklar yang terbuka, menyala sebelum saklar', () => {
    const off = simulate(project, { ...ON, saklar: { kind: 'switch', closed: false } });
    expect(readTester({ at: at('saklar', 'L'), project, sim: off })).toBe('lit');
    expect(readTester({ at: at('saklar', '1'), project, sim: off })).toBe('dark');
    expect(readTester({ at: at('lampu', 'L'), project, sim: off })).toBe('dark');
  });

  test('netral putus: sisi netral lampu ikut bertegangan lewat lampu', () => {
    const broken = structuredClone(project);
    broken.boards.installation.wires = broken.boards.installation.wires.filter(
      (w) => w.id !== 'k4',
    );
    const result = simulate(broken, ON);
    expect(readTester({ at: at('lampu', 'N'), project: broken, sim: result })).toBe('lit');
  });

  test('sumber tiga fasa: ketiga fasa menyala, netral dan PE padam', () => {
    const dol = load(dolRaw);
    const result = simulate(dol, {});
    for (const phase of ['L1', 'L2', 'L3']) {
      expect(readTester({ at: at('sumber', phase), project: dol, sim: result })).toBe('lit');
    }
    for (const terminal of ['N', 'PE']) {
      expect(readTester({ at: at('sumber', terminal), project: dol, sim: result })).toBe('dark');
    }
  });

  test('belum disentuhkan, atau terminalnya sudah tidak ada', () => {
    expect(readTester({ at: null, project, sim })).toBe('idle');
    expect(readTester({ at: at('hilang', 'L'), project, sim })).toBe('idle');
    expect(testerText('idle')).toBe('- - - -');
  });
});

function open(project: Project) {
  useEditor.setState({ project, simStates: ON });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Tespen' }));
}

const tester = () => screen.getByRole('region', { name: 'Tespen' });
const lamp = () => screen.getByRole('status', { name: 'Lampu tespen' });
const touchButton = () => within(tester()).getByRole('button', { name: 'Sentuhkan ke terminal' });
const terminal = (key: string) => document.querySelector(`[data-terminal="${key}"]`) as Element;
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));

/** Klik tombol sentuh, lalu klik terminal. */
function touch(key: string) {
  fireEvent.pointerDown(touchButton(), { button: 0 });
  fireEvent.pointerUp(touchButton());
  fireEvent.pointerDown(terminal(key), { button: 0 });
  fireEvent.pointerUp(terminal(key));
}

describe('tespen di papan', () => {
  beforeEach(() => {
    useEditor.setState(useEditor.getInitialState(), true);
    useInstruments.setState(useInstruments.getInitialState(), true);
  });

  test('dikeluarkan dan disimpan dari kelompok Alat Ukur di palet', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Tespen' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(lamp()).toHaveTextContent('- - - -');
    fireEvent.click(within(tester()).getByRole('button', { name: 'Simpan' }));
    expect(screen.queryByRole('region', { name: 'Tespen' })).toBeNull();
  });

  test('disentuhkan dengan klik tombol lalu klik terminal; kabel tidak ikut dimulai', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(touchButton(), { button: 0 });
    fireEvent.pointerUp(touchButton());
    expect(within(tester()).getByText(/Klik terminal yang akan disentuh/)).toBeInTheDocument();
    fireEvent.pointerDown(terminal('lampu:L'), { button: 0 });
    expect(useInstruments.getState().testerAt).toEqual(at('lampu', 'L'));
    expect(useEditor.getState().wiring).toBeNull();
    expect(within(tester()).getByText('L · Lampu (Instalasi)')).toBeInTheDocument();
    expect(document.querySelector('[data-tester="lampu:L"]')).toHaveAttribute('data-lit', 'false');
  });

  test('menyala di fasa saat bertegangan, padam saat saklar dibuka dan saat dimatikan', () => {
    open(load(lampRaw));
    touch('lampu:L');
    expect(lamp()).toHaveTextContent('PADAM');
    energize();
    expect(lamp()).toHaveTextContent('MENYALA');
    expect(document.querySelector('[data-tester]')).toHaveAttribute('data-lit', 'true');

    fireEvent.pointerDown(screen.getByRole('switch', { name: 'Saklar tunggal' }), { button: 0 });
    expect(lamp()).toHaveTextContent('PADAM');
    fireEvent.pointerDown(screen.getByRole('switch', { name: 'Saklar tunggal' }), { button: 0 });
    expect(lamp()).toHaveTextContent('MENYALA');

    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(lamp()).toHaveTextContent('PADAM');
  });

  test('padam di netral; bisa dipindah saat bertegangan', () => {
    open(load(lampRaw));
    energize();
    touch('sumber:N');
    expect(lamp()).toHaveTextContent('PADAM');
    touch('sumber:L');
    expect(lamp()).toHaveTextContent('MENYALA');
  });

  test('seret ke terminal, Enter pada terminal, Escape, dan Lepas', () => {
    open(load(lampRaw));
    fireEvent.pointerDown(touchButton(), { button: 0 });
    fireEvent.pointerUp(terminal('mcb:2'));
    expect(useInstruments.getState().testerAt).toEqual(at('mcb', '2'));

    fireEvent.click(touchButton(), { detail: 0 });
    fireEvent.keyDown(terminal('mcb:1'), { key: 'Enter' });
    expect(useInstruments.getState().testerAt).toEqual(at('mcb', '1'));

    fireEvent.pointerDown(touchButton(), { button: 0 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useInstruments.getState().testerPicking).toBe(false);

    fireEvent.click(within(tester()).getByRole('button', { name: 'Lepas' }));
    expect(lamp()).toHaveTextContent('- - - -');
    expect(document.querySelector('[data-tester]')).toBeNull();
  });

  test('hanya satu alat dibawa pada satu waktu; terminal yang dihapus dianggap lepas', () => {
    open(load(lampRaw));
    fireEvent.click(screen.getByRole('button', { name: 'Multimeter' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Probe merah' }), { button: 0 });
    fireEvent.pointerDown(touchButton(), { button: 0 });
    fireEvent.pointerUp(touchButton());
    expect(useInstruments.getState().picking).toBeNull();
    fireEvent.pointerDown(terminal('lampu:L'), { button: 0 });
    expect(useInstruments.getState().testerAt).toEqual(at('lampu', 'L'));
    expect(useInstruments.getState().probes.red).toBeNull();

    act(() => useEditor.getState().select('lampu'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(lamp()).toHaveTextContent('- - - -');
  });
});
