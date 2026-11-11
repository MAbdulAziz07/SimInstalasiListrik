import { NOMINAL_VOLTS } from '../constants';
import { complex, ZERO } from '../solver/complex';
import type { Behavior } from '../types';

/** Sumber PLN 1 fasa: netral dan PE dibumikan di sisi sumber (acuan 0 V). */
export const source1phBehavior: Behavior = {
  fixed: () => [
    { terminal: 'L', voltage: complex(NOMINAL_VOLTS, 0) },
    { terminal: 'N', voltage: ZERO },
    { terminal: 'PE', voltage: ZERO },
  ],
  elements: () => [],
};
