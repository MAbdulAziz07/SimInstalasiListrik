import type { ComponentDef, ComponentSettings, ComponentType, Shape } from '../types';

export const X1_MIN = 2;
export const X1_MAX = 24;
export const X1_DEFAULT = 8;
/** Panjang maksimum label sebuah terminal X1. */
export const X1_LABEL_MAX = 6;

const DEFAULT_SETTINGS: ComponentSettings = { x1Labels: Array<string>(X1_DEFAULT).fill('') };

/** Panel listrik dan terminal bloknya berbagi terminal X1 bernomor sama. */
export function isX1Type(type: ComponentType): boolean {
  return type === 'panel' || type === 'terminalBlock';
}

export function x1Labels(settings: ComponentSettings | undefined): string[] {
  return settings?.x1Labels ?? (DEFAULT_SETTINGS.x1Labels as string[]);
}

/** Terminal X1 bernomor 1..n, berjajar mendatar pada ketinggian `y`. */
function x1Terminals(count: number, y: number) {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), x: i + 1, y }));
}

/** Kotak panel di papan Instalasi: terminal X1 di sisi bawah. */
function panelShape(settings: ComponentSettings): Shape {
  const count = x1Labels(settings).length;
  return { size: { w: Math.max(6, count + 1), h: 5 }, terminals: x1Terminals(count, 5) };
}

/** Deretan terminal blok di papan Dalam Panel: terminal di sisi atas. */
function blockShape(settings: ComponentSettings): Shape {
  const count = x1Labels(settings).length;
  return { size: { w: count + 1, h: 2 }, terminals: x1Terminals(count, 0) };
}

export const panel: ComponentDef = {
  type: 'panel',
  label: 'Panel listrik',
  shortLabel: 'Panel listrik',
  group: 'panel',
  boards: ['installation'],
  ...panelShape(DEFAULT_SETTINGS),
  initialState: { kind: 'none' },
  shape: panelShape,
  defaultSettings: DEFAULT_SETTINGS,
};

export const terminalBlock: ComponentDef = {
  type: 'terminalBlock',
  label: 'Terminal blok X1',
  shortLabel: 'X1',
  group: 'panel',
  boards: ['panel'],
  ...blockShape(DEFAULT_SETTINGS),
  initialState: { kind: 'none' },
  shape: blockShape,
  defaultSettings: DEFAULT_SETTINGS,
  managed: true,
};
