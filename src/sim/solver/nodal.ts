import { mul, sub, ZERO, type Complex } from './complex';

/** Cabang pasif antara dua simpul. */
export interface Branch {
  a: number;
  b: number;
  admittance: Complex;
}

/** Simpul yang tegangannya ditentukan sumber (termasuk acuan 0 V). */
export interface FixedNode {
  node: number;
  voltage: Complex;
}

export interface Network {
  /** Simpul bernomor 0 sampai nodeCount - 1. */
  nodeCount: number;
  fixed: FixedNode[];
  branches: Branch[];
}

export interface Solution {
  /** Tegangan tiap simpul terhadap acuan 0 V. */
  voltages: Complex[];
  /** Arus tiap cabang, positif dari `a` ke `b`. */
  currents: Complex[];
}

/**
 * Konduktansi bocor dari tiap simpul bebas ke acuan 0 V (siemens).
 * Menjaga sistem tetap terselesaikan saat ada simpul mengambang, dan membuat
 * simpul tanpa jalur ke sumber terbaca 0 V.
 */
export const LEAK_CONDUCTANCE = 1e-9;

/**
 * Analisis simpul untuk jaringan admitansi dengan simpul bertegangan tetap.
 * Menyelesaikan Y·V = I untuk simpul bebas dengan eliminasi Gauss berpivot.
 */
export function solveNetwork(network: Network): Solution {
  const { nodeCount, fixed, branches } = network;
  checkNodes(network);

  const voltages = new Array<Complex>(nodeCount).fill(ZERO);
  const isFixed = new Array<boolean>(nodeCount).fill(false);
  for (const f of fixed) {
    const earlier = voltages[f.node] as Complex;
    if (isFixed[f.node] && (earlier.re !== f.voltage.re || earlier.im !== f.voltage.im)) {
      throw new Error(`Simpul ${f.node} diberi dua tegangan tetap yang berbeda.`);
    }
    isFixed[f.node] = true;
    voltages[f.node] = f.voltage;
  }

  // Nomor baris/kolom matriks untuk tiap simpul bebas.
  const row = new Array<number>(nodeCount).fill(-1);
  let n = 0;
  for (let node = 0; node < nodeCount; node++) {
    if (!isFixed[node]) row[node] = n++;
  }

  if (n > 0) {
    const yRe = new Float64Array(n * n);
    const yIm = new Float64Array(n * n);
    const iRe = new Float64Array(n);
    const iIm = new Float64Array(n);

    for (let k = 0; k < n; k++) yRe[k * n + k] = LEAK_CONDUCTANCE;

    for (const { a, b, admittance: y } of branches) {
      if (a === b) continue;
      stamp(a, b, y);
      stamp(b, a, y);
    }

    solveInPlace(yRe, yIm, iRe, iIm, n);

    for (let node = 0; node < nodeCount; node++) {
      const r = row[node] as number;
      if (r >= 0) voltages[node] = { re: iRe[r] as number, im: iIm[r] as number };
    }

    /** Menambahkan pengaruh cabang ber-admitansi y pada persamaan simpul `self`. */
    function stamp(self: number, other: number, y: Complex) {
      const r = row[self] as number;
      if (r < 0) return;
      addTo(yRe, r * n + r, y.re);
      addTo(yIm, r * n + r, y.im);
      const c = row[other] as number;
      if (c >= 0) {
        addTo(yRe, r * n + c, -y.re);
        addTo(yIm, r * n + c, -y.im);
      } else {
        const v = voltages[other] as Complex;
        addTo(iRe, r, y.re * v.re - y.im * v.im);
        addTo(iIm, r, y.re * v.im + y.im * v.re);
      }
    }
  }

  const currents = branches.map(({ a, b, admittance }) =>
    a === b ? ZERO : mul(sub(voltages[a] as Complex, voltages[b] as Complex), admittance),
  );
  return { voltages, currents };
}

