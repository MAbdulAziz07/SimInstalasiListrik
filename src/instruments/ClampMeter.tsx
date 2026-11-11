import { catalog } from '../core/catalog';
import { findComponent, findWire } from '../core/edit';
import { terminalName } from '../core/geometry';
import type { Project, TerminalRef } from '../core/types';
import { BOARD_LABELS } from '../editor/BoardTabs';
import { GRID, useEditor } from '../editor/store';
import { segmentMidpoints, WIRE_COLOR_INFO, wirePoints } from '../editor/wiring';
import { clampText, readClamp, wireExists } from './clampReading';
import { useInstruments } from './store';
import { usePicking, wireAt } from './usePicking';

function endName(project: Project, ref: TerminalRef): string {
  const found = findComponent(project, ref.componentId);
  if (!found) return ref.terminalId;
  return `${catalog[found.component.type].shortLabel} ${terminalName(found.component, ref.terminalId)}`;
}

/** Keterangan kabel yang dijepit: warna, kedua ujung, dan papannya. */
function clampPlace(project: Project, wireId: string | null): string | null {
  if (!wireExists(project, wireId)) return null;
  const found = findWire(project, wireId);
  if (!found) return null;
  const { wire, boardId } = found;
  return (
    `Kabel ${WIRE_COLOR_INFO[wire.color].label}: ${endName(project, wire.from)} → ` +
    `${endName(project, wire.to)} (${BOARD_LABELS[boardId]})`
  );
}

/** Tang ampere: dijepitkan ke satu kabel dan menampilkan arusnya. */
export function ClampMeter() {
  const open = useInstruments((s) => s.clampOpen);
  const wireId = useInstruments((s) => s.clampWire);
  const picking = useInstruments((s) => s.clampPicking);
  const project = useEditor((s) => s.project);
  const sim = useEditor((s) => s.sim);
  const { startClampPicking, cancelClampPicking, clampOn, unclamp, toggleClamp } =
    useInstruments.getState();

  usePicking({
    active: picking,
    bodyClass: 'clamping',
    find: wireAt,
    pick: clampOn,
    cancel: cancelClampPicking,
    origin: () => useInstruments.getState().clampOrigin,
  });

  if (!open) return null;
  const reading = readClamp({ wireId, project, sim });
  const place = clampPlace(project, wireId);
  let note = place ?? 'Jepitkan tang ke satu kabel.';
  if (picking) note = 'Klik kabel yang akan dijepit (Esc untuk batal).';

  return (
    <section className="meter clamp" aria-label="Tang ampere">
      <header className="meter-header">
        <h2>Tang ampere</h2>
        <button type="button" className="meter-close" onClick={toggleClamp}>
          Simpan
        </button>
      </header>
      <output className="meter-display" aria-label="Layar tang ampere">
        {clampText(reading)}
      </output>
      <p className="meter-note">{note}</p>
      <div className="meter-actions">
        <button
          type="button"
          className={picking ? 'meter-probe clamp picking' : 'meter-probe clamp'}
          aria-pressed={picking}
          // Tahan dan seret ke kabel, atau klik lalu klik kabelnya.
          onPointerDown={(e) => {
            if (e.button === 0) startClampPicking({ x: e.clientX, y: e.clientY });
          }}
          onClick={(e) => {
            if (e.detail === 0) startClampPicking();
          }}
        >
          Jepit ke kabel
        </button>
        {place && (
          <button type="button" className="meter-detach" onClick={unclamp}>
            Lepas
          </button>
        )}
      </div>
    </section>
  );
}

/** Rahang tang ampere yang digambar pada kabel yang dijepit, di papan yang sedang dibuka. */
export function ClampLayer() {
  const open = useInstruments((s) => s.clampOpen);
  const wireId = useInstruments((s) => s.clampWire);
  const project = useEditor((s) => s.project);
  const activeBoard = useEditor((s) => s.activeBoard);
  if (!open || !wireExists(project, wireId)) return null;
  const found = findWire(project, wireId);
  if (!found || found.boardId !== activeBoard) return null;

  const byId = new Map(project.boards[activeBoard].components.map((c) => [c.id, c]));
  const points = wirePoints(found.wire, byId);
  if (!points) return null;
  // Rahang dipasang di tengah ruas terpanjang agar tidak menutupi terminal.
  let best = { x: 0, y: 0 };
  let longest = -1;
  segmentMidpoints(points).forEach((mid, index) => {
    const a = points[index];
    const b = points[index + 1];
    const length = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
    if (length > longest) {
      longest = length;
      best = mid;
    }
  });

  return (
    <g
      className="clamp-jaw"
      data-clamp={wireId}
      transform={`translate(${best.x * GRID} ${best.y * GRID})`}
    >
      <circle className="clamp-ring" r={11} />
      <circle className="clamp-core" r={3} />
    </g>
  );
}
