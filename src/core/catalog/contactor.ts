import type { CoilVolts, ComponentDef, ComponentSettings } from '../types';

export const DEFAULT_COIL_VOLTS: CoilVolts = 230;

export function coilVoltsOf(settings: ComponentSettings | undefined): CoilVolts {
  return settings?.coilVolts ?? DEFAULT_COIL_VOLTS;
}

/** Kontak utama 1-2, 3-4, 5-6; kontak bantu 13-14 (NO) dan 21-22 (NC); kumparan A1-A2. */
export const contactor: ComponentDef = {
  type: 'contactor',
  label: 'Kontaktor',
  shortLabel: 'Kontaktor',
  group: 'control',
  boards: ['panel'],
  size: { w: 6, h: 6 },
  terminals: [
    { id: '1', x: 1, y: 0 },
    { id: '3', x: 2, y: 0 },
    { id: '5', x: 3, y: 0 },
    { id: '13', x: 4, y: 0 },
    { id: '21', x: 5, y: 0 },
    { id: '2', x: 1, y: 6 },
    { id: '4', x: 2, y: 6 },
    { id: '6', x: 3, y: 6 },
    { id: '14', x: 4, y: 6 },
    { id: '22', x: 5, y: 6 },
    { id: 'A1', x: 0, y: 2 },
    { id: 'A2', x: 0, y: 4 },
  ],
  initialState: { kind: 'contactor', pulled: false, burnt: false },
};
