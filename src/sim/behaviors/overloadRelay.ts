import { torAmpsOf } from '../../core/catalog/overloadRelay';
import {
  TOR_COOL_SECONDS,
  TOR_MIN_LOAD_RATIO,
  TOR_OVERLOAD_SECONDS,
  TOR_PHASE_LOSS_RATIO,
  TOR_PHASE_LOSS_SECONDS,
  TOR_PICKUP_RATIO,
} from '../constants';
import { abs } from '../solver/complex';
import { stateOf, type Behavior, type Element } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

const POLES = [
  ['1', '2'],
  ['3', '4'],
  ['5', '6'],
] as const;

/**
 * TOR: arus motor lewat tiga jalur utamanya dan memanaskan bimetal. Trip membuka 95-96 dan
 * menutup 97-98; jalur utama sendiri tidak pernah diputus, jadi 95-96 harus dipasang seri
 * dengan kumparan kontaktor. Seperti TOR sungguhan, ia juga peka terhadap kehilangan fasa.
 */
export const overloadRelayBehavior: Behavior = {
  elements: (state) => {
    const { tripped } = stateOf(state, 'overload');
    const elements: Element[] = POLES.map(([a, b]) => ({ a, b, admittance: CONTACT_ADMITTANCE }));
    elements.push(
      tripped
        ? { a: '97', b: '98', admittance: CONTACT_ADMITTANCE }
        : { a: '95', b: '96', admittance: CONTACT_ADMITTANCE },
    );
    return elements;
  },

  tick: (state, reading, settings, seconds) => {
    const relay = stateOf(state, 'overload');
    if (relay.tripped) return relay;

    const setting = torAmpsOf(settings);
    const currents = reading.elementCurrents.slice(0, POLES.length).map(abs);
    const highest = Math.max(0, ...currents);
    const lowest = Math.min(...currents);

    let cause: typeof relay.cause = null;
    let rate = -1 / TOR_COOL_SECONDS;
    if (highest > setting * TOR_PICKUP_RATIO) {
      cause = 'overload';
      rate = (highest / setting) ** 2 / TOR_OVERLOAD_SECONDS;
    }
    if (highest >= setting * TOR_MIN_LOAD_RATIO && lowest < highest * TOR_PHASE_LOSS_RATIO) {
      const phaseLossRate = 1 / TOR_PHASE_LOSS_SECONDS;
      if (phaseLossRate > rate) {
        cause = 'phaseLoss';
        rate = phaseLossRate;
      }
    }

    const heat = Math.min(1, Math.max(0, relay.heat + rate * seconds));
    if (heat >= 1) return { kind: 'overload', tripped: true, heat: 1, cause };
    return heat === relay.heat ? relay : { ...relay, heat };
  },
};
