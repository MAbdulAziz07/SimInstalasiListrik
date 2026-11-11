import { stateOf, type Behavior, type Element } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

/** Saklar seri: terminal L disambung ke 1 dan ke 2 oleh tuas masing-masing. */
export const twoGangSwitchBehavior: Behavior = {
  elements: (state) => {
    const { closed1, closed2 } = stateOf(state, 'switch2gang');
    const elements: Element[] = [];
    if (closed1) elements.push({ a: 'L', b: '1', admittance: CONTACT_ADMITTANCE });
    if (closed2) elements.push({ a: 'L', b: '2', admittance: CONTACT_ADMITTANCE });
    return elements;
  },
};
