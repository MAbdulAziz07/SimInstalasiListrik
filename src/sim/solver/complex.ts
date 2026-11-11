export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const ZERO: Complex = { re: 0, im: 0 };

export function complex(re: number, im: number): Complex {
  return { re, im };
}

/** Fasor dari besar dan sudut dalam derajat. */
export function fromPolar(magnitude: number, degrees: number): Complex {
  const rad = (degrees * Math.PI) / 180;
  return { re: magnitude * Math.cos(rad), im: magnitude * Math.sin(rad) };
}

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function scale(a: Complex, k: number): Complex {
  return { re: a.re * k, im: a.im * k };
}

/** Pembagian cara Smith: tidak meluap walau pembagi sangat besar atau sangat kecil. */
export function div(a: Complex, b: Complex): Complex {
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const d = b.re + b.im * r;
    return { re: (a.re + a.im * r) / d, im: (a.im - a.re * r) / d };
  }
  const r = b.re / b.im;
  const d = b.re * r + b.im;
  return { re: (a.re * r + a.im) / d, im: (a.im * r - a.re) / d };
}

export function inverse(a: Complex): Complex {
  return div({ re: 1, im: 0 }, a);
}

export function abs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

export function phaseDeg(a: Complex): number {
  return (Math.atan2(a.im, a.re) * 180) / Math.PI;
}
