import { LAMP_WATTS, NOMINAL_VOLTS } from '../constants';
import { complex } from '../solver/complex';
import type { Behavior } from '../types';

/** Lampu sebagai resistor tetap: R = V² / P. */
const LAMP_ADMITTANCE = complex(LAMP_WATTS / NOMINAL_VOLTS ** 2, 0);

export const lampBehavior: Behavior = {
  elements: () => [{ a: 'L', b: 'N', admittance: LAMP_ADMITTANCE }],
};
