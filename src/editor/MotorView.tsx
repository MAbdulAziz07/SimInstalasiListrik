import type { ComponentState } from '../core/types';
import { motorText } from './simView';

interface Props {
  cx: number;
  cy: number;
  state: Extract<ComponentState, { kind: 'motor' }>;
}

const RADIUS = 22;

/** Rotor motor: berputar sesuai arah, bergetar saat mendengung, diam saat berhenti. */
export function MotorView({ cx, cy, state }: Props) {
  const motion =
    state.mode === 'running' ? `spin-${state.direction}` : state.mode === 'humming' ? 'hum' : '';
  return (
    <g className="motor">
      <circle className="motor-stator" cx={cx} cy={cy} r={RADIUS} />
      <g className={`motor-rotor ${motion}`.trim()}>
        <circle className="motor-hub" cx={cx} cy={cy} r={RADIUS - 5} />
        <line x1={cx - RADIUS + 6} y1={cy} x2={cx + RADIUS - 6} y2={cy} />
        <line x1={cx} y1={cy - RADIUS + 6} x2={cx} y2={cy + RADIUS - 6} />
        {/* Tanda di satu sisi agar arah putar terlihat. */}
        <circle className="motor-mark" cx={cx + RADIUS - 9} cy={cy} r={3} />
      </g>
      <text
        className={`lever ${state.mode === 'running' ? 'on' : state.mode === 'humming' ? 'trip' : 'off'}`}
        x={cx}
        y={cy + RADIUS + 10}
      >
        {motorText(state)}
      </text>
    </g>
  );
}
