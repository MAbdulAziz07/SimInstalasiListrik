import { bench, describe } from 'vitest';
import bigRaw from '../../tests/fixtures/papan-besar.json?raw';
import starDeltaRaw from '../../tests/fixtures/star-delta.json?raw';
import { parseProject } from '../core/serialize';
import type { Project } from '../core/types';
import { advance, TICK_SECONDS } from './clock';
import { simulate } from './simulate';

function load(raw: string): Project {
  const result = parseProject(raw);
  if (!result.ok) throw new Error(result.error);
  return result.project;
}

const pressed = (value: boolean) => ({ kind: 'pushButton', pressed: value }) as const;

// Jalankan dengan `npm run bench`.
describe('papan besar (40 komponen, 142 kabel)', () => {
  const project = load(bigRaw);
  let running = simulate(project, {});
  for (const unit of [1, 2, 3, 4]) {
    for (const value of [true, false]) {
      running = simulate(project, { ...running.states, [`start${unit}`]: pressed(value) });
    }
  }

  bench('beri tegangan', () => {
    simulate(project, {});
  });

  bench('tekan START motor kelima', () => {
    simulate(project, { ...running.states, start5: pressed(true) });
  });

  bench('satu detak waktu', () => {
    advance(project, running, TICK_SECONDS);
  });
});

describe('star-delta', () => {
  const project = load(starDeltaRaw);

  bench('tekan START', () => {
    simulate(project, { start: pressed(true) });
  });
});
