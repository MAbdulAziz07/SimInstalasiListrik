import { catalog } from '../core/catalog';
import { findComponent } from '../core/edit';
import { terminalName, terminalPosition } from '../core/geometry';
import type { Project, TerminalRef } from '../core/types';
import { BOARD_LABELS } from '../editor/BoardTabs';
import { GRID, useEditor } from '../editor/store';
import { terminalExists } from './meterReading';
import { useInstruments } from './store';
import { readTester, testerText } from './testerReading';
import { terminalAt, usePicking } from './usePicking';

/** Panjang batang tespen yang digambar di papan (piksel pada zoom 100%). */
const SHAFT = 30;

function testerPlace(project: Project, ref: TerminalRef | null): string | null {
  if (!terminalExists(project, ref)) return null;
  const found = findComponent(project, ref.componentId);
  if (!found) return null;
  const name = terminalName(found.component, ref.terminalId);
  return `${name} · ${catalog[found.component.type].label} (${BOARD_LABELS[found.boardId]})`;
}

/** Tespen: disentuhkan ke satu terminal; menyala di terminal fasa yang bertegangan. */
export function Tester() {
  const open = useInstruments((s) => s.testerOpen);
  const at = useInstruments((s) => s.testerAt);
  const picking = useInstruments((s) => s.testerPicking);
  const project = useEditor((s) => s.project);
  const sim = useEditor((s) => s.sim);
  const { startTesterPicking, cancelTesterPicking, touchTester, liftTester, toggleTester } =
    useInstruments.getState();

  usePicking({
    active: picking,
    bodyClass: 'probing',
    find: terminalAt,
    pick: touchTester,
    cancel: cancelTesterPicking,
    origin: () => useInstruments.getState().testerOrigin,
  });

  if (!open) return null;
  const reading = readTester({ at, project, sim });
  const place = testerPlace(project, at);
  let note = place ?? 'Sentuhkan tespen ke satu terminal.';
  if (picking) note = 'Klik terminal yang akan disentuh (Esc untuk batal).';

  return (
    <section className="meter tester" aria-label="Tespen">
      <header className="meter-header">
        <h2>Tespen</h2>
        <button type="button" className="meter-close" onClick={toggleTester}>
          Simpan
        </button>
      </header>
      <output
        className={reading === 'lit' ? 'meter-display tester-lit' : 'meter-display'}
        aria-label="Lampu tespen"
      >
        {testerText(reading)}
      </output>
      <p className="meter-note">{note}</p>
      <div className="meter-actions">
        <button
          type="button"
          className={picking ? 'meter-probe tester picking' : 'meter-probe tester'}
          aria-pressed={picking}
          // Tahan dan seret ke terminal, atau klik lalu klik terminalnya.
          onPointerDown={(e) => {
            if (e.button === 0) startTesterPicking({ x: e.clientX, y: e.clientY });
          }}
          onClick={(e) => {
            if (e.detail === 0) startTesterPicking();
          }}
        >
          Sentuhkan ke terminal
        </button>
        {place && (
          <button type="button" className="meter-detach" onClick={liftTester}>
            Lepas
          </button>
        )}
      </div>
    </section>
  );
}

/** Tespen yang digambar pada terminal yang disentuhnya, di papan yang sedang dibuka. */
export function TesterLayer() {
  const open = useInstruments((s) => s.testerOpen);
  const at = useInstruments((s) => s.testerAt);
  const project = useEditor((s) => s.project);
  const sim = useEditor((s) => s.sim);
  const activeBoard = useEditor((s) => s.activeBoard);
  if (!open || !terminalExists(project, at)) return null;
  const found = findComponent(project, at.componentId);
  if (!found || found.boardId !== activeBoard) return null;
  const point = terminalPosition(found.component, at.terminalId);
  const lit = readTester({ at, project, sim }) === 'lit';

  return (
    <g
      className={lit ? 'tester-mark lit' : 'tester-mark'}
      data-tester={`${at.componentId}:${at.terminalId}`}
      data-lit={lit}
      transform={`translate(${point.x * GRID} ${point.y * GRID})`}
    >
      <line className="tester-shaft" x1={0} y1={0} x2={0} y2={-SHAFT} />
      <rect className="tester-handle" x={-5} y={-SHAFT - 26} width={10} height={26} rx={3} />
      <circle className="tester-lamp" cx={0} cy={-SHAFT - 13} r={3.5} />
    </g>
  );
}
