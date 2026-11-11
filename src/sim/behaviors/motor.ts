import {
  MOTOR_IDLE_VOLTS,
  MOTOR_MAX_UNBALANCE,
  MOTOR_POWER_FACTOR,
  MOTOR_RUN_VOLTS,
  MOTOR_WINDING_OHMS,
} from '../constants';
import { abs, add, complex, fromPolar, inverse, mul, scale, sub } from '../solver/complex';
import { stateOf, type Behavior } from '../types';

const WINDINGS = [
  ['U1', 'U2'],
  ['V1', 'V2'],
  ['W1', 'W2'],
] as const;

const WINDING_ADMITTANCE = inverse(
  complex(
    MOTOR_WINDING_OHMS * MOTOR_POWER_FACTOR,
    MOTOR_WINDING_OHMS * Math.sqrt(1 - MOTOR_POWER_FACTOR ** 2),
  ),
);

const A = fromPolar(1, 120);
const A2 = fromPolar(1, -120);

/**
 * Motor sebagai tiga belitan berimpedansi tetap. Putar, arah, dan dengung ditentukan dari
 * tegangan ketiga belitan lewat komponen simetris: urutan positif memutar ke kanan, urutan
 * negatif ke kiri, dan bila keduanya hampir sama besar medan putar tidak terbentuk.
 */
export const motorBehavior: Behavior = {
  elements: () => WINDINGS.map(([a, b]) => ({ a, b, admittance: WINDING_ADMITTANCE })),

  next: (state, reading) => {
    const motor = stateOf(state, 'motor');
    const [u, v, w] = WINDINGS.map(([a, b]) => sub(reading.voltageAt(a), reading.voltageAt(b)));
    if (!u || !v || !w) return motor;

    const positive = abs(scale(add(add(u, mul(A, v)), mul(A2, w)), 1 / 3));
    const negative = abs(scale(add(add(u, mul(A2, v)), mul(A, w)), 1 / 3));
    const dominant = Math.max(positive, negative);
    const opposing = Math.min(positive, negative);

    let mode: typeof motor.mode = 'stopped';
    if (dominant >= MOTOR_RUN_VOLTS && opposing <= dominant * MOTOR_MAX_UNBALANCE) {
      mode = 'running';
    } else if (Math.max(abs(u), abs(v), abs(w)) > MOTOR_IDLE_VOLTS) {
      mode = 'humming';
    }
    const direction = mode === 'running' ? (positive >= negative ? 'cw' : 'ccw') : motor.direction;
    return mode === motor.mode && direction === motor.direction
      ? motor
      : { kind: 'motor', mode, direction };
  },
};
