import { stateOf, type Behavior } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

/** Push button NO: kontak 3-4 menutup selama ditekan. */
export const pushButtonNOBehavior: Behavior = {
  elements: (state) =>
    stateOf(state, 'pushButton').pressed
      ? [{ a: '3', b: '4', admittance: CONTACT_ADMITTANCE }]
      : [],
};

/** Push button NC: kontak 1-2 membuka selama ditekan. */
export const pushButtonNCBehavior: Behavior = {
  elements: (state) =>
    stateOf(state, 'pushButton').pressed
      ? []
      : [{ a: '1', b: '2', admittance: CONTACT_ADMITTANCE }],
};
