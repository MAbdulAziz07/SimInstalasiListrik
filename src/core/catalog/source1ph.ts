import type { ComponentDef } from '../types';

export const source1ph: ComponentDef = {
  type: 'source1ph',
  label: 'Sumber 1 fasa 230 V',
  shortLabel: 'Sumber',
  group: 'source',
  boards: ['installation'],
  size: { w: 4, h: 3 },
  terminals: [
    { id: 'L', x: 1, y: 3 },
    { id: 'N', x: 2, y: 3 },
    { id: 'PE', x: 3, y: 3 },
  ],
  initialState: { kind: 'source' },
};
