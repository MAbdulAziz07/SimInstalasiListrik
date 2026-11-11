import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { App } from '../App';
import { GRID, MAX_SCALE, MIN_SCALE, useEditor } from './store';

beforeEach(() => {
  useEditor.setState(useEditor.getInitialState(), true);
});

const components = () => useEditor.getState().project.boards.installation.components;
const view = () => useEditor.getState().views.installation;

describe('palet', () => {
  test('menampilkan komponen papan Instalasi per kelompok', () => {
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    for (const group of ['Sumber', 'Proteksi', 'Penerangan']) {
      expect(within(palette).getByRole('heading', { name: group })).toBeInTheDocument();
    }
    for (const item of ['Sumber 1 fasa 230 V', 'MCB 1 kutub', 'Saklar tunggal', 'Lampu']) {
      expect(within(palette).getByRole('button', { name: item })).toBeInTheDocument();
    }
  });

  test('kelompok tanpa komponen tidak ditampilkan', () => {
    useEditor.setState({ activeBoard: 'panel' });
    render(<App />);
    expect(screen.queryByRole('heading', { name: 'Penerangan' })).not.toBeInTheDocument();
  });

  test('hanya menampilkan komponen yang boleh dipasang di papan aktif', () => {
    useEditor.setState({ activeBoard: 'panel' });
    render(<App />);
    const palette = screen.getByRole('complementary', { name: 'Palet peralatan' });
    expect(within(palette).getByRole('button', { name: 'MCB 1 kutub' })).toBeInTheDocument();
    expect(within(palette).queryByRole('button', { name: 'Lampu' })).not.toBeInTheDocument();
  });

  test('klik menaruh komponen di tengah tampilan, terkunci ke grid, dan memilihnya', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    // Area papan bawaan 800×600 → tengah di grid (20, 15); lampu berukuran 2×3.
    expect(components()).toEqual([
      { id: 'c1', type: 'lamp', position: { x: 19, y: 14 }, rotation: 0 },
    ]);
    expect(useEditor.getState().selectedId).toBe('c1');
  });
});

describe('papan', () => {
  test('menggambar komponen beserta terminalnya', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sumber 1 fasa 230 V' }));
    const board = screen.getByRole('application', { name: /papan kerja/i });
    const source = within(board).getByRole('group', { name: 'Sumber 1 fasa 230 V' });
    expect(source).toHaveAttribute('data-selected', 'true');
    for (const terminal of ['L', 'N', 'PE']) {
      expect(within(source).getByText(terminal)).toBeInTheDocument();
    }
  });

  test('menekan komponen memilihnya; menekan latar melepas pilihan', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    fireEvent.click(screen.getByRole('button', { name: 'MCB 1 kutub' }));
    const board = screen.getByRole('application', { name: /papan kerja/i });

    fireEvent.pointerDown(within(board).getByRole('group', { name: 'Lampu' }), { button: 0 });
    expect(useEditor.getState().selectedId).toBe('c1');

    const background = board.querySelector('.board-background');
    expect(background).not.toBeNull();
    fireEvent.pointerDown(background as Element, { button: 0 });
    expect(useEditor.getState().selectedId).toBeNull();
  });
});

describe('toolbar dan papan ketik', () => {
  test('Putar dan Hapus nonaktif tanpa pilihan', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Putar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
  });

  test('Putar memutar komponen terpilih 90°', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Putar' }));
    expect(components()[0]?.rotation).toBe(90);
  });

  test('tombol R memutar; Delete menghapus', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    fireEvent.keyDown(window, { key: 'r' });
    expect(components()[0]?.rotation).toBe(90);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(components()).toEqual([]);
    expect(useEditor.getState().selectedId).toBeNull();
  });

  test('Hapus menghapus komponen terpilih', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(components()).toEqual([]);
  });

  test('Escape melepas pilihan', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Lampu' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEditor.getState().selectedId).toBeNull();
    expect(components()).toHaveLength(1);
  });
});

