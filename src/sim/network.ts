import { catalog } from '../core/catalog';
import { isX1Type } from '../core/catalog/panel';
import { shapeOf } from '../core/geometry';
import { BOARD_IDS, type PlacedComponent, type Project, type Wire } from '../core/types';
import { WIRE_OHMS } from './constants';
import { complex } from './solver/complex';
import type { Network } from './solver/nodal';
import type { Behaviors, ComponentStates } from './types';

const WIRE_ADMITTANCE = complex(1 / WIRE_OHMS, 0);

export function terminalKey(componentId: string, terminalId: string): string {
  return `${componentId}:${terminalId}`;
}

export function allComponents(project: Project): PlacedComponent[] {
  return BOARD_IDS.flatMap((id) => project.boards[id].components);
}

export function allWires(project: Project): Wire[] {
  return BOARD_IDS.flatMap((id) => project.boards[id].wires);
}

export interface BuiltNetwork {
  network: Network;
  /** Nomor simpul tiap terminal; kunci dari `terminalKey`. */
  nodeOf: Map<string, number>;
  /** Nomor cabang tiap kabel; kunci id kabel. */
  wireBranch: Map<string, number>;
  /** Nomor cabang tiap elemen komponen, berurutan seperti `elements`; kunci id komponen. */
  elementBranches: Map<string, number[]>;
}

/**
 * Menggabungkan kedua papan menjadi satu jaringan listrik: tiap terminal satu simpul,
 * tiap kabel dan tiap elemen komponen satu cabang.
 */
export function buildNetwork(
  project: Project,
  states: ComponentStates,
  behaviors: Behaviors,
): BuiltNetwork {
  const components = allComponents(project);
  const network: Network = { nodeCount: 0, fixed: [], branches: [] };
  const nodeOf = new Map<string, number>();
  const wireBranch = new Map<string, number>();
  const elementBranches = new Map<string, number[]>();

  // Terminal X1 bernomor sama pada kotak panel (papan Instalasi) dan pada terminal blok
  // (papan Dalam Panel) adalah satu simpul: di situlah kedua papan bertemu.
  const x1Nodes = new Map<string, number>();
  for (const component of components) {
    const shared = isX1Type(component.type);
    for (const terminal of shapeOf(component).terminals) {
      let index = shared ? x1Nodes.get(terminal.id) : undefined;
      if (index === undefined) {
        index = network.nodeCount++;
        if (shared) x1Nodes.set(terminal.id, index);
      }
      nodeOf.set(terminalKey(component.id, terminal.id), index);
    }
  }

  const node = (componentId: string, terminalId: string): number => {
    const found = nodeOf.get(terminalKey(componentId, terminalId));
    if (found === undefined) {
      throw new Error(`Terminal "${terminalId}" pada komponen "${componentId}" tidak ada.`);
    }
    return found;
  };

  for (const component of components) {
    const behavior = behaviors[component.type];
    const state = states[component.id] ?? catalog[component.type].initialState;

    for (const fixed of behavior.fixed?.(state) ?? []) {
      network.fixed.push({ node: node(component.id, fixed.terminal), voltage: fixed.voltage });
    }
    elementBranches.set(
      component.id,
      behavior.elements(state, component.settings ?? {}).map((element) => {
        network.branches.push({
          a: node(component.id, element.a),
          b: node(component.id, element.b),
          admittance: element.admittance,
        });
        return network.branches.length - 1;
      }),
    );
  }

  for (const wire of allWires(project)) {
    network.branches.push({
      a: node(wire.from.componentId, wire.from.terminalId),
      b: node(wire.to.componentId, wire.to.terminalId),
      admittance: WIRE_ADMITTANCE,
    });
    wireBranch.set(wire.id, network.branches.length - 1);
  }

  return { network, nodeOf, wireBranch, elementBranches };
}
