import type { ComponentDef } from '../types';

export const switch1: ComponentDef = {
  type: 'switch1',
  label: 'Saklar tunggal',
  shortLabel: 'Saklar',
  group: 'lighting',
  boards: ['installation'],
  size: { w: 2, h: 3 },
  terminals: [
    { id: 'L', x: 1, y: 0 },
    { id: '1', x: 1, y: 3 },
  ],
  initialState: { kind: 'switch', closed: false },
};
