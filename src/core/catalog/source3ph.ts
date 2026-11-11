import type { ComponentDef } from '../types';

export const source3ph: ComponentDef = {
  type: 'source3ph',
  label: 'Sumber 3 fasa 400/230 V',
  shortLabel: 'Sumber 3 fasa',
  group: 'source',
  boards: ['installation'],
  size: { w: 6, h: 3 },
  terminals: [
    { id: 'L1', x: 1, y: 3 },
    { id: 'L2', x: 2, y: 3 },
    { id: 'L3', x: 3, y: 3 },
    { id: 'N', x: 4, y: 3 },
    { id: 'PE', x: 5, y: 3 },
  ],
  initialState: { kind: 'source' },
};
