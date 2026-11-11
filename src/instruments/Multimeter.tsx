import { catalog } from '../core/catalog';
import { findComponent } from '../core/edit';
import { terminalName } from '../core/geometry';
import type { Project, TerminalRef } from '../core/types';
import { BOARD_LABELS } from '../editor/BoardTabs';
import { useEditor } from '../editor/store';
import {
  displayNote,
  displayText,
  measure,
  PROBE_LABELS,
  PROBES,
  terminalExists,
  type MeterMode,
} from './meterReading';
import { useInstruments } from './store';
import { terminalAt, usePicking } from './usePicking';

const MODES: readonly { id: MeterMode; label: string }[] = [
  { id: 'vac', label: 'V AC' },
  { id: 'ohm', label: 'Kontinuitas/Ω' },
];

/** Nama terminal tempat probe menempel, beserta komponen dan papannya. */
function probePlace(project: Project, ref: TerminalRef | null): string | null {
  if (!terminalExists(project, ref)) return null;
  const found = findComponent(project, ref.componentId);
  if (!found) return null;
  const name = terminalName(found.component, ref.terminalId);
  return `${name} · ${catalog[found.component.type].label} (${BOARD_LABELS[found.boardId]})`;
}

/** Multimeter: dua probe yang ditempelkan ke terminal, mode V AC dan kontinuitas/Ω. */
export function Multimeter() {
  const open = useInstruments((s) => s.meterOpen);
  const mode = useInstruments((s) => s.mode);
  const probes = useInstruments((s) => s.probes);
  const picking = useInstruments((s) => s.picking);
  const project = useEditor((s) => s.project);
  const sim = useEditor((s) => s.sim);
  const states = useEditor((s) => s.simStates);
  const { setMode, startPicking, cancelPicking, attach, detach, toggleMeter } =
    useInstruments.getState();

  usePicking({
    active: picking !== null,
    bodyClass: 'probing',
    find: terminalAt,
    pick: attach,
    cancel: cancelPicking,
    origin: () => useInstruments.getState().pickOrigin,
  });

  if (!open) return null;
  const reading = measure({ mode, red: probes.red, black: probes.black, project, sim, states });
  const note = picking
    ? `Klik terminal untuk menempelkan ${PROBE_LABELS[picking].toLowerCase()} (Esc untuk batal).`
    : displayNote(reading);

  return (
    <section className="meter" aria-label="Multimeter">
      <header className="meter-header">
        <h2>Multimeter</h2>
        <button type="button" className="meter-close" onClick={toggleMeter}>
          Simpan
        </button>
      </header>
      <output
        className={reading.kind === 'warning' ? 'meter-display warning' : 'meter-display'}
        aria-label="Layar multimeter"
      >
        {displayText(reading)}
      </output>
      <p className="meter-note" role={reading.kind === 'warning' && !picking ? 'alert' : undefined}>
        {note ?? ' '}
      </p>
      <fieldset className="meter-modes">
        <legend>Mode</legend>
        {MODES.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name="meter-mode"
              checked={mode === item.id}
              onChange={() => setMode(item.id)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <ul className="meter-probes">
        {PROBES.map((probe) => {
          const place = probePlace(project, probes[probe]);
          return (
            <li key={probe}>
              <button
                type="button"
                className={`meter-probe ${probe}${picking === probe ? ' picking' : ''}`}
                aria-pressed={picking === probe}
                // Tahan dan seret ke terminal, atau klik lalu klik terminalnya.
                onPointerDown={(e) => {
                  if (e.button === 0) startPicking(probe, { x: e.clientX, y: e.clientY });
                }}
                onClick={(e) => {
                  // Papan ketik: klik tanpa penunjuk.
                  if (e.detail === 0) startPicking(probe);
                }}
              >
                {PROBE_LABELS[probe]}
              </button>
              <span className="meter-place">{place ?? 'belum ditempelkan'}</span>
              {place && (
                <button
                  type="button"
                  className="meter-detach"
                  aria-label={`Lepas ${PROBE_LABELS[probe].toLowerCase()}`}
                  onClick={() => detach(probe)}
                >
                  Lepas
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
