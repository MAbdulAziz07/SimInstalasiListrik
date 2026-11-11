import { NOMINAL_VOLTS, PILOT_LAMP_WATTS } from '../constants';
import { complex } from '../solver/complex';
import type { Behavior } from '../types';

const ADMITTANCE = complex(PILOT_LAMP_WATTS / NOMINAL_VOLTS ** 2, 0);

/** Lampu indikator 230 V sebagai resistor tetap. */
export const pilotLampBehavior: Behavior = {
  elements: () => [{ a: 'X1', b: 'X2', admittance: ADMITTANCE }],
};
