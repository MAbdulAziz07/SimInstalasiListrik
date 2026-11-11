import type { ComponentSettings, McbAmps } from '../types';

export const DEFAULT_MCB_AMPS: McbAmps = 10;

export function mcbAmpsOf(settings: ComponentSettings | undefined): McbAmps {
  return settings?.mcbAmps ?? DEFAULT_MCB_AMPS;
}
