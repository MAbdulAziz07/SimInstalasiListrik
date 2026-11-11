import { mcbAmpsOf } from '../../core/catalog/mcb';
import type { ArtProps } from './types';

/** Letak tuas (piksel dari atas) pada tiap posisi. */
const LEVER_Y = { on: 28.5, trip: 33, off: 37.5 } as const;
/** Warna jendela penunjuk: merah = tersambung, hijau = terbuka, seperti MCB sungguhan. */
const FLAG = { on: '#d62828', trip: '#b45309', off: '#2e9b46' } as const;
const FLAG_TEXT = { on: 'ON', trip: 'TRIP', off: 'OFF' } as const;

function positionOf(state: ArtProps['state']): keyof typeof LEVER_Y {
  if (state.kind !== 'mcb') return 'off';
  if (state.tripped) return 'trip';
  return state.closed ? 'on' : 'off';
}

/** MCB: badan, klem terminal atas-bawah, tuas tiap kutub, dan jendela penunjuk posisi. */
function McbArt({ w, h, state, settings, poles }: ArtProps & { poles: readonly number[] }) {
  const position = positionOf(state);
  const leverY = LEVER_Y[position];
  const first = poles[0] ?? w / 2;
  const last = poles[poles.length - 1] ?? w / 2;

  return (
    <g className="art-mcb" data-position={position}>
      <rect className="art-case" x={6} y={6} width={w - 12} height={h - 12} rx={3} />
      {poles.map((x) => (
        <g key={x}>
          <rect className="art-clamp" x={x - 8} y={6} width={16} height={13} />
          <rect className="art-clamp" x={x - 8} y={h - 19} width={16} height={13} />
          <rect className="art-recess" x={x - 7} y={27} width={14} height={23} rx={2} />
          <rect className="art-lever" x={x - 5} y={leverY} width={10} height={11} rx={1.5} />
        </g>
      ))}
      {/* Tuas MCB berkutub banyak digandeng agar semua kutub membuka bersama. */}
      {poles.length > 1 && (
        <rect
          className="art-lever"
          x={first - 5}
          y={leverY + 3.5}
          width={last - first + 10}
          height={4}
        />
      )}
      <rect
        x={first - 8}
        y={52}
        width={last - first + 16}
        height={8}
        rx={1}
        fill={FLAG[position]}
      />
      <text className="art-text light" x={w / 2} y={56} fontSize={5.5}>
        {FLAG_TEXT[position]}
      </text>
      <text className="art-text" x={w / 2} y={23} fontSize={7}>
        C{mcbAmpsOf(settings)}
      </text>
    </g>
  );
}

export function Mcb1pArt(props: ArtProps) {
  return <McbArt {...props} poles={[20]} />;
}

export function Mcb3pArt(props: ArtProps) {
  return <McbArt {...props} poles={[20, 40, 60]} />;
}
