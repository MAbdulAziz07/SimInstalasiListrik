import type { Project, TerminalRef } from '../core/types';
import { defaultBehaviors } from './behaviors';
import { buildNetwork, terminalKey } from './network';
import { abs, add, complex, inverse, sub, ZERO, type Complex } from './solver/complex';
import { solveNetwork } from './solver/nodal';
import type { Behaviors, ComponentStates, Element } from './types';

/** Resistansi (ohm) mulai dari sini dianggap putus (tak terhingga). */
export const OPEN_OHMS = 1e6;

/** Tegangan uji ohmmeter (volt); nilainya tidak memengaruhi hasil. */
const TEST_VOLTS = 1;

/** Elemen seperti yang dilihat ohmmeter (arus searah): hanya bagian resistifnya. */
function directCurrent(element: Element): Element {
  const impedance = inverse(element.admittance);
  const ohms = impedance.re > 0 ? impedance.re : abs(impedance);
  return { ...element, admittance: complex(1 / ohms, 0) };
}

/** Perilaku komponen saat rangkaian mati: sumber tidak memberi tegangan. */
function unpowered(behaviors: Behaviors): Behaviors {
  const result = {} as Behaviors;
  for (const type of Object.keys(behaviors) as (keyof Behaviors)[]) {
    const behavior = behaviors[type];
    result[type] = {
      elements: (state, settings) => behavior.elements(state, settings).map(directCurrent),
    };
  }
  return result;
}

/**
 * Resistansi antara dua terminal pada rangkaian yang tidak bertegangan, seperti yang dibaca
 * ohmmeter: tegangan uji dipasang di antara keduanya dan arusnya diukur. Mengembalikan
 * `Infinity` bila tidak ada jalur (putus).
 */
export function resistanceBetween(
  project: Project,
  states: ComponentStates,
  a: TerminalRef,
  b: TerminalRef,
  behaviors: Behaviors = defaultBehaviors,
): number {
  const built = buildNetwork(project, states, unpowered(behaviors));
  const nodeOf = (ref: TerminalRef): number => {
    const node = built.nodeOf.get(terminalKey(ref.componentId, ref.terminalId));
    if (node === undefined) {
      throw new Error(`Terminal "${ref.terminalId}" pada komponen "${ref.componentId}" tidak ada.`);
    }
    return node;
  };
  const from = nodeOf(a);
  const to = nodeOf(b);
  if (from === to) return 0;

  built.network.fixed.push(
    { node: from, voltage: complex(TEST_VOLTS, 0) },
    { node: to, voltage: ZERO },
  );
  const solution = solveNetwork(built.network);

  // Arus yang keluar dari simpul uji lewat semua cabangnya.
  let current: Complex = ZERO;
  built.network.branches.forEach((branch, index) => {
    const flow = solution.currents[index] ?? ZERO;
    if (branch.a === from) current = add(current, flow);
    else if (branch.b === from) current = sub(current, flow);
  });

  const amps = abs(current);
  const ohms = amps > 0 ? TEST_VOLTS / amps : Infinity;
  return ohms >= OPEN_OHMS ? Infinity : ohms;
}
