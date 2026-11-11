import { mcbAmpsOf } from '../../core/catalog/mcb';
import { MCB_INSTANT_TRIP_FACTOR } from '../constants';
import { abs } from '../solver/complex';
import { stateOf, type Behavior } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

const POLES = [
  ['1', '2'],
  ['3', '4'],
  ['5', '6'],
] as const;

/** MCB 3 kutub: ketiga kutub membuka bersama bila salah satunya dilalui arus hubung singkat. */
export const mcb3pBehavior: Behavior = {
  elements: (state) =>
    stateOf(state, 'mcb').closed
      ? POLES.map(([a, b]) => ({ a, b, admittance: CONTACT_ADMITTANCE }))
      : [],

  next: (state, reading, settings) => {
    const mcb = stateOf(state, 'mcb');
    const limit = mcbAmpsOf(settings) * MCB_INSTANT_TRIP_FACTOR;
    if (mcb.closed && reading.elementCurrents.some((i) => abs(i) >= limit)) {
      return { kind: 'mcb', closed: false, tripped: true };
    }
    return mcb;
  },
};
