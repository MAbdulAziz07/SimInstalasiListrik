import type { ComponentDef } from '../types';

export const twoGangSwitch: ComponentDef = {
  type: 'switch2gang',
  label: 'Saklar seri',
  shortLabel: 'Saklar seri',
  group: 'lighting',
  boards: ['installation'],
  size: { w: 4, h: 3 },
  terminals: [
    { id: 'L', x: 2, y: 0 },
    { id: '1', x: 1, y: 3 },
    { id: '2', x: 3, y: 3 },
  ],
  initialState: { kind: 'switch2gang', closed1: false, closed2: false },
};
