import type { ComponentState } from '../core/types';
import { catalog } from '../core/catalog';
import type { Project } from '../core/types';
import { defaultBehaviors } from './behaviors';
import { allComponents, terminalKey } from './network';
import { isTripped, sameState, simulate } from './simulate';
import { abs, ZERO } from './solver/complex';
import type { Behaviors, ComponentStates, SimResult, Trip } from './types';

/** Selang detak waktu simulasi di aplikasi (detik). */
export const TICK_SECONDS = 0.2;

/**
 * Memajukan waktu simulasi `seconds` detik: komponen yang bergantung waktu (TOR, timer)
 * memperbarui keadaannya dari hasil terakhir, lalu rangkaian dihitung ulang. Bila tidak ada
 * yang berubah, hasil yang sama dikembalikan apa adanya.
 */
export function advance(
  project: Project,
  result: SimResult,
  seconds: number,
  behaviors: Behaviors = defaultBehaviors,
): SimResult {
  const states: ComponentStates = { ...result.states };
  const trips: Trip[] = [];
  let changed = false;

  for (const component of allComponents(project)) {
    const tick = behaviors[component.type].tick;
    if (!tick) continue;
    const current: ComponentState =
      result.states[component.id] ?? catalog[component.type].initialState;
    const elementCurrents = result.elementCurrents[component.id] ?? [];
    const next = tick(
      current,
      {
        voltageAt: (terminal) =>
          result.terminalVoltages[terminalKey(component.id, terminal)] ?? ZERO,
        elementCurrents,
      },
      component.settings ?? {},
      seconds,
    );
    if (sameState(current, next)) continue;
    changed = true;
    states[component.id] = next;
    if (isTripped(next) && !isTripped(current)) {
      trips.push({ componentId: component.id, amps: Math.max(0, ...elementCurrents.map(abs)) });
    }
  }

  if (!changed) return result;
  const next = simulate(project, states, behaviors);
  return { ...next, trips: [...trips, ...next.trips] };
}
