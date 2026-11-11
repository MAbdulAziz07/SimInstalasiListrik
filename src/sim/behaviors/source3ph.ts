import { NOMINAL_VOLTS } from '../constants';
import { fromPolar, ZERO } from '../solver/complex';
import type { Behavior } from '../types';

/** Sumber PLN 3 fasa: L1 0°, L2 −120°, L3 +120°, 230 V ke netral; netral dan PE dibumikan. */
export const source3phBehavior: Behavior = {
  fixed: () => [
    { terminal: 'L1', voltage: fromPolar(NOMINAL_VOLTS, 0) },
    { terminal: 'L2', voltage: fromPolar(NOMINAL_VOLTS, -120) },
    { terminal: 'L3', voltage: fromPolar(NOMINAL_VOLTS, 120) },
    { terminal: 'N', voltage: ZERO },
    { terminal: 'PE', voltage: ZERO },
  ],
  elements: () => [],
};
