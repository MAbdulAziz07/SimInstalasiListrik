import { coilVoltsOf } from '../../core/catalog/contactor';
import { COIL_BURN_RATIO, COIL_PICKUP_RATIO, COIL_POWER_FACTOR, COIL_VA } from '../constants';
import { abs, complex, inverse, sub } from '../solver/complex';
import { stateOf, type Behavior, type Element } from '../types';
import { CONTACT_ADMITTANCE } from './switch';

/** Kontak yang menutup saat kontaktor menarik. */
const NORMALLY_OPEN = [
  ['1', '2'],
  ['3', '4'],
  ['5', '6'],
  ['13', '14'],
] as const;
/** Kontak yang membuka saat kontaktor menarik. */
const NORMALLY_CLOSED = [['21', '22']] as const;

/** Kumparan sebagai impedansi R + jX dengan daya semu `COIL_VA` pada tegangan kerjanya. */
export function coilAdmittance(coilVolts: number) {
  const ohms = coilVolts ** 2 / COIL_VA;
  const reactive = Math.sqrt(1 - COIL_POWER_FACTOR ** 2);
  return inverse(complex(ohms * COIL_POWER_FACTOR, ohms * reactive));
}

export const contactorBehavior: Behavior = {
  elements: (state, settings) => {
    const { pulled, burnt } = stateOf(state, 'contactor');
    const elements: Element[] = [];
    // Kumparan yang terbakar putus: tidak ada arus dan kontak kembali ke posisi lepas.
    if (!burnt) {
      elements.push({ a: 'A1', b: 'A2', admittance: coilAdmittance(coilVoltsOf(settings)) });
    }
    for (const [a, b] of pulled && !burnt ? NORMALLY_OPEN : NORMALLY_CLOSED) {
      elements.push({ a, b, admittance: CONTACT_ADMITTANCE });
    }
    return elements;
  },

  next: (state, reading, settings) => {
    const contactor = stateOf(state, 'contactor');
    if (contactor.burnt) return contactor;
    const rated = coilVoltsOf(settings);
    const volts = abs(sub(reading.voltageAt('A1'), reading.voltageAt('A2')));
    if (volts > rated * COIL_BURN_RATIO) return { kind: 'contactor', pulled: false, burnt: true };
    const pulled = volts >= rated * COIL_PICKUP_RATIO;
    return pulled === contactor.pulled ? contactor : { ...contactor, pulled };
  },
};