function checkNodes({ nodeCount, fixed, branches }: Network) {
  const valid = (node: number) => Number.isInteger(node) && node >= 0 && node < nodeCount;
  for (const f of fixed) {
    if (!valid(f.node)) throw new Error(`Nomor simpul ${f.node} di luar rentang.`);
  }
  for (const br of branches) {
    if (!valid(br.a) || !valid(br.b)) {
      throw new Error(`Nomor simpul cabang (${br.a}, ${br.b}) di luar rentang.`);
    }
  }
}

/**
 * Eliminasi Gauss dengan pivot parsial pada matriks kompleks n×n.
 * Hasil ditulis ke vektor ruas kanan (bRe, bIm).
 */
function solveInPlace(
  aRe: Float64Array,
  aIm: Float64Array,
  bRe: Float64Array,
  bIm: Float64Array,
  n: number,
) {
  const at = (arr: Float64Array, i: number) => arr[i] as number;

  for (let col = 0; col < n; col++) {
    let pivot = col;
    let best = Math.hypot(at(aRe, col * n + col), at(aIm, col * n + col));
    for (let r = col + 1; r < n; r++) {
      const size = Math.hypot(at(aRe, r * n + col), at(aIm, r * n + col));
      if (size > best) {
        best = size;
        pivot = r;
      }
    }
    if (pivot !== col) {
      for (let c = col; c < n; c++) {
        swap(aRe, col * n + c, pivot * n + c);
        swap(aIm, col * n + c, pivot * n + c);
      }
      swap(bRe, col, pivot);
      swap(bIm, col, pivot);
    }

    // Pivot tak pernah nol: bagian riil matriks = konduktansi bocor (definit positif)
    // ditambah konduktansi cabang (semidefinit positif), sehingga matriks tak singular.
    const pRe = at(aRe, col * n + col);
    const pIm = at(aIm, col * n + col);
    const pNorm = pRe * pRe + pIm * pIm;

    for (let r = col + 1; r < n; r++) {
      const eRe = at(aRe, r * n + col);
      const eIm = at(aIm, r * n + col);
      if (eRe === 0 && eIm === 0) continue;
      // faktor = elemen / pivot
      const fRe = (eRe * pRe + eIm * pIm) / pNorm;
      const fIm = (eIm * pRe - eRe * pIm) / pNorm;
      for (let c = col; c < n; c++) {
        const uRe = at(aRe, col * n + c);
        const uIm = at(aIm, col * n + c);
        aRe[r * n + c] = at(aRe, r * n + c) - (fRe * uRe - fIm * uIm);
        aIm[r * n + c] = at(aIm, r * n + c) - (fRe * uIm + fIm * uRe);
      }
      const cRe = at(bRe, col);
      const cIm = at(bIm, col);
      bRe[r] = at(bRe, r) - (fRe * cRe - fIm * cIm);
      bIm[r] = at(bIm, r) - (fRe * cIm + fIm * cRe);
    }
  }

  for (let r = n - 1; r >= 0; r--) {
    let sRe = at(bRe, r);
    let sIm = at(bIm, r);
    for (let c = r + 1; c < n; c++) {
      const uRe = at(aRe, r * n + c);
      const uIm = at(aIm, r * n + c);
      const xRe = at(bRe, c);
      const xIm = at(bIm, c);
      sRe -= uRe * xRe - uIm * xIm;
      sIm -= uRe * xIm + uIm * xRe;
    }
    const pRe = at(aRe, r * n + r);
    const pIm = at(aIm, r * n + r);
    const pNorm = pRe * pRe + pIm * pIm;
    bRe[r] = (sRe * pRe + sIm * pIm) / pNorm;
    bIm[r] = (sIm * pRe - sRe * pIm) / pNorm;
  }
}

function addTo(arr: Float64Array, i: number, value: number) {
  arr[i] = (arr[i] as number) + value;
}

function swap(arr: Float64Array, i: number, j: number) {
  const t = arr[i] as number;
  arr[i] = arr[j] as number;
  arr[j] = t;
}
