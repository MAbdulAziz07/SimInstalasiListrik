import type { ArtProps } from './types';

interface RockerProps {
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
}

/** Tuas jungkit saklar dinding: separuh bawah tertekan saat ON, separuh atas saat OFF. */
function Rocker({ x, y, w, h, on }: RockerProps) {
  const half = h / 2;
  return (
    <g className={on ? 'art-rocker on' : 'art-rocker'}>
      <rect className="art-rocker-frame" x={x} y={y} width={w} height={h} rx={2} />
      <rect className="art-rocker-pressed" x={x} y={on ? y + half : y} width={w} height={half} />
      <line className="art-rocker-hinge" x1={x} y1={y + half} x2={x + w} y2={y + half} />
      <text
        className="art-text art-rocker-text"
        x={x + w / 2}
        y={on ? y + half * 1.5 : y + half / 2}
        fontSize={6}
      >
        {on ? 'ON' : 'OFF'}
      </text>
    </g>
  );
}

function Plate({ w, h }: { w: number; h: number }) {
  return <rect className="art-plate" x={4} y={7} width={w - 8} height={h - 14} rx={5} />;
}

export function Switch1Art({ w, h, state }: ArtProps) {
  const on = state.kind === 'switch' && state.closed;
  return (
    <g className="art-switch">
      <Plate w={w} h={h} />
      <Rocker x={11} y={14} w={18} h={32} on={on} />
    </g>
  );
}

/** Saklar seri: dua tuas pada satu pelat, masing-masing untuk satu keluaran. */
export function Switch2GangArt({ w, h, state }: ArtProps) {
  const gang = state.kind === 'switch2gang' ? state : { closed1: false, closed2: false };
  return (
    <g className="art-switch">
      <Plate w={w} h={h} />
      <Rocker x={12} y={14} w={22} h={32} on={gang.closed1} />
      <Rocker x={46} y={14} w={22} h={32} on={gang.closed2} />
    </g>
  );
}

/** Saklar tukar: tuas jungkit kiri-kanan; sisi yang tertekan menunjukkan terminal tersambung. */
export function Switch2WayArt({ w, h, state }: ArtProps) {
  const position = state.kind === 'switch2way' ? state.position : 1;
  const left = position === 1;
  return (
    <g className="art-switch" data-position={position}>
      <Plate w={w} h={h} />
      <rect className="art-rocker-frame" x={20} y={16} width={40} height={28} rx={2} />
      <rect className="art-rocker-pressed way" x={left ? 20 : 40} y={16} width={20} height={28} />
      <line className="art-rocker-hinge" x1={40} y1={16} x2={40} y2={44} />
      {/* Lengan kontak dari C ke terminal yang tersambung. */}
      <line className="art-contact-arm" x1={40} y1={11} x2={left ? 22 : 58} y2={49} />
      <text className={left ? 'art-text light' : 'art-text'} x={30} y={30} fontSize={9}>
        1
      </text>
      <text className={left ? 'art-text' : 'art-text light'} x={50} y={30} fontSize={9}>
        2
      </text>
    </g>
  );
}
