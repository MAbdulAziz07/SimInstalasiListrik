import { stateOf, type Behavior } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

/** Saklar tukar: terminal C selalu tersambung ke salah satu dari terminal 1 atau 2. */
export const twoWaySwitchBehavior: Behavior = {
  elements: (state) => [
    {
      a: 'C',
      b: String(stateOf(state, 'switch2way').position),
      admittance: CONTACT_ADMITTANCE,
    },
  ],
};
