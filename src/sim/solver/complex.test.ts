import { describe, expect, test } from 'vitest';
import { abs, add, complex, div, fromPolar, inverse, mul, phaseDeg, scale, sub } from './complex';

describe('bilangan kompleks', () => {
  test('tambah dan kurang', () => {
    expect(add(complex(1, 2), complex(3, -5))).toEqual(complex(4, -3));
    expect(sub(complex(1, 2), complex(3, -5))).toEqual(complex(-2, 7));
  });

  test('kali: (1+2j)(3-1j) = 5+5j', () => {
    expect(mul(complex(1, 2), complex(3, -1))).toEqual(complex(5, 5));
  });

  test('bagi adalah kebalikan dari kali', () => {
    const a = complex(5, 5);
    const b = complex(3, -1);
    const q = div(a, b);
    expect(q.re).toBeCloseTo(1, 12);
    expect(q.im).toBeCloseTo(2, 12);
  });

  test('kebalikan j100 adalah -j0,01', () => {
    const y = inverse(complex(0, 100));
    expect(y.re).toBeCloseTo(0, 12);
    expect(y.im).toBeCloseTo(-0.01, 12);
  });

  test('skala', () => {
    expect(scale(complex(2, -3), 2)).toEqual(complex(4, -6));
  });

  test('besar dan sudut', () => {
    expect(abs(complex(3, 4))).toBe(5);
    expect(phaseDeg(complex(0, 2))).toBeCloseTo(90, 12);
    expect(phaseDeg(complex(-1, 0))).toBeCloseTo(180, 12);
  });

  test('fromPolar', () => {
    const v = fromPolar(230, -120);
    expect(abs(v)).toBeCloseTo(230, 9);
    expect(phaseDeg(v)).toBeCloseTo(-120, 9);
    expect(v.re).toBeCloseTo(-115, 9);
  });

  test('bagi dengan pembagi sangat besar atau sangat kecil tidak meluap', () => {
    const big = div(complex(1, 1), complex(1e200, 1e200));
    expect(big.re).toBeCloseTo(1e-200, 210);
    expect(Number.isFinite(big.re) && Number.isFinite(big.im)).toBe(true);
    const small = div(complex(1e-200, 0), complex(1e-200, 1e-200));
    expect(small.re).toBeCloseTo(0.5, 12);
    expect(small.im).toBeCloseTo(-0.5, 12);
  });
});
