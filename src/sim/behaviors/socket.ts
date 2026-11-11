import type { Behavior } from '../types';

/** Stop kontak tanpa beban tertancap: tidak ada jalur arus di antara terminalnya. */
export const socketBehavior: Behavior = {
  elements: () => [],
};
