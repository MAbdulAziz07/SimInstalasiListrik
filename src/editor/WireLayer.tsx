import { memo } from 'react';
import { terminalPosition } from '../core/geometry';
import type { PlacedComponent, Point, Wire, WireColor } from '../core/types';
import type { BoardHandlers } from './BoardParts';
import { GRID } from './store';
import { segmentMidpoints, WIRE_COLOR_INFO } from './wiring';

function toPolyline(points: readonly Point[]): string {
  return points.map((p) => `${p.x * GRID},${p.y * GRID}`).join(' ');
}

/** Garis kabel berwarna; hijau-kuning digambar sebagai garis hijau bergaris kuning. */
export function WireStroke({ points, color }: { points: readonly Point[]; color: WireColor }) {
  const info = WIRE_COLOR_INFO[color];
  const path = toPolyline(points);
  return (
    <>
      <polyline className="wire-line" points={path} stroke={info.stroke} />
      {info.dash && (
        <polyline className="wire-line" points={path} stroke={info.dash} strokeDasharray="6 6" />
      )}
    </>
  );
}

type WireHandlers = Pick<
  BoardHandlers,
  'wireDown' | 'bendDown' | 'midpointDown' | 'bendDoubleClick'
>;

interface WireViewProps {
  wire: Wire;
  from: PlacedComponent;
  to: PlacedComponent;
  selected: boolean;
  live: boolean;
  handlers: WireHandlers;
}

/** Satu kabel; hanya digambar ulang bila kabel itu atau komponen di kedua ujungnya berubah. */
const WireView = memo(function WireView({
  wire,
  from,
  to,
  selected,
  live,
  handlers,
}: WireViewProps) {
  const points = [
    terminalPosition(from, wire.from.terminalId),
    ...wire.bends,
    terminalPosition(to, wire.to.terminalId),
  ];
  const info = WIRE_COLOR_INFO[wire.color];
  const classes = ['wire'];
  if (selected) classes.push('selected');
  if (live) classes.push('live');
  const path = toPolyline(points);
  return (
    <g
      className={classes.join(' ')}
      data-wire-id={wire.id}
      data-live={live}
      role="button"
      tabIndex={0}
      aria-label={live ? `Kabel ${info.label}, bertegangan` : `Kabel ${info.label}`}
      aria-pressed={selected}
      onPointerDown={(e) => handlers.wireDown(e, wire)}
    >
      {selected && <polyline className="wire-halo" points={path} />}
      {live && <polyline className="wire-live" points={path} />}
      <WireStroke points={points} color={wire.color} />
      <polyline className="wire-hit" points={path} />
      {selected &&
        segmentMidpoints(points).map((mid, index) => (
          <circle
            key={`m${index}`}
            className="wire-midpoint"
            cx={mid.x * GRID}
            cy={mid.y * GRID}
            r={4}
            onPointerDown={(e) => handlers.midpointDown(e, wire, index, mid)}
          >
            <title>Seret untuk menambah titik belok</title>
          </circle>
        ))}
      {selected &&
        wire.bends.map((bend, index) => (
          <circle
            key={`b${index}`}
            className="wire-bend"
            cx={bend.x * GRID}
            cy={bend.y * GRID}
            r={5}
            onPointerDown={(e) => handlers.bendDown(e, wire, index)}
            onDoubleClick={() => handlers.bendDoubleClick(wire, index)}
          >
            <title>Seret untuk memindah; klik dua kali untuk menghapus</title>
          </circle>
        ))}
    </g>
  );
});

interface Props {
  wires: readonly Wire[];
  componentsById: ReadonlyMap<string, PlacedComponent>;
  selectedId: string | null;
  /** Id kabel yang bertegangan; kosong saat papan tidak bertegangan. */
  liveIds: ReadonlySet<string>;
  handlers: WireHandlers;
}

export function WireLayer({ wires, componentsById, selectedId, liveIds, handlers }: Props) {
  return (
    <g className="wires">
      {wires.map((wire) => {
        const from = componentsById.get(wire.from.componentId);
        const to = componentsById.get(wire.to.componentId);
        if (!from || !to) return null;
        return (
          <WireView
            key={wire.id}
            wire={wire}
            from={from}
            to={to}
            selected={wire.id === selectedId}
            live={liveIds.has(wire.id)}
            handlers={handlers}
          />
        );
      })}
    </g>
  );
}
