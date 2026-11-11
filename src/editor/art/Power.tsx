import type { ArtProps } from './types';

const SINE = 'M -7 0 C -4.5 -9, -2.5 -9, 0 0 S 4.5 9, 7 0';

interface SourceProps {
  w: number;
  h: number;
  terminals: readonly number[];
  volts: string;
  system: string;
}

/** Sumber: kotak suplai dengan lambang arus bolak-balik, tegangan, dan klem keluaran di bawah. */
function SourceArt({ w, h, terminals, volts, system }: SourceProps) {
  return (
    <g className="art-source">
      <rect className="art-case" x={4} y={3} width={w - 8} height={h - 7} rx={4} />
      <rect className="art-source-front" x={8} y={7} width={w - 16} height={30} rx={2} />
      <circle className="art-source-symbol" cx={24} cy={22} r={11} />
      <path className="art-source-sine" d={SINE} transform="translate(24 22)" />
      <text className="art-text light" x={(w + 36) / 2} y={17} fontSize={9}>
        {volts}
      </text>
      <text className="art-text light" x={(w + 36) / 2} y={29} fontSize={6.5}>
        {system}
      </text>
      {terminals.map((x) => (
        <rect key={x} className="art-clamp" x={x - 8} y={h - 19} width={16} height={14} />
      ))}
    </g>
  );
}

export function Source1phArt({ w, h }: ArtProps) {
  return <SourceArt w={w} h={h} terminals={[20, 40, 60]} volts="230 V" system="1~ 50 Hz" />;
}

export function Source3phArt({ w, h }: ArtProps) {
  return (
    <SourceArt w={w} h={h} terminals={[20, 40, 60, 80, 100]} volts="400/230 V" system="3~ 50 Hz" />
  );
}

const MOTOR_TERMINALS = [20, 60, 100] as const;
const FINS = [40, 48, 56, 64, 72, 80, 88] as const;

/**
 * Motor tiga fasa: rumah bersirip dengan papan terminal U1 V1 W1 di atas dan W2 U2 V2 di
 * bawah. Rotor yang berputar digambar terpisah di atasnya (lihat MotorView).
 */
export function MotorArt({ w, h }: ArtProps) {
  return (
    <g className="art-motor">
      <rect className="art-motor-box" x={8} y={5} width={w - 16} height={16} rx={2} />
      <rect className="art-motor-box" x={8} y={h - 21} width={w - 16} height={16} rx={2} />
      {MOTOR_TERMINALS.map((x) => (
        <g key={x}>
          <rect className="art-clamp" x={x - 8} y={6} width={16} height={13} />
          <rect className="art-clamp" x={x - 8} y={h - 19} width={16} height={13} />
        </g>
      ))}
      <rect className="art-motor-body" x={12} y={23} width={w - 24} height={h - 46} rx={8} />
      {FINS.map((y) => (
        <g key={y}>
          <line className="art-motor-fin" x1={14} y1={y} x2={34} y2={y} />
          <line className="art-motor-fin" x1={w - 34} y1={y} x2={w - 14} y2={y} />
        </g>
      ))}
      <text className="art-text" x={w / 2} y={31} fontSize={7}>
        Motor 3~
      </text>
    </g>
  );
}
