import { catalog } from '../core/catalog';
import type { ComponentState, Project, TerminalRef } from '../core/types';
import { defaultBehaviors } from './behaviors';
import { allComponents, buildNetwork, terminalKey } from './network';
import { abs, sub, ZERO, type Complex } from './solver/complex';
import { solveNetwork } from './solver/nodal';
import type { Behaviors, ComponentStates, SimResult, Trip } from './types';

/** Batas putaran sebelum rangkaian dinyatakan berosilasi. */
export const MAX_ITERATIONS = 50;

export function initialStates(project: Project): ComponentStates {
  const states: ComponentStates = {};
  for (const component of allComponents(project)) {
    states[component.id] = catalog[component.type].initialState;
  }
  return states;
}

/**
 * Menghitung rangkaian bertegangan: selesaikan jaringan, biarkan tiap komponen
 * menentukan keadaan barunya, ulangi sampai tidak ada yang berubah.
 */
export function simulate(
  project: Project,
  inputStates: ComponentStates,
  behaviors: Behaviors = defaultBehaviors,
  maxIterations: number = MAX_ITERATIONS,
): SimResult {
  const components = allComponents(project);
  let states: ComponentStates = { ...initialStates(project), ...inputStates };
  const trips: Trip[] = [];
  const burns: string[] = [];

  for (let iteration = 1; ; iteration++) {
    const built = buildNetwork(project, states, behaviors);
    const solution = solveNetwork(built.network);

    const terminalVoltages: Record<string, Complex> = {};
    for (const [key, node] of built.nodeOf) {
      terminalVoltages[key] = solution.voltages[node] ?? ZERO;
    }
    const wireCurrents: Record<string, Complex> = {};
    for (const [wireId, branch] of built.wireBranch) {
      wireCurrents[wireId] = solution.currents[branch] ?? ZERO;
    }
    const elementCurrents: Record<string, Complex[]> = {};
    for (const [componentId, branches] of built.elementBranches) {
      elementCurrents[componentId] = branches.map((b) => solution.currents[b] ?? ZERO);
    }

    let changed = false;
    const nextStates: ComponentStates = {};
    for (const component of components) {
      const current = states[component.id] as ComponentState;
      const next =
        behaviors[component.type].next?.(
          current,
          {
            voltageAt: (terminal) => terminalVoltages[terminalKey(component.id, terminal)] ?? ZERO,
            elementCurrents: elementCurrents[component.id] ?? [],
          },
          component.settings ?? {},
        ) ?? current;
      nextStates[component.id] = next;
      if (!sameState(current, next)) changed = true;
      if (isBurnt(next) && !isBurnt(current)) burns.push(component.id);
      if (isTripped(next) && !isTripped(current)) {
        const amps = Math.max(0, ...(elementCurrents[component.id] ?? []).map(abs));
        trips.push({ componentId: component.id, amps });
      }
    }

    if (!changed || iteration >= maxIterations) {
      return {
        status: changed ? 'oscillating' : 'stable',
        iterations: iteration,
        states,
        terminalVoltages,
        wireCurrents,
        elementCurrents,
        trips,
        burns,
      };
    }
    states = nextStates;
  }
}

export function isTripped(state: ComponentState): boolean {
  return 'tripped' in state && state.tripped;
}

function isBurnt(state: ComponentState): boolean {
  return 'burnt' in state && state.burnt;
}

export function sameState(a: ComponentState, b: ComponentState): boolean {
  if (a === b) return true;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((k) => left[k] === right[k]);
}

/** Besar tegangan antara dua terminal (volt), seperti yang dibaca voltmeter. */
export function voltageBetween(result: SimResult, a: TerminalRef, b: TerminalRef): number {
  return abs(sub(voltageAt(result, a), voltageAt(result, b)));
}

function voltageAt(result: SimResult, ref: TerminalRef): Complex {
  const voltage = result.terminalVoltages[terminalKey(ref.componentId, ref.terminalId)];
  if (!voltage) {
    throw new Error(`Terminal "${ref.terminalId}" pada komponen "${ref.componentId}" tidak ada.`);
  }
  return voltage;
}

/** Arus sebuah kabel, positif dari ujung `from` ke `to`. */
export function currentIn(result: SimResult, wireId: string): Complex {
  const current = result.wireCurrents[wireId];
  if (!current) throw new Error(`Kabel "${wireId}" tidak ada.`);
  return current;
}
