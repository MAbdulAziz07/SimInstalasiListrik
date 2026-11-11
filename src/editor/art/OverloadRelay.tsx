import { torAmpsOf } from '../../core/catalog/overloadRelay';
import { TOR_AMPS_MAX, TOR_AMPS_MIN } from '../../core/types';
import type { ArtProps } from './types';

const TERMINALS = [20, 40, 60, 80, 100] as const;
/** Sudut putar penunjuk setelan dari arus terkecil sampai terbesar (derajat). */
const DIAL_SWEEP = 240;

/** TOR: klem terminal, tombol setelan arus, tombol RESET, dan jendela keadaan bimetal. */
export function OverloadRelayArt({ w, h, state, settings }: ArtProps) {
  const relay = state.kind === 'overload' ? state : { tripped: false, heat: 0 };
  const amps = torAmpsOf(settings);
  const turn = ((amps - TOR_AMPS_MIN) / (TOR_AMPS_MAX - TOR_AMPS_MIN)) * DIAL_SWEEP;
  const angle = -DIAL_SWEEP / 2 + turn;
  const heating = !relay.tripped && relay.heat > 0;

  let status = 'NORMAL';
  if (relay.tripped) status = 'TRIP';
  else if (heating) status = `PANAS ${Math.round(relay.heat * 100)}%`;

  return (
    <g className="art-tor" data-status={relay.tripped ? 'trip' : heating ? 'hot' : 'normal'}>
      <rect className="art-case" x={6} y={6} width={w - 12} height={h - 12} rx={3} />
      {TERMINALS.map((x) => (
        <g key={x}>
          <rect className="art-clamp" x={x - 8} y={6} width={16} height={13} />
          <rect className="art-clamp" x={x - 8} y={h - 19} width={16} height={13} />
        </g>
      ))}
      <rect className="art-face" x={11} y={23} width={w - 22} height={h - 46} rx={3} />

      {/* Tombol setelan arus. */}
      <circle className="art-dial" cx={31} cy={44} r={13} />
      <line
        className="art-dial-pointer"
        x1={31}
        y1={44}
        x2={31}
        y2={33}
        transform={`rotate(${angle} 31 44)`}
      />
      <text className="art-text light" x={31} y={66} fontSize={7}>
        {String(amps).replace('.', ',')} A
      </text>

      <rect
        className={relay.tripped ? 'art-reset armed' : 'art-reset'}
        x={54}
        y={28}
        width={30}
        height={13}
        rx={2}
      />
      <text className="art-text light" x={69} y={34.5} fontSize={6}>
        RESET
      </text>
      <circle className="art-stop" cx={98} cy={34.5} r={5.5} />

      {/* Jendela keadaan: hijau normal, batang jingga saat bimetal memanas, merah saat trip. */}
      <rect className="art-window" x={54} y={48} width={54} height={14} rx={2} />
      {heating && (
        <rect className="art-heat" x={54} y={48} width={54 * relay.heat} height={14} rx={2} />
      )}
      <text className="art-text light" x={81} y={55} fontSize={7}>
        {status}
      </text>
    </g>
  );
}
