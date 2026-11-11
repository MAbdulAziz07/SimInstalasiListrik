import type { ArtProps } from './types';

/** Stop kontak dinding berpembumian: dua lubang kontak dan dua klip pembumian. */
export function SocketArt({ w, h }: ArtProps) {
  const cx = w / 2;
  const cy = 26;
  return (
    <g className="art-socket">
      <rect className="art-plate" x={4} y={3} width={w - 8} height={h - 12} rx={5} />
      <circle className="art-socket-well" cx={cx} cy={cy} r={18} />
      <circle className="art-socket-hole" cx={cx - 8} cy={cy} r={3} />
      <circle className="art-socket-hole" cx={cx + 8} cy={cy} r={3} />
      <rect className="art-socket-earth" x={cx - 2.5} y={cy - 18} width={5} height={6} />
      <rect className="art-socket-earth" x={cx - 2.5} y={cy + 12} width={5} height={6} />
    </g>
  );
}

/** Lampu pijar pada fiting: bola lampu menyala sebanding dayanya. */
export function LampArt({ w, h, brightness }: ArtProps) {
  const cx = w / 2;
  const cy = 20;
  return (
    <g className="art-lamp">
      <rect className="art-lamp-base" x={4} y={h - 9} width={w - 8} height={6} rx={2} />
      <rect className="art-lamp-holder" x={cx - 8} y={34} width={16} height={h - 43} rx={2} />
      <circle className="lamp-bulb" cx={cx} cy={cy} r={16} />
      {brightness !== undefined && (
        <circle className="lamp-glow" cx={cx} cy={cy} r={16} opacity={Math.sqrt(brightness)} />
      )}
      <path
        className="art-lamp-filament"
        d={`M ${cx - 5} 34 L ${cx - 5} 24 l 2.5 -5 l 2.5 5 l 2.5 -5 l 2.5 5 L ${cx + 5} 34`}
      />
    </g>
  );
}
