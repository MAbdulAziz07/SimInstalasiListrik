import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import { catalog } from '../core/catalog';
import { terminalPosition } from '../core/geometry';
import type { PlacedComponent, Point, TerminalRef, Wire } from '../core/types';
import { BoardComponent, TerminalGroup, type BoardHandlers } from './BoardParts';
import { ComponentView } from './ComponentView';
import { isLampType, isWireLive, lampBrightness, stateFor } from './simView';
import { GRID, useEditor } from './store';
import { WireLayer, WireStroke } from './WireLayer';

type Drag =
  | { kind: 'pan'; startX: number; startY: number; viewX: number; viewY: number }
  /** `grab`: selisih antara titik pegang dan sudut kiri-atas komponen, dalam grid. */
  | { kind: 'move'; id: string; grab: Point }
  | { kind: 'bend'; wireId: string; index: number };

const ZOOM_STEP = 1.1;

interface BoardProps {
  /** Gambar tambahan di atas papan dalam koordinat papan, mis. probe alat ukur. */
  overlay?: ReactNode;
}

export function Board({ overlay }: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  /** Push button yang sedang ditahan dengan penunjuk. */
  const held = useRef<string | null>(null);
  /** Posisi penunjuk dalam grid; dipakai bayangan komponen dan kabel yang sedang ditarik. */
  const [pointer, setPointer] = useState<Point | null>(null);

  const board = useEditor((s) => s.project.boards[s.activeBoard]);
  const view = useEditor((s) => s.views[s.activeBoard]);
  const selectedId = useEditor((s) => s.selectedId);
  const placing = useEditor((s) => s.placing);
  const wiring = useEditor((s) => s.wiring);
  const wireColor = useEditor((s) => s.wireColor);
  const sim = useEditor((s) => s.sim);
  const simStates = useEditor((s) => s.simStates);
  const activeBoard = useEditor((s) => s.activeBoard);
  const hasPanel = useEditor((s) =>
    s.project.boards.installation.components.some((c) => c.type === 'panel'),
  );
  const actions = useEditor.getState();

  const componentsById = useMemo(
    () => new Map(board.components.map((c) => [c.id, c])),
    [board.components],
  );

  const liveIds = useMemo(
    () => new Set(sim ? board.wires.filter((w) => isWireLive(sim, w)).map((w) => w.id) : []),
    [sim, board.wires],
  );

  /** Posisi penunjuk relatif ke area papan (piksel). */
  function toLocal(clientX: number, clientY: number): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }

  function toGrid(clientX: number, clientY: number): Point {
    const local = toLocal(clientX, clientY);
    const state = useEditor.getState();
    const { x, y, scale } = state.views[state.activeBoard];
    return { x: (local.x - x) / (GRID * scale), y: (local.y - y) / (GRID * scale) };
  }

  function isInside(clientX: number, clientY: number): boolean {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );
  }

  // Laporkan ukuran area papan agar komponen dari klik palet jatuh di tengah tampilan.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const { setViewport } = useEditor.getState();
    const observer = new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect();
      setViewport(rect.width, rect.height);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Selama menyeret dari palet, ikuti penunjuk di seluruh jendela.
  useEffect(() => {
    if (!placing) return;
    const { addAt, stopPlacing } = useEditor.getState();
    const onMove = (e: globalThis.PointerEvent) => {
      setPointer(isInside(e.clientX, e.clientY) ? toGrid(e.clientX, e.clientY) : null);
    };
    const onUp = (e: globalThis.PointerEvent) => {
      if (isInside(e.clientX, e.clientY)) addAt(placing, toGrid(e.clientX, e.clientY));
      setPointer(null);
      stopPlacing();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // toGrid dan isInside hanya membaca ref dan store, jadi aman tanpa didaftarkan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing]);

  function capture(e: PointerEvent) {
    svgRef.current?.setPointerCapture?.(e.pointerId);
  }

  function onBackgroundPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1) return;
    if (wiring && e.button === 0) {
      // Selama menarik kabel, klik di papan menambah titik belok.
      actions.addWiringBend(toGrid(e.clientX, e.clientY));
      return;
    }
    actions.select(null);
    drag.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };
    capture(e);
  }

  function onComponentPointerDown(e: PointerEvent, component: PlacedComponent) {
    if (e.button !== 0 || wiring) return;
    e.stopPropagation();
    if (sim) {
      // Saat bertegangan komponen tidak bisa dipindah; saklar, MCB, dan tombol dioperasikan.
      const state = sim.states[component.id];
      if (state?.kind !== 'pushButton') {
        actions.operate(component.id);
      } else if (e.shiftKey) {
        // Shift+klik menahan tombol, agar dua tombol bisa ditekan bersamaan.
        actions.setPressed(component.id, !state.pressed);
      } else {
        actions.setPressed(component.id, true);
        held.current = component.id;
        capture(e);
      }
      return;
    }
    actions.select(component.id);
    actions.beginDrag();
    const at = toGrid(e.clientX, e.clientY);
    drag.current = {
      kind: 'move',
      id: component.id,
      grab: { x: at.x - component.position.x, y: at.y - component.position.y },
    };
    capture(e);
  }

  function onTerminalPointerDown(e: PointerEvent, ref: TerminalRef) {
    if (e.button !== 0 || sim) return;
    e.stopPropagation();
    setPointer(toGrid(e.clientX, e.clientY));
    actions.clickTerminal(ref);
  }

  function onWirePointerDown(e: PointerEvent, wire: Wire) {
    if (e.button !== 0 || wiring) return;
    e.stopPropagation();
    actions.select(wire.id);
  }

  function onBendPointerDown(e: PointerEvent, wire: Wire, index: number) {
    if (e.button !== 0 || sim) return;
    e.stopPropagation();
    actions.beginDrag();
    drag.current = { kind: 'bend', wireId: wire.id, index };
    capture(e);
  }

  function onMidpointPointerDown(e: PointerEvent, wire: Wire, index: number, at: Point) {
    if (e.button !== 0 || sim) return;
    e.stopPropagation();
    actions.beginDrag();
    actions.insertBend(wire.id, index, at);
    drag.current = { kind: 'bend', wireId: wire.id, index };
    capture(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (wiring) setPointer(toGrid(e.clientX, e.clientY));
    const current = drag.current;
    if (!current) return;
    if (current.kind === 'pan') {
      actions.setView({
        ...view,
        x: current.viewX + e.clientX - current.startX,
        y: current.viewY + e.clientY - current.startY,
      });
      return;
    }
    const at = toGrid(e.clientX, e.clientY);
    if (current.kind === 'move') {
      actions.move(current.id, { x: at.x - current.grab.x, y: at.y - current.grab.y });
    } else {
      actions.moveBend(current.wireId, current.index, at);
    }
  }

  function onPointerUp(e: PointerEvent) {
    // Seluruh seretan komponen atau titik belok menjadi satu langkah riwayat.
    actions.endDrag();
    drag.current = null;
    if (held.current) {
      actions.setPressed(held.current, false);
      held.current = null;
    }
    svgRef.current?.releasePointerCapture?.(e.pointerId);
  }

  function onWheel(e: WheelEvent) {
    actions.zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, toLocal(e.clientX, e.clientY));
  }

  const cell = GRID * view.scale;
  const ghost: PlacedComponent | null =
    placing && pointer
      ? {
          id: 'ghost',
          type: placing,
          position: {
            x: Math.round(pointer.x - catalog[placing].size.w / 2),
            y: Math.round(pointer.y - catalog[placing].size.h / 2),
          },
          rotation: 0,
        }
      : null;

  const wiringStart = wiring ? componentsById.get(wiring.from.componentId) : undefined;
  const pendingPoints =
    wiring && wiringStart
      ? [
          terminalPosition(wiringStart, wiring.from.terminalId),
          ...wiring.bends,
          ...(pointer ? [pointer] : []),
        ]
      : null;

  // Penangan terbaru disimpan di ref; `handlers` yang diteruskan ke bagian papan tetap sama
  // identitasnya, sehingga menyeret satu komponen tidak menggambar ulang komponen lain.
  const latest = useRef<BoardHandlers | null>(null);
  latest.current = {
    componentDown: onComponentPointerDown,
    select: (id) => {
      if (!useEditor.getState().wiring) actions.select(id);
    },
    operate: (id, part) => actions.operate(id, part),
    press: (id) => actions.setPressed(id, true),
    release: (id) => {
      // Tombol yang sedang ditahan penunjuk dilepas saat penunjuk diangkat.
      if (held.current !== id) actions.setPressed(id, false);
    },
    openPanel: () => actions.setActiveBoard('panel'),
    terminalDown: onTerminalPointerDown,
    terminalActivate: (ref) => actions.clickTerminal(ref),
    wireDown: onWirePointerDown,
    bendDown: onBendPointerDown,
    midpointDown: onMidpointPointerDown,
    bendDoubleClick: (wire, index) => actions.removeBend(wire.id, index),
  };
  const handlers = useMemo<BoardHandlers>(
    () => ({
      componentDown: (e, component) => latest.current?.componentDown(e, component),
      select: (id) => latest.current?.select(id),
      operate: (id, part) => latest.current?.operate(id, part),
      press: (id) => latest.current?.press(id),
      release: (id) => latest.current?.release(id),
      openPanel: () => latest.current?.openPanel(),
      terminalDown: (e, ref) => latest.current?.terminalDown(e, ref),
      terminalActivate: (ref) => latest.current?.terminalActivate(ref),
      wireDown: (e, wire) => latest.current?.wireDown(e, wire),
      bendDown: (e, wire, index) => latest.current?.bendDown(e, wire, index),
      midpointDown: (e, wire, index, at) => latest.current?.midpointDown(e, wire, index, at),
      bendDoubleClick: (wire, index) => latest.current?.bendDoubleClick(wire, index),
    }),
    [],
  );

  const classes = ['board'];
  if (placing) classes.push('placing');
  if (wiring) classes.push('wiring');
  if (sim) classes.push('energized');

  return (
    <svg
      ref={svgRef}
      className={classes.join(' ')}
      role="application"
      aria-label={activeBoard === 'panel' ? 'Papan kerja Dalam Panel' : 'Papan kerja Instalasi'}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <defs>
        <pattern
          id="board-grid"
          width={cell}
          height={cell}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${view.x} ${view.y})`}
        >
          <circle className="grid-dot" cx={0} cy={0} r={1.2} />
          <circle className="grid-dot" cx={cell} cy={0} r={1.2} />
          <circle className="grid-dot" cx={0} cy={cell} r={1.2} />
          <circle className="grid-dot" cx={cell} cy={cell} r={1.2} />
        </pattern>
      </defs>
      <rect
        className="board-background"
        width="100%"
        height="100%"
        fill="url(#board-grid)"
        onPointerDown={onBackgroundPointerDown}
      />
      {activeBoard === 'panel' && !hasPanel && (
        <text className="board-hint" x={16} y={28}>
          Belum ada panel listrik. Pasang Panel listrik di papan Instalasi agar terminal blok X1
          muncul di sini.
        </text>
      )}
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {board.components.map((component) => (
          <BoardComponent
            key={component.id}
            component={component}
            selected={component.id === selectedId}
            state={stateFor(component, simStates)}
            brightness={
              sim && isLampType(component.type) ? lampBrightness(sim, component) : undefined
            }
            energized={sim !== null}
            handlers={handlers}
          />
        ))}

        <WireLayer
          wires={board.wires}
          componentsById={componentsById}
          selectedId={selectedId}
          liveIds={liveIds}
          handlers={handlers}
        />

        {pendingPoints && (
          <g className="wire pending">
            <WireStroke points={pendingPoints} color={wireColor} />
          </g>
        )}

        {/* Terminal digambar paling atas agar selalu bisa diklik walau tertutup kabel. */}
        <g className="terminals">
          {board.components.map((component) => (
            <TerminalGroup
              key={component.id}
              component={component}
              activeTerminal={
                wiring?.from.componentId === component.id ? wiring.from.terminalId : null
              }
              handlers={handlers}
            />
          ))}
        </g>

        {overlay}

        {ghost && <ComponentView component={ghost} ghost />}
      </g>
    </svg>
  );
}