describe('geser dan zoom', () => {
  test('zoom menjaga titik jangkar tetap di tempatnya', () => {
    const anchor = { x: 300, y: 200 };
    const gridBefore = (anchor.x - view().x) / (GRID * view().scale);
    useEditor.getState().zoomBy(2, anchor);
    expect(view().scale).toBe(2);
    expect((anchor.x - view().x) / (GRID * view().scale)).toBeCloseTo(gridBefore, 9);
  });

  test('zoom dibatasi', () => {
    for (let i = 0; i < 30; i++) useEditor.getState().zoomBy(2);
    expect(view().scale).toBe(MAX_SCALE);
    for (let i = 0; i < 30; i++) useEditor.getState().zoomBy(0.5);
    expect(view().scale).toBe(MIN_SCALE);
  });

  test('tombol zoom dan kembalikan tampilan', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Perbesar' }));
    expect(view().scale).toBeCloseTo(1.25, 9);
    expect(screen.getByRole('button', { name: '125%' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '125%' }));
    expect(view()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  test('komponen ditaruh di tengah tampilan walau papan sudah digeser dan di-zoom', () => {
    useEditor.getState().setView({ x: -200, y: 100, scale: 2 });
    useEditor.getState().addAtViewCenter('lamp');
    // tengah (400, 300) → grid ((400+200)/40, (300-100)/40) = (15, 5)
    expect(components()[0]?.position).toEqual({ x: 14, y: 4 });
  });
});

describe('pengkabelan', () => {
  const wires = () => useEditor.getState().project.boards.installation.wires;
  const palette = () => screen.getByRole('complementary', { name: 'Palet peralatan' });
  const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` });
  const press = (element: Element, init: object = {}) =>
    fireEvent.pointerDown(element, { button: 0, ...init });

  /** c1 = sumber, c2 = lampu. */
  function setup() {
    render(<App />);
    fireEvent.click(within(palette()).getByRole('button', { name: 'Sumber 1 fasa 230 V' }));
    fireEvent.click(within(palette()).getByRole('button', { name: 'Lampu' }));
  }

  function connect(from: string, to: string) {
    press(terminal(from));
    press(terminal(to));
  }

  test('klik terminal asal lalu terminal tujuan membuat kabel', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    expect(wires()).toEqual([
      {
        id: 'w1',
        from: { componentId: 'c1', terminalId: 'L' },
        to: { componentId: 'c2', terminalId: 'L' },
        color: 'brown',
        bends: [],
      },
    ]);
    expect(useEditor.getState().selectedId).toBeNull();
    expect(useEditor.getState().wiring).toBeNull();
    expect(screen.getByRole('button', { name: 'Kabel Cokelat (L1)' })).toBeInTheDocument();
  });

  test('selama menarik kabel ada petunjuk, dan terminal asal ditandai', () => {
    setup();
    press(terminal('L Sumber 1 fasa 230 V'));
    expect(screen.getByRole('status')).toHaveTextContent(/menarik kabel/i);
    expect(terminal('L Sumber 1 fasa 230 V')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Escape membatalkan kabel yang sedang ditarik', () => {
    setup();
    press(terminal('L Sumber 1 fasa 230 V'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEditor.getState().wiring).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(wires()).toEqual([]);
  });

  test('klik terminal yang sama dua kali tidak membuat kabel', () => {
    setup();
    connect('N Lampu', 'N Lampu');
    expect(wires()).toEqual([]);
    expect(useEditor.getState().wiring).toBeNull();
  });

  test('klik di papan selama menarik kabel menambah titik belok', () => {
    setup();
    press(terminal('N Sumber 1 fasa 230 V'));
    const background = document.querySelector('.board-background') as Element;
    press(background, { clientX: 104, clientY: 58 });
    press(background, { clientX: 300, clientY: 58 });
    press(terminal('N Lampu'));
    expect(wires()[0]?.bends).toEqual([
      { x: 5, y: 3 },
      { x: 15, y: 3 },
    ]);
  });

  test('warna yang dipilih dipakai kabel baru', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Biru (N)' }));
    expect(screen.getByRole('radio', { name: 'Biru (N)' })).toBeChecked();
    connect('N Sumber 1 fasa 230 V', 'N Lampu');
    expect(wires()[0]?.color).toBe('blue');
  });

  test('memilih warna setelah memasang kabel tidak mengubah kabel yang baru dipasang', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    fireEvent.click(screen.getByRole('radio', { name: 'Biru (N)' }));
    expect(wires()[0]?.color).toBe('brown');
  });

  test('memilih warna saat kabel terpilih mengganti warna kabel itu', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    press(screen.getByRole('button', { name: 'Kabel Cokelat (L1)' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Hijau-kuning (PE)' }));
    expect(wires()[0]?.color).toBe('green-yellow');
    expect(screen.getByRole('button', { name: 'Kabel Hijau-kuning (PE)' })).toBeInTheDocument();
  });

  test('kabel terpilih: Putar nonaktif, Hapus menghapus kabelnya saja', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    press(screen.getByRole('button', { name: 'Kabel Cokelat (L1)' }));
    expect(screen.getByRole('button', { name: 'Putar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(wires()).toEqual([]);
    expect(components()).toHaveLength(2);
  });

  test('menekan kabel memilihnya dan menampilkan pegangan titik belok', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    expect(document.querySelectorAll('.wire-midpoint')).toHaveLength(0);

    press(screen.getByRole('button', { name: 'Kabel Cokelat (L1)' }));
    expect(useEditor.getState().selectedId).toBe('w1');
    expect(document.querySelectorAll('.wire-midpoint')).toHaveLength(1);
  });

  test('menekan pegangan tengah menyisipkan titik belok; klik dua kali menghapusnya', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    press(screen.getByRole('button', { name: 'Kabel Cokelat (L1)' }));
    press(document.querySelector('.wire-midpoint') as Element);
    expect(wires()[0]?.bends).toHaveLength(1);
    expect(document.querySelectorAll('.wire-bend')).toHaveLength(1);
    expect(document.querySelectorAll('.wire-midpoint')).toHaveLength(2);

    fireEvent.doubleClick(document.querySelector('.wire-bend') as Element);
    expect(wires()[0]?.bends).toEqual([]);
  });

  test('kabel mengikuti komponen yang dipindah', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    const line = () => document.querySelector('[data-wire-id="w1"] .wire-line');
    const before = line()?.getAttribute('points');
    act(() => useEditor.getState().move('c2', { x: 40, y: 30 }));
    // Terminal L lampu berada di (0, 3) dari sudut kiri-atasnya.
    expect(line()?.getAttribute('points')).not.toBe(before);
    expect(line()?.getAttribute('points')).toMatch(/ 800,660$/);
  });

  test('menghapus komponen ikut menghapus kabelnya', () => {
    setup();
    connect('L Sumber 1 fasa 230 V', 'L Lampu');
    press(within(screen.getByRole('application')).getByRole('group', { name: 'Lampu' }));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(wires()).toEqual([]);
    expect(screen.queryByRole('button', { name: /^Kabel/ })).not.toBeInTheDocument();
  });
});

describe('beri tegangan', () => {
  const palette = () => screen.getByRole('complementary', { name: 'Palet peralatan' });
  const board = () => screen.getByRole('application', { name: /papan kerja/i });
  const terminal = (name: string) => screen.getByRole('button', { name: `Terminal ${name}` });
  const press = (element: Element) => fireEvent.pointerDown(element, { button: 0 });
  const add = (name: string) => fireEvent.click(within(palette()).getByRole('button', { name }));
  const connect = (from: string, to: string) => {
    press(terminal(from));
    press(terminal(to));
  };
  const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
  const lamp = (id: string) => document.querySelector(`[data-component-id="${id}"]`) as HTMLElement;
  const wireLive = (id: string) =>
    document.querySelector(`[data-wire-id="${id}"]`)?.getAttribute('data-live');

  /** c1 sumber → c2 MCB → c3 saklar → c4 lampu; kabel w1–w3 fasa, w4 netral. */
  function buildLampCircuit() {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('MCB 1 kutub');
    add('Saklar tunggal');
    add('Lampu');
    connect('L Sumber 1 fasa 230 V', '1 MCB 1 kutub');
    connect('2 MCB 1 kutub', 'L Saklar tunggal');
    connect('1 Saklar tunggal', 'L Lampu');
    connect('N Lampu', 'N Sumber 1 fasa 230 V');
  }

  test('lampu padam saat saklar terbuka dan menyala setelah saklar diklik', () => {
    buildLampCircuit();
    energize();
    expect(screen.getByRole('button', { name: 'Matikan' })).toHaveAttribute('aria-pressed', 'true');
    expect(lamp('c4')).toHaveAttribute('data-lamp', 'padam');

    const saklar = within(board()).getByRole('switch', { name: 'Saklar tunggal' });
    expect(saklar).not.toBeChecked();
    press(saklar);
    expect(within(board()).getByRole('switch', { name: 'Saklar tunggal' })).toBeChecked();
    expect(lamp('c4')).toHaveAttribute('data-lamp', 'menyala');
    expect(within(board()).getByRole('group', { name: 'Lampu, menyala' })).toBeInTheDocument();
  });

  test('menurunkan tuas MCB memadamkan lampu', () => {
    buildLampCircuit();
    energize();
    press(within(board()).getByRole('switch', { name: 'Saklar tunggal' }));
    const mcb = within(board()).getByRole('switch', { name: 'MCB 1 kutub' });
    expect(mcb).toBeChecked();
    press(mcb);
    expect(lamp('c4')).toHaveAttribute('data-lamp', 'padam');
    expect(within(lamp('c2')).getByText('OFF')).toBeInTheDocument();
  });

  test('saklar bisa dioperasikan dengan papan ketik', () => {
    buildLampCircuit();
    energize();
    fireEvent.keyDown(within(board()).getByRole('switch', { name: 'Saklar tunggal' }), {
      key: 'Enter',
    });
    expect(lamp('c4')).toHaveAttribute('data-lamp', 'menyala');
  });

  test('kabel bertegangan ditandai; netral dan kabel setelah saklar terbuka tidak', () => {
    buildLampCircuit();
    energize();
    expect([wireLive('w1'), wireLive('w2'), wireLive('w3'), wireLive('w4')]).toEqual([
      'true',
      'true',
      'false',
      'false',
    ]);
    press(within(board()).getByRole('switch', { name: 'Saklar tunggal' }));
    expect(wireLive('w3')).toBe('true');
    expect(wireLive('w4')).toBe('false');
    expect(screen.getAllByRole('button', { name: 'Kabel Cokelat (L1), bertegangan' })).toHaveLength(
      3,
    );
  });

  test('dua lampu seri menyala redup', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('Lampu');
    add('Lampu');
    act(() => {
      const { clickTerminal } = useEditor.getState();
      const wire = (a: [string, string], b: [string, string]) => {
        clickTerminal({ componentId: a[0], terminalId: a[1] });
        clickTerminal({ componentId: b[0], terminalId: b[1] });
      };
      wire(['c1', 'L'], ['c2', 'L']);
      wire(['c2', 'N'], ['c3', 'L']);
      wire(['c3', 'N'], ['c1', 'N']);
    });
    energize();
    expect(lamp('c2')).toHaveAttribute('data-lamp', 'redup');
    expect(lamp('c3')).toHaveAttribute('data-lamp', 'redup');
  });

  test('papan tidak bisa diubah selama bertegangan', () => {
    buildLampCircuit();
    energize();
    const before = useEditor.getState().project;

    expect(within(palette()).getByRole('button', { name: 'Lampu' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Putar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Biru (N)' })).toBeDisabled();

    press(lamp('c4'));
    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.keyDown(window, { key: 'r' });
    connect('PE Sumber 1 fasa 230 V', 'N Lampu');
    press(document.querySelector('[data-wire-id="w1"]') as Element);
    act(() => {
      const s = useEditor.getState();
      s.addAtViewCenter('lamp');
      s.move('c4', { x: 1, y: 1 });
      s.insertBend('w1', 0, { x: 1, y: 1 });
      s.startPlacing('lamp');
    });

    const after = useEditor.getState();
    expect(after.project).toBe(before);
    expect(after.selectedId).toBeNull();
    expect(after.wiring).toBeNull();
    expect(after.placing).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/bertegangan/i);
  });

  test('Matikan membuka kunci papan dan memadamkan lampu; posisi saklar diingat', () => {
    buildLampCircuit();
    energize();
    press(within(board()).getByRole('switch', { name: 'Saklar tunggal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));

    expect(lamp('c4')).not.toHaveAttribute('data-lamp');
    expect(wireLive('w1')).toBe('false');
    expect(within(palette()).getByRole('button', { name: 'Lampu' })).toBeEnabled();
    expect(within(lamp('c3')).getByText('ON')).toBeInTheDocument();

    energize();
    expect(lamp('c4')).toHaveAttribute('data-lamp', 'menyala');
  });

  test('papan kosong bisa diberi tegangan', () => {
    render(<App />);
    energize();
    expect(screen.getByRole('button', { name: 'Matikan' })).toBeInTheDocument();
  });

  test('keadaan komponen yang sudah dihapus dibuang saat diberi tegangan lagi', () => {
    buildLampCircuit();
    energize();
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));
    press(lamp('c3'));
    fireEvent.keyDown(window, { key: 'Delete' });
    energize();
    expect(Object.keys(useEditor.getState().simStates).sort()).toEqual(['c1', 'c2', 'c4']);
  });
});

describe('gangguan dan saklar penerangan lain', () => {
  const palette = () => screen.getByRole('complementary', { name: 'Palet peralatan' });
  const board = () => screen.getByRole('application', { name: /papan kerja/i });
  const add = (name: string) => fireEvent.click(within(palette()).getByRole('button', { name }));
  const press = (element: Element) => fireEvent.pointerDown(element, { button: 0 });
  const energize = () => fireEvent.click(screen.getByRole('button', { name: 'Beri tegangan' }));
  const lampState = (id: string) =>
    document.querySelector(`[data-component-id="${id}"]`)?.getAttribute('data-lamp');
  function wire(a: [string, string], b: [string, string]) {
    act(() => {
      const { clickTerminal } = useEditor.getState();
      clickTerminal({ componentId: a[0], terminalId: a[1] });
      clickTerminal({ componentId: b[0], terminalId: b[1] });
    });
  }

  test('palet memuat saklar seri, saklar tukar, dan stop kontak', () => {
    render(<App />);
    for (const item of ['Saklar seri', 'Saklar tukar', 'Stop kontak']) {
      expect(within(palette()).getByRole('button', { name: item })).toBeInTheDocument();
    }
  });

  test('hubung singkat: MCB trip, pesan muncul, dan bisa ditutup', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('MCB 1 kutub');
    wire(['c1', 'L'], ['c2', '1']);
    wire(['c2', '2'], ['c1', 'N']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    energize();
    expect(screen.getByRole('alert')).toHaveTextContent(/MCB trip karena hubung singkat/);
    expect(within(board()).getByText('TRIP')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Menaikkan tuas selagi gangguan masih ada: trip lagi dan pesan muncul lagi.
    press(within(board()).getByRole('switch', { name: 'MCB 1 kutub' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/MCB trip/);
    expect(within(board()).getByText('TRIP')).toBeInTheDocument();
  });

  test('setelah gangguan dilepas MCB bisa dinaikkan lagi', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('MCB 1 kutub');
    wire(['c1', 'L'], ['c2', '1']);
    wire(['c2', '2'], ['c1', 'N']);
    energize();
    fireEvent.click(screen.getByRole('button', { name: 'Matikan' }));

    press(document.querySelector('[data-wire-id="w2"]') as Element);
    fireEvent.keyDown(window, { key: 'Delete' });
    energize();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(board()).getByText('TRIP')).toBeInTheDocument();

    press(within(board()).getByRole('switch', { name: 'MCB 1 kutub' }));
    expect(within(board()).getByRole('switch', { name: 'MCB 1 kutub' })).toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('hubung singkat tanpa MCB memunculkan peringatan', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    wire(['c1', 'L'], ['c1', 'N']);
    energize();
    expect(screen.getByRole('alert')).toHaveTextContent(/hubung singkat tanpa pengaman/i);
  });

  test('gangguan yang masih ada menggantikan pesan lama saat saklar dioperasikan', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('Saklar tunggal');
    wire(['c1', 'L'], ['c1', 'N']);
    energize();
    act(() => useEditor.setState({ notice: 'pesan lama' }));
    // Rangkaian tetap terhubung singkat, jadi pesan baru menggantikan pesan lama.
    press(within(board()).getByRole('switch', { name: 'Saklar tunggal' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/tanpa pengaman/i);
  });

  test('saklar seri mengendalikan dua lampu secara terpisah', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('Saklar seri');
    add('Lampu');
    add('Lampu');
    wire(['c1', 'L'], ['c2', 'L']);
    wire(['c2', '1'], ['c3', 'L']);
    wire(['c2', '2'], ['c4', 'L']);
    wire(['c3', 'N'], ['c1', 'N']);
    wire(['c4', 'N'], ['c1', 'N']);
    energize();
    expect([lampState('c3'), lampState('c4')]).toEqual(['padam', 'padam']);

    press(within(board()).getByRole('switch', { name: 'Saklar seri, tuas 2' }));
    expect([lampState('c3'), lampState('c4')]).toEqual(['padam', 'menyala']);

    fireEvent.keyDown(within(board()).getByRole('switch', { name: 'Saklar seri, tuas 1' }), {
      key: ' ',
    });
    expect([lampState('c3'), lampState('c4')]).toEqual(['menyala', 'menyala']);
    expect(within(board()).getByRole('switch', { name: 'Saklar seri, tuas 1' })).toBeChecked();
  });

  test('dua saklar tukar mengendalikan satu lampu dari dua tempat', () => {
    render(<App />);
    add('Sumber 1 fasa 230 V');
    add('Saklar tukar');
    add('Saklar tukar');
    add('Lampu');
    wire(['c1', 'L'], ['c2', 'C']);
    wire(['c2', '1'], ['c3', '1']);
    wire(['c2', '2'], ['c3', '2']);
    wire(['c3', 'C'], ['c4', 'L']);
    wire(['c4', 'N'], ['c1', 'N']);
    energize();
    expect(lampState('c4')).toBe('menyala');

    const first = () => document.querySelector('[data-component-id="c2"]') as Element;
    const second = () => document.querySelector('[data-component-id="c3"]') as Element;
    press(first());
    expect(lampState('c4')).toBe('padam');
    expect(first()).toHaveAttribute('aria-label', 'Saklar tukar, pos 2');
    press(second());
    expect(lampState('c4')).toBe('menyala');
    fireEvent.keyDown(first(), { key: 'Enter' });
    expect(lampState('c4')).toBe('padam');
  });
});
