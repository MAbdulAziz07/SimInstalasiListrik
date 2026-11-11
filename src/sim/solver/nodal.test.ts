import { describe, expect, test } from 'vitest';
import { abs, complex, fromPolar, inverse, phaseDeg, sub, type Complex } from './complex';
import { solveNetwork, type Network } from './nodal';

const ohm = (r: number): Complex => complex(1 / r, 0);
const SQRT3 = Math.sqrt(3);

function expectFinite(values: Complex[]) {
  for (const v of values) {
    expect(Number.isFinite(v.re) && Number.isFinite(v.im)).toBe(true);
  }
}

/** Galat relatif di bawah 0,1%. */
function expectWithin(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-3);
}

describe('pembagi tegangan', () => {
  test('dua resistor seri: 100 Ω dan 300 Ω pada 230 V', () => {
    const net: Network = {
      nodeCount: 3,
      fixed: [
        { node: 0, voltage: complex(230, 0) },
        { node: 2, voltage: complex(0, 0) },
      ],
      branches: [
        { a: 0, b: 1, admittance: ohm(100) },
        { a: 1, b: 2, admittance: ohm(300) },
      ],
    };
    const { voltages, currents } = solveNetwork(net);
    expectWithin(abs(voltages[1]!), 172.5);
    expectWithin(abs(currents[0]!), 0.575);
    expectWithin(abs(currents[1]!), 0.575);
    expect(voltages[0]).toEqual(complex(230, 0));
  });

  test('arus bertanda positif dari a ke b', () => {
    const net: Network = {
      nodeCount: 2,
      fixed: [
        { node: 0, voltage: complex(0, 0) },
        { node: 1, voltage: complex(230, 0) },
      ],
      branches: [{ a: 0, b: 1, admittance: ohm(100) }],
    };
    expect(solveNetwork(net).currents[0]!.re).toBeCloseTo(-2.3, 9);
  });

  test('resistor seri dengan induktor: tegangan induktor mendahului 45°', () => {
    const net: Network = {
      nodeCount: 3,
      fixed: [
        { node: 0, voltage: complex(230, 0) },
        { node: 2, voltage: complex(0, 0) },
      ],
      branches: [
        { a: 0, b: 1, admittance: ohm(100) },
        { a: 1, b: 2, admittance: inverse(complex(0, 100)) },
      ],
    };
    const v = solveNetwork(net).voltages[1]!;
    expectWithin(abs(v), 230 / Math.SQRT2);
    expect(phaseDeg(v)).toBeCloseTo(45, 3);
  });
});

describe('sumber tiga fasa', () => {
  // simpul 0 = N, 1..3 = L1..L3
  const fixed = [
    { node: 0, voltage: complex(0, 0) },
    { node: 1, voltage: fromPolar(230, 0) },
    { node: 2, voltage: fromPolar(230, -120) },
    { node: 3, voltage: fromPolar(230, 120) },
  ];

  test('230 V fasa-netral dan 400 V antar-fasa', () => {
    const { voltages } = solveNetwork({ nodeCount: 4, fixed, branches: [] });
    for (const n of [1, 2, 3]) expectWithin(abs(voltages[n]!), 230);
    const pairs: [number, number][] = [
      [1, 2],
      [2, 3],
      [3, 1],
    ];
    for (const [a, b] of pairs) {
      const lineVolts = abs(sub(voltages[a]!, voltages[b]!));
      expectWithin(lineVolts, 230 * SQRT3);
      expect(Math.abs(lineVolts - 400)).toBeLessThan(2);
    }
  });

  test('beban bintang seimbang: titik bintang 0 V, arus 230/R per fasa', () => {
    const net: Network = {
      nodeCount: 5,
      fixed,
      branches: [1, 2, 3].map((n) => ({ a: n, b: 4, admittance: ohm(46) })),
    };
    const { voltages, currents } = solveNetwork(net);
    expect(abs(voltages[4]!)).toBeLessThan(1e-6);
    for (const i of currents) expectWithin(abs(i), 5);
  });

  test('beban segitiga: 400 V per belitan, arus √3 kali lebih besar daripada bintang', () => {
    const net: Network = {
      nodeCount: 4,
      fixed,
      branches: [
        { a: 1, b: 2, admittance: ohm(46) },
        { a: 2, b: 3, admittance: ohm(46) },
        { a: 3, b: 1, admittance: ohm(46) },
      ],
    };
    for (const i of solveNetwork(net).currents) expectWithin(abs(i), 5 * SQRT3);
  });

  test('bintang kehilangan satu fasa: titik bintang bergeser ke tengah dua fasa tersisa', () => {
    const net: Network = {
      nodeCount: 5,
      fixed,
      branches: [1, 2].map((n) => ({ a: n, b: 4, admittance: ohm(46) })),
    };
    const { voltages, currents } = solveNetwork(net);
    expectWithin(abs(voltages[4]!), 115);
    expectWithin(abs(currents[0]!), (230 * SQRT3) / 92);
  });
});

