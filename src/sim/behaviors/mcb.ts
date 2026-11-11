import { mcbAmpsOf } from '../../core/catalog/mcb';
import { MCB_INSTANT_TRIP_FACTOR } from '../constants';
import { abs } from '../solver/complex';
import { stateOf, type Behavior } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

export const mcbBehavior: Behavior = {
  elements: (state) =>
    stateOf(state, 'mcb').closed ? [{ a: '1', b: '2', admittance: CONTACT_ADMITTANCE }] : [],

  /** Trip seketika (magnetik) saat arus hubung singkat mengalir. */
  next: (state, reading, settings) => {
    const mcb = stateOf(state, 'mcb');
    const current = reading.elementCurrents[0];
    if (mcb.closed && current && abs(current) >= mcbAmpsOf(settings) * MCB_INSTANT_TRIP_FACTOR) {
      return { kind: 'mcb', closed: false, tripped: true };
    }
    return mcb;
  },
};
