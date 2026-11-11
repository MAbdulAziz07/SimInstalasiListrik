import type { ComponentDef } from '../types';

export const lamp: ComponentDef = {
  type: 'lamp',
  label: 'Lampu',
  shortLabel: 'Lampu',
  group: 'lighting',
  boards: ['installation'],
  size: { w: 2, h: 3 },
  terminals: [
    { id: 'L', x: 0, y: 3 },
    { id: 'N', x: 2, y: 3 },
  ],
  initialState: { kind: 'lamp' },
};
