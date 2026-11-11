import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import dolRaw from '../../tests/fixtures/dol.json?raw';
import { App } from '../App';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { useEditor } from './store';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
const motor = () => document.querySelector('[data-component-id="m1"]') as HTMLElement;
const rotor = () => motor().querySelector('.motor-rotor') as Element;

/** Menekan lalu melepas push button di papan Dalam Panel, lalu kembali ke papan Instalasi. */
function push(name: string) {
  tab('Dalam Panel');
  const board = screen.getByRole('application', { name: 'Papan kerja Dalam Panel' });
  fireEvent.pointerDown(within(board).getByRole('button', { name }), { button: 0 });
  fireEvent.pointerUp(board);
  tab('Instalasi');
}

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
});

describe('motor di papan', () => {
  test('palet Instalasi memuat motor di kelompok Beban', () => {
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(within(palette).getByRole('heading', { name: 'Beban' })).toBeInTheDocument();
    fireEvent.click(within(palette).getByRole('button', { name: 'Motor 3 fasa' }));
    expect(screen.getByRole('group', { name: 'Motor 3 fasa' })).toHaveAttribute(
      'data-state',
      'BERHENTI',
    );
    for (const terminal of ['U1', 'V1', 'W1', 'U2', 'V2', 'W2']) {
      expect(
        screen.getByRole('button', { name: `Terminal ${terminal} Motor 3 fasa` }),
      ).toBeInTheDocument();
    }
  });

  test('DOL: START memutar motor ke kanan, STOP menghentikannya', () => {
    useEditor.setState({ project: load(dolRaw) });
    render(<App />);
    energize();
    expect(motor()).toHaveAttribute('data-state', 'BERHENTI');
    expect(rotor()).not.toHaveClass('spin-cw');

    push('Push button NO');
    expect(motor()).toHaveAttribute('data-state', 'PUTAR KANAN');
    expect(motor()).toHaveAttribute('aria-label', 'Motor 3 fasa, putar kanan');
    expect(rotor()).toHaveClass('spin-cw');

    push('Push button NC');
    expect(motor()).toHaveAttribute('data-state', 'BERHENTI');
    expect(rotor()).not.toHaveClass('spin-cw');
  });

  test('dua fasa tertukar: motor berputar ke kiri', () => {
    const project = load(dolRaw);
    for (const wire of project.boards.installation.wires) {
      if (wire.id === 'i5') wire.to = { componentId: 'm1', terminalId: 'V1' };
      else if (wire.id === 'i6') wire.to = { componentId: 'm1', terminalId: 'U1' };
    }
    useEditor.setState({ project });
    render(<App />);
    energize();
    push('Push button NO');
    expect(motor()).toHaveAttribute('data-state', 'PUTAR KIRI');
    expect(rotor()).toHaveClass('spin-ccw');
  });

  test('satu fasa lepas: motor mendengung', () => {
    const project = load(dolRaw);
    project.boards.installation.wires = project.boards.installation.wires.filter(
      (w) => w.id !== 'i7',
    );
    useEditor.setState({ project });
    render(<App />);
    energize();
    push('Push button NO');
    expect(motor()).toHaveAttribute('data-state', 'MENDENGUNG');
    expect(rotor()).toHaveClass('hum');
  });

  test('mematikan tegangan menghentikan motor', () => {
    useEditor.setState({ project: load(dolRaw) });
    render(<App />);
    energize();
    push('Push button NO');
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    expect(motor()).toHaveAttribute('data-state', 'BERHENTI');
  });
});
