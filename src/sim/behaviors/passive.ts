import type { Behavior } from '../types';

/** Panel listrik dan terminal blok: hanya titik sambung, tanpa jalur arus di dalamnya. */
export const passiveBehavior: Behavior = {
  elements: () => [],
};
