import { timerSecondsOf } from '../../core/catalog/timer';
import { TIMER_SECONDS_MAX, TIMER_SECONDS_MIN } from '../../core/types';
import type { ArtProps } from './types';

/** Sudut putar penunjuk setelan dari waktu terpendek sampai terpanjang (derajat). */
const DIAL_SWEEP = 270;

/**
 * Timer on-delay: tombol putar waktu tunda, layar hitungan, dan klem kontak. Klem 16 atau 18
 * yang sedang tersambung ke 15 diberi warna.
 */
export function TimerArt({ w, h, state, settings }: ArtProps) {
  const timer = state.kind === 'timer' ? state : { elapsed: 0, done: false };
  const seconds = timerSecondsOf(settings);
  const turn =
    ((seconds - TIMER_SECONDS_MIN) / (TIMER_SECONDS_MAX - TIMER_SECONDS_MIN)) * DIAL_SWEEP;
  const angle = -DIAL_SWEEP / 2 + turn;
  const counting = !timer.done && timer.elapsed > 0;

  let text = 'OFF';
  if (timer.done) text = 'ON';
  else if (counting) text = `${timer.elapsed.toFixed(1).replace('.', ',')} s`;

  return (
    <g className="art-timer" data-status={timer.done ? 'done' : counting ? 'counting' : 'idle'}>
      <rect className="art-case" x={6} y={6} width={w - 12} height={h - 12} rx={3} />
      <rect className="art-clamp" x={32} y={6} width={16} height={13} />
      <rect
        className={timer.done ? 'art-clamp' : 'art-clamp active'}
        x={12}
        y={h - 19}
        width={16}
        height={13}
      />
      <rect
        className={timer.done ? 'art-clamp active' : 'art-clamp'}
        x={52}
        y={h - 19}
        width={16}
        height={13}
      />
      <rect className="art-face" x={24} y={24} width={w - 36} height={h - 50} rx={3} />

      <circle className="art-dial" cx={46} cy={45} r={14} />
      <line
        className="art-dial-pointer"
        x1={46}
        y1={45}
        x2={46}
        y2={33}
        transform={`rotate(${angle} 46 45)`}
      />
      <text className="art-text light" x={46} y={67} fontSize={7}>
        {String(seconds).replace('.', ',')} s
      </text>

      <rect className="art-window" x={29} y={75} width={34} height={14} rx={2} />
      <text className="art-text light" x={46} y={82} fontSize={7}>
        {text}
      </text>
    </g>
  );
}
