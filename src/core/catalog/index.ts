import type { ComponentDef, ComponentType } from '../types';
import { contactor } from './contactor';
import { lamp } from './lamp';
import { mcb1p } from './mcb1p';
import { mcb3p } from './mcb3p';
import { motor } from './motor';
import { overloadRelay } from './overloadRelay';
import { panel, terminalBlock } from './panel';
import { pilotLamp } from './pilotLamp';
import { pushButtonNC, pushButtonNO } from './pushButton';
import { socket } from './socket';
import { source1ph } from './source1ph';
import { source3ph } from './source3ph';
import { switch1 } from './switch1';
import { timer } from './timer';
import { twoGangSwitch } from './twoGangSwitch';
import { twoWaySwitch } from './twoWaySwitch';

export const catalog: Record<ComponentType, ComponentDef> = {
  source1ph,
  mcb1p,
  switch1,
  switch2gang: twoGangSwitch,
  switch2way: twoWaySwitch,
  socket,
  lamp,
  panel,
  terminalBlock,
  source3ph,
  mcb3p,
  contactor,
  pushButtonNO,
  pushButtonNC,
  pilotLamp,
  motor,
  overloadRelay,
  timer,
};

export function getComponentDef(type: ComponentType): ComponentDef {
  return catalog[type];
}
