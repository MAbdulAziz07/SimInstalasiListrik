import { CONTACT_OHMS } from '../constants';
import { complex } from '../solver/complex';
import { stateOf, type Behavior } from '../types';

export const CONTACT_ADMITTANCE = complex(1 / CONTACT_OHMS, 0);

export const switchBehavior: Behavior = {
  elements: (state) =>
    stateOf(state, 'switch').closed ? [{ a: 'L', b: '1', admittance: CONTACT_ADMITTANCE }] : [],
};
