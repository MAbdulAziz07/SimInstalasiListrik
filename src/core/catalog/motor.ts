import type { ComponentDef } from '../types';

/**
 * Motor induksi 3 fasa 6 terminal. Susunan kotak terminal seperti motor asli: U1 V1 W1 di atas,
 * W2 U2 V2 di bawah, sehingga hubungan segitiga dibuat dengan tiga jembatan tegak dan hubungan
 * bintang dengan menjembatani W2-U2-V2.
 */
export const motor: ComponentDef = {
  type: 'motor',
  label: 'Motor 3 fasa',
  shortLabel: 'Motor 3~',
  group: 'load',
  boards: ['installation'],
  size: { w: 6, h: 6 },
  terminals: [
    { id: 'U1', x: 1, y: 0 },
    { id: 'V1', x: 3, y: 0 },
    { id: 'W1', x: 5, y: 0 },
    { id: 'W2', x: 1, y: 6 },
    { id: 'U2', x: 3, y: 6 },
    { id: 'V2', x: 5, y: 6 },
  ],
  initialState: { kind: 'motor', mode: 'stopped', direction: 'cw' },
};
