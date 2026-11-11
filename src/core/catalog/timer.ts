import type { ComponentDef, ComponentSettings } from '../types';

export const DEFAULT_TIMER_SECONDS = 5;

export function timerSecondsOf(settings: ComponentSettings | undefined): number {
  return settings?.timerSeconds ?? DEFAULT_TIMER_SECONDS;
}

/** Timer on-delay: kumparan A1-A2; kontak tukar 15 ke 16 (NC) dan 15 ke 18 (NO). */
export const timer: ComponentDef = {
  type: 'timer',
  label: 'Timer on-delay',
  shortLabel: 'Timer',
  group: 'control',
  boards: ['panel'],
  size: { w: 4, h: 6 },
  terminals: [
    { id: '15', x: 2, y: 0 },
    { id: '16', x: 1, y: 6 },
    { id: '18', x: 3, y: 6 },
    { id: 'A1', x: 0, y: 2 },
    { id: 'A2', x: 0, y: 4 },
  ],
  initialState: { kind: 'timer', elapsed: 0, done: false },
};
