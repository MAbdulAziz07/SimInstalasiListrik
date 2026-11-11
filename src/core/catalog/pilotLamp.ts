import type { ComponentDef } from '../types';

export const pilotLamp: ComponentDef = {
  type: 'pilotLamp',
  label: 'Lampu indikator',
  shortLabel: 'Indikator',
  group: 'control',
  boards: ['installation', 'panel'],
  size: { w: 2, h: 3 },
  terminals: [
    { id: 'X1', x: 1, y: 0 },
    { id: 'X2', x: 1, y: 3 },
  ],
  initialState: { kind: 'lamp' },
};
