import type { ComponentDef } from '../types';

export const mcb3p: ComponentDef = {
  type: 'mcb3p',
  label: 'MCB 3 kutub',
  shortLabel: 'MCB 3P',
  group: 'protection',
  boards: ['installation', 'panel'],
  size: { w: 4, h: 4 },
  terminals: [
    { id: '1', x: 1, y: 0 },
    { id: '3', x: 2, y: 0 },
    { id: '5', x: 3, y: 0 },
    { id: '2', x: 1, y: 4 },
    { id: '4', x: 2, y: 4 },
    { id: '6', x: 3, y: 4 },
  ],
  initialState: { kind: 'mcb', closed: true, tripped: false },
};
