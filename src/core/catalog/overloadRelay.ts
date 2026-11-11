import type { ComponentDef, ComponentSettings } from '../types';

export const DEFAULT_TOR_AMPS = 8;

export function torAmpsOf(settings: ComponentSettings | undefined): number {
  return settings?.torAmps ?? DEFAULT_TOR_AMPS;
}

/** TOR: jalur utama 1-2, 3-4, 5-6; kontak bantu 95-96 (NC) dan 97-98 (NO). */
export const overloadRelay: ComponentDef = {
  type: 'overloadRelay',
  label: 'TOR (thermal overload relay)',
  shortLabel: 'TOR',
  group: 'protection',
  boards: ['panel'],
  size: { w: 6, h: 5 },
  terminals: [
    { id: '1', x: 1, y: 0 },
    { id: '3', x: 2, y: 0 },
    { id: '5', x: 3, y: 0 },
    { id: '95', x: 4, y: 0 },
    { id: '97', x: 5, y: 0 },
    { id: '2', x: 1, y: 5 },
    { id: '4', x: 2, y: 5 },
    { id: '6', x: 3, y: 5 },
    { id: '96', x: 4, y: 5 },
    { id: '98', x: 5, y: 5 },
  ],
  initialState: { kind: 'overload', tripped: false, heat: 0, cause: null },
};
