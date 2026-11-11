import { coilVoltsOf } from '../../core/catalog/contactor';
import { timerSecondsOf } from '../../core/catalog/timer';
import type { ComponentSettings, ComponentState } from '../../core/types';
import { COIL_PICKUP_RATIO } from '../constants';
import { abs, sub } from '../solver/complex';
import { stateOf, type Behavior, type Reading } from '../types';
import { coilAdmittance } from './contactor';
import { CONTACT_ADMITTANCE } from './switch';

const IDLE: ComponentState = { kind: 'timer', elapsed: 0, done: false };

/** Toleransi pembulatan saat membandingkan waktu berjalan dengan waktu tunda (detik). */
const EPSILON = 1e-6;

function energized(reading: Reading, settings: ComponentSettings): boolean {
  const volts = abs(sub(reading.voltageAt('A1'), reading.voltageAt('A2')));
  return volts >= coilVoltsOf(settings) * COIL_PICKUP_RATIO;
}

/**
 * Timer on-delay: mulai menghitung saat kumparan A1-A2 bertegangan. Setelah waktu tunda,
 * kontak 15 berpindah dari 16 ke 18. Begitu tegangan kumparan hilang, timer kembali ke awal.
 */
export const timerBehavior: Behavior = {
  elements: (state, settings) => {
    const { done } = stateOf(state, 'timer');
    return [
      { a: 'A1', b: 'A2', admittance: coilAdmittance(coilVoltsOf(settings)) },
      { a: '15', b: done ? '18' : '16', admittance: CONTACT_ADMITTANCE },
    ];
  },

  next: (state, reading, settings) => {
    const timer = stateOf(state, 'timer');
    if (energized(reading, settings)) return timer;
    return timer.elapsed === 0 && !timer.done ? timer : IDLE;
  },

  tick: (state, reading, settings, seconds) => {
    const timer = stateOf(state, 'timer');
    if (timer.done || !energized(reading, settings)) return timer;
    const delay = timerSecondsOf(settings);
    const elapsed = Math.round((timer.elapsed + seconds) * 1000) / 1000;
    return elapsed >= delay - EPSILON
      ? { kind: 'timer', elapsed: delay, done: true }
      : { kind: 'timer', elapsed, done: false };
  },
};
