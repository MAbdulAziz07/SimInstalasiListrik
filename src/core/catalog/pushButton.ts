import type { ComponentDef } from '../types';

/** Tombol tekan sesaat, kontak 3-4 menutup selama ditekan. */
export const pushButtonNO: ComponentDef = {
  type: 'pushButtonNO',
  label: 'Push button NO',
  shortLabel: 'PB NO',
  group: 'control',
  boards: ['installation', 'panel'],
  size: { w: 2, h: 3 },
  terminals: [
    { id: '3', x: 1, y: 0 },
    { id: '4', x: 1, y: 3 },
  ],
  initialState: { kind: 'pushButton', pressed: false },
};

/** Tombol tekan sesaat, kontak 1-2 membuka selama ditekan. */
export const pushButtonNC: ComponentDef = {
  type: 'pushButtonNC',
  label: 'Push button NC',
  shortLabel: 'PB NC',
  group: 'control',
  boards: ['installation', 'panel'],
  size: { w: 2, h: 3 },
  terminals: [
    { id: '1', x: 1, y: 0 },
    { id: '2', x: 1, y: 3 },
  ],
  initialState: { kind: 'pushButton', pressed: false },
};
