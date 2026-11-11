import type { ComponentDef } from '../types';

export const twoWaySwitch: ComponentDef = {
  type: 'switch2way',
  label: 'Saklar tukar',
  shortLabel: 'Saklar tukar',
  group: 'lighting',
  boards: ['installation'],
  size: { w: 4, h: 3 },
  terminals: [
    { id: 'C', x: 2, y: 0 },
    { id: '1', x: 1, y: 3 },
    { id: '2', x: 3, y: 3 },
  ],
  initialState: { kind: 'switch2way', position: 1 },
};
