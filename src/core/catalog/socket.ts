import type { ComponentDef } from '../types';

export const socket: ComponentDef = {
  type: 'socket',
  label: 'Stop kontak',
  shortLabel: 'Stop kontak',
  group: 'lighting',
  boards: ['installation'],
  size: { w: 4, h: 3 },
  terminals: [
    { id: 'L', x: 1, y: 3 },
    { id: 'N', x: 2, y: 3 },
    { id: 'PE', x: 3, y: 3 },
  ],
  initialState: { kind: 'socket' },
};
