import type { ArtProps } from './types';

/** Push button: tombol hijau untuk kontak NO, merah untuk kontak NC; mengecil saat ditekan. */
function PushButtonArt({ w, h, state, kind }: ArtProps & { kind: 'NO' | 'NC' }) {
  const pressed = state.kind === 'pushButton' && state.pressed;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <g className={`art-button ${kind.toLowerCase()}${pressed ? ' pressed' : ''}`}>
      <rect className="art-case" x={5} y={5} width={w - 10} height={h - 10} rx={3} />
      <circle className="art-button-collar" cx={cx} cy={cy} r={12} />
      <circle className="art-button-cap" cx={cx} cy={cy} r={pressed ? 7.5 : 10} />
      <text className="art-text light" x={cx} y={cy} fontSize={pressed ? 5 : 6.5}>
        {kind}
      </text>
    </g>
  );
}

export function PushButtonNOArt(props: ArtProps) {
  return <PushButtonArt {...props} kind="NO" />;
}

export function PushButtonNCArt(props: ArtProps) {
  return <PushButtonArt {...props} kind="NC" />;
}

/** Lampu indikator panel: lensa dalam cincin logam, menyala sebanding dayanya. */
export function PilotLampArt({ w, h, brightness }: ArtProps) {
  const cx = w / 2;
  const cy = h / 2;
  return (
    <g className="art-pilot">
      <rect className="art-case" x={5} y={5} width={w - 10} height={h - 10} rx={3} />
      <circle className="art-button-collar" cx={cx} cy={cy} r={12} />
      <circle className="art-pilot-lens" cx={cx} cy={cy} r={9} />
      {brightness !== undefined && (
        <circle className="lamp-glow" cx={cx} cy={cy} r={9} opacity={Math.sqrt(brightness)} />
      )}
    </g>
  );
}
