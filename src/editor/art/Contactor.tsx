import { coilVoltsOf } from '../../core/catalog/contactor';
import type { ArtProps } from './types';

/** Letak kutub (piksel) dan apakah kontaknya menutup saat kontaktor menarik. */
const POLES = [
  { x: 20, closesWhenPulled: true },
  { x: 40, closesWhenPulled: true },
  { x: 60, closesWhenPulled: true },
  { x: 80, closesWhenPulled: true },
  { x: 100, closesWhenPulled: false },
] as const;

/**
 * Kontaktor: klem kontak utama dan bantu, tanda tiap kontak (garis lurus = menutup, garis
 * miring = membuka), kumparan A1-A2 di kiri, dan jendela penunjuk ON/OFF/TERBAKAR.
 */
export function ContactorArt({ w, h, state, settings }: ArtProps) {
  const contactor = state.kind === 'contactor' ? state : { pulled: false, burnt: false };
  const pulled = contactor.pulled && !contactor.burnt;
  const status = contactor.burnt ? 'burnt' : pulled ? 'on' : 'off';
  const text = { burnt: 'TERBAKAR', on: 'ON', off: 'OFF' }[status];

  return (
    <g className="art-contactor" data-status={status}>
      <rect className="art-case" x={6} y={6} width={w - 12} height={h - 12} rx={3} />
      {POLES.map(({ x, closesWhenPulled }) => {
        const closed = closesWhenPulled === pulled;
        return (
          <g key={x}>
            <rect className="art-clamp" x={x - 8} y={6} width={16} height={13} />
            <rect className="art-clamp" x={x - 8} y={h - 19} width={16} height={13} />
            <line
              className={closed ? 'art-contact closed' : 'art-contact'}
              x1={x}
              y1={22}
              x2={closed ? x : x + 6}
              y2={closed ? 35 : 32}
            />
          </g>
        );
      })}
      <rect className="art-face" x={26} y={38} width={w - 38} height={h - 80} rx={3} />
      <rect className="art-coil" x={9} y={50} width={11} height={20} rx={2} />
      <rect className="art-window" x={40} y={45} width={54} height={18} rx={2} />
      <text className="art-text light" x={67} y={54} fontSize={status === 'burnt' ? 7 : 9}>
        {text}
      </text>
      <text className="art-text light" x={67} y={72} fontSize={6.5}>
        A1-A2 {coilVoltsOf(settings)} V~
      </text>
    </g>
  );
}
