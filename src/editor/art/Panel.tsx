import { x1Labels } from '../../core/catalog/panel';
import type { ArtProps } from './types';

/** Jarak antar-terminal X1 (piksel pada zoom 100%). */
const PITCH = 20;

function terminalXs(settings: ArtProps['settings']): number[] {
  return x1Labels(settings).map((_, index) => (index + 1) * PITCH);
}

/** Kotak panel di papan Instalasi: pintu berpegangan dan deret terminal X1 di bawah. */
export function PanelArt({ w, h, settings }: ArtProps) {
  return (
    <g className="art-panel">
      <rect className="art-panel-cabinet" x={4} y={4} width={w - 8} height={h - 8} rx={3} />
      <rect className="art-panel-door" x={10} y={10} width={w - 20} height={54} rx={2} />
      <rect className="art-panel-handle" x={w - 22} y={28} width={5} height={18} rx={2} />
      <path className="art-panel-warning" d="M 24 22 L 34 40 L 14 40 Z" />
      <path
        className="art-panel-bolt"
        d="M 25 27 L 21 34 L 24.5 34 L 22.5 38.5 L 28 32 L 24.5 32 Z"
      />
      <text className="art-text" x={w / 2 + 6} y={30} fontSize={9}>
        PANEL LISTRIK
      </text>
      <text className="art-text art-panel-hint" x={w / 2 + 6} y={46} fontSize={6.5}>
        Klik 2× untuk membuka
      </text>
      <text className="art-text art-panel-hint" x={w / 2} y={72} fontSize={6}>
        X1
      </text>
      {terminalXs(settings).map((x) => (
        <rect key={x} className="art-clamp" x={x - 8} y={h - 22} width={16} height={17} />
      ))}
    </g>
  );
}

/** Deret terminal blok X1 pada rel di papan Dalam Panel. */
export function TerminalBlockArt({ w, h, settings }: ArtProps) {
  return (
    <g className="art-terminal-block">
      <rect className="art-rail" x={2} y={h - 16} width={w - 4} height={7} />
      <rect className="art-rail-stop" x={3} y={7} width={7} height={h - 11} rx={1} />
      <rect className="art-rail-stop" x={w - 10} y={7} width={7} height={h - 11} rx={1} />
      {terminalXs(settings).map((x) => (
        <g key={x}>
          <rect className="art-block" x={x - 9} y={3} width={18} height={h - 6} rx={1.5} />
          <circle className="art-block-screw" cx={x} cy={h - 13} r={4.5} />
          <line className="art-block-slot" x1={x - 3} y1={h - 13} x2={x + 3} y2={h - 13} />
        </g>
      ))}
    </g>
  );
}