describe('kasus sulit', () => {
  test('simpul yang tidak tersambung ke mana pun bernilai 0 V', () => {
    const { voltages } = solveNetwork({
      nodeCount: 3,
      fixed: [{ node: 0, voltage: complex(230, 0) }],
      branches: [],
    });
    expectFinite(voltages);
    expect(abs(voltages[1]!)).toBe(0);
    expect(abs(voltages[2]!)).toBe(0);
  });

  test('pulau tanpa sumber bernilai 0 V', () => {
    const { voltages, currents } = solveNetwork({
      nodeCount: 3,
      fixed: [{ node: 0, voltage: complex(230, 0) }],
      branches: [{ a: 1, b: 2, admittance: ohm(0.01) }],
    });
    expectFinite(voltages);
    expectFinite(currents);
    expect(abs(voltages[1]!)).toBe(0);
    expect(abs(currents[0]!)).toBe(0);
  });

  test('ujung terbuka di belakang beban ikut bertegangan, tanpa arus berarti', () => {
    const { voltages, currents } = solveNetwork({
      nodeCount: 2,
      fixed: [{ node: 0, voltage: complex(230, 0) }],
      branches: [{ a: 0, b: 1, admittance: ohm(1000) }],
    });
    expectWithin(abs(voltages[1]!), 230);
    expect(abs(currents[0]!)).toBeLessThan(1e-6);
  });

  test('hubung singkat fasa ke netral lewat kabel menghasilkan arus besar yang terhingga', () => {
    const { voltages, currents } = solveNetwork({
      nodeCount: 3,
      fixed: [
        { node: 0, voltage: complex(230, 0) },
        { node: 2, voltage: complex(0, 0) },
      ],
      branches: [
        { a: 0, b: 1, admittance: ohm(0.01) },
        { a: 1, b: 2, admittance: ohm(0.01) },
      ],
    });
    expectFinite(voltages);
    expectFinite(currents);
    expectWithin(abs(currents[0]!), 11500);
  });

  test('hubung singkat langsung antara dua simpul bertegangan tetap', () => {
    const { currents } = solveNetwork({
      nodeCount: 2,
      fixed: [
        { node: 0, voltage: complex(230, 0) },
        { node: 1, voltage: complex(0, 0) },
      ],
      branches: [{ a: 0, b: 1, admittance: ohm(0.01) }],
    });
    expectWithin(abs(currents[0]!), 23000);
  });

  test('beban kecil di belakang rantai kabel panjang tetap terhitung teliti', () => {
    // 50 potong kabel 10 mΩ, lalu lampu 1 kΩ ke netral.
    const wires = 50;
    const branches = Array.from({ length: wires }, (_, i) => ({
      a: i,
      b: i + 1,
      admittance: ohm(0.01),
    }));
    branches.push({ a: wires, b: wires + 1, admittance: ohm(1000) });
    const { voltages, currents } = solveNetwork({
      nodeCount: wires + 2,
      fixed: [
        { node: 0, voltage: complex(230, 0) },
        { node: wires + 1, voltage: complex(0, 0) },
      ],
      branches,
    });
    expectWithin(abs(currents[wires]!), 230 / 1000.5);
    expectWithin(abs(voltages[wires]!), 230);
  });

  test('induktor dan kapasitor yang saling meniadakan di satu simpul (perlu tukar pivot)', () => {
    // Simpul 0: induktor ke 0 V dan kapasitor ke simpul 1, sama besar berlawanan tanda,
    // sehingga diagonal simpul 0 nyaris nol. Simpul 1: resistor 100 Ω ke 230 V.
    // Secara analitis V1 = 0 dan V0 = j230.
    const { voltages } = solveNetwork({
      nodeCount: 4,
      fixed: [
        { node: 2, voltage: complex(0, 0) },
        { node: 3, voltage: complex(230, 0) },
      ],
      branches: [
        { a: 0, b: 2, admittance: complex(0, -0.01) },
        { a: 0, b: 1, admittance: complex(0, 0.01) },
        { a: 1, b: 3, admittance: ohm(100) },
      ],
    });
    expectFinite(voltages);
    expect(abs(voltages[1]!)).toBeLessThan(1e-3);
    expectWithin(abs(voltages[0]!), 230);
    expect(phaseDeg(voltages[0]!)).toBeCloseTo(90, 3);
  });

  test('cabang dari simpul ke dirinya sendiri tidak berarus', () => {
    const { currents } = solveNetwork({
      nodeCount: 1,
      fixed: [{ node: 0, voltage: complex(230, 0) }],
      branches: [{ a: 0, b: 0, admittance: ohm(1) }],
    });
    expect(abs(currents[0]!)).toBe(0);
  });

  test('jaringan kosong', () => {
    expect(solveNetwork({ nodeCount: 0, fixed: [], branches: [] })).toEqual({
      voltages: [],
      currents: [],
    });
  });
});

describe('masukan tidak sah', () => {
  test('nomor simpul di luar rentang ditolak', () => {
    expect(() =>
      solveNetwork({ nodeCount: 2, fixed: [], branches: [{ a: 0, b: 2, admittance: ohm(1) }] }),
    ).toThrow(/simpul/i);
    expect(() =>
      solveNetwork({ nodeCount: 2, fixed: [{ node: 5, voltage: complex(1, 0) }], branches: [] }),
    ).toThrow(/simpul/i);
  });

  test('satu simpul dengan dua tegangan tetap berbeda ditolak', () => {
    expect(() =>
      solveNetwork({
        nodeCount: 1,
        fixed: [
          { node: 0, voltage: complex(230, 0) },
          { node: 0, voltage: complex(0, 0) },
        ],
        branches: [],
      }),
    ).toThrow(/dua tegangan/i);
  });
});
