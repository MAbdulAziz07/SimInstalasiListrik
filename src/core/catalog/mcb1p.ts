import type { ComponentDef } from '../types';

export const mcb1p: ComponentDef = {
  type: 'mcb1p',
  label: 'MCB 1 kutub',
  shortLabel: 'MCB',
  group: 'protection',
  boards: ['installation', 'panel'],
  size: { w: 2, h: 4 },
  terminals: [
    { id: '1', x: 1, y: 0 },
    { id: '2', x: 1, y: 4 },
  ],
  initialState: { kind: 'mcb', closed: true, tripped: false },
};
