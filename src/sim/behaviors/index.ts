import type { Behaviors } from '../types';
import { contactorBehavior } from './contactor';
import { lampBehavior } from './lamp';
import { mcbBehavior } from './mcb';
import { mcb3pBehavior } from './mcb3p';
import { motorBehavior } from './motor';
import { overloadRelayBehavior } from './overloadRelay';
import { passiveBehavior } from './passive';
import { pilotLampBehavior } from './pilotLamp';
import { pushButtonNCBehavior, pushButtonNOBehavior } from './pushButton';
import { socketBehavior } from './socket';
import { source1phBehavior } from './source1ph';
import { source3phBehavior } from './source3ph';
import { switchBehavior } from './switch';
import { timerBehavior } from './timer';
import { twoGangSwitchBehavior } from './twoGangSwitch';
import { twoWaySwitchBehavior } from './twoWaySwitch';

export const defaultBehaviors: Behaviors = {
  source1ph: source1phBehavior,
  mcb1p: mcbBehavior,
  switch1: switchBehavior,
  switch2gang: twoGangSwitchBehavior,
  switch2way: twoWaySwitchBehavior,
  socket: socketBehavior,
  lamp: lampBehavior,
  panel: passiveBehavior,
  terminalBlock: passiveBehavior,
  source3ph: source3phBehavior,
  mcb3p: mcb3pBehavior,
  contactor: contactorBehavior,
  pushButtonNO: pushButtonNOBehavior,
  pushButtonNC: pushButtonNCBehavior,
  pilotLamp: pilotLampBehavior,
  motor: motorBehavior,
  overloadRelay: overloadRelayBehavior,
  timer: timerBehavior,
};
