import { findComponent } from '../core/edit';
import { terminalPosition } from '../core/geometry';
import { GRID, useEditor } from '../editor/store';
import { PROBE_LABELS, PROBES, terminalExists } from './meterReading';
import { useInstruments } from './store';

/** Panjang batang probe yang digambar di papan (piksel pada zoom 100%). */
const NEEDLE = 26;

/**
 * Probe multimeter yang menempel di terminal papan aktif. Digambar di dalam papan, di atas
 * terminal. Hanya gagangnya yang bisa dipegang, sehingga terminal di bawahnya tetap bisa diklik.
 */
export function ProbeLayer() {
  const open = useInstruments((s) => s.meterOpen);
  const probes = useInstruments((s) => s.probes);
  const picking = useInstruments((s) => s.picking);
  const project = useEditor((s) => s.project);
  const activeBoard = useEditor((s) => s.activeBoard);
  if (!open) return null;

  return (
    <g className="probes">
      {PROBES.map((probe, index) => {
        const ref = probes[probe];
        if (!terminalExists(project, ref)) return null;
        const found = findComponent(project, ref.componentId);
        if (!found || found.boardId !== activeBoard) return null;
        const at = terminalPosition(found.component, ref.terminalId);
        // Kedua probe condong ke arah berbeda agar tetap terlihat di terminal yang sama.
        const lean = index === 0 ? -1 : 1;
        return (
          <g
            key={probe}
            className={`probe ${probe}${picking === probe ? ' picking' : ''}`}
            transform={`translate(${at.x * GRID} ${at.y * GRID})`}
            data-probe={probe}
          >
            <circle className="probe-ring" r={7} />
            <line className="probe-needle" x1={0} y1={0} x2={lean * NEEDLE} y2={-NEEDLE} />
            <circle
              className="probe-grip"
              cx={lean * NEEDLE}
              cy={-NEEDLE}
              r={7}
              role="button"
              aria-label={`${PROBE_LABELS[probe]} di papan`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                useInstruments.getState().startPicking(probe, { x: e.clientX, y: e.clientY });
              }}
            />
          </g>
        );
      })}
    </g>
  );
}
