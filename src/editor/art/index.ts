import type { ComponentType, Rotation } from '../../core/types';
import { ContactorArt } from './Contactor';
import { LampArt, SocketArt } from './Lighting';
import { Mcb1pArt, Mcb3pArt } from './Mcb';
import { OverloadRelayArt } from './OverloadRelay';
import { PanelArt, TerminalBlockArt } from './Panel';
import { PilotLampArt, PushButtonNCArt, PushButtonNOArt } from './PilotDevices';
import { MotorArt, Source1phArt, Source3phArt } from './Power';
import { Switch1Art, Switch2GangArt, Switch2WayArt } from './Switches';
import { TimerArt } from './Timer';
import type { Art } from './types';

/** Gambar piktorial tiap jenis komponen. */
const ART: Record<ComponentType, Art> = {
  mcb1p: Mcb1pArt,
  mcb3p: Mcb3pArt,
  overloadRelay: OverloadRelayArt,
  switch1: Switch1Art,
  switch2gang: Switch2GangArt,
  switch2way: Switch2WayArt,
  socket: SocketArt,
  lamp: LampArt,
  contactor: ContactorArt,
  pushButtonNO: PushButtonNOArt,
  pushButtonNC: PushButtonNCArt,
  pilotLamp: PilotLampArt,
  timer: TimerArt,
  motor: MotorArt,
  source1ph: Source1phArt,
  source3ph: Source3phArt,
  panel: PanelArt,
  terminalBlock: TerminalBlockArt,
};

export function artOf(type: ComponentType): Art {
  return ART[type];
}

/**
 * Transformasi SVG yang memutar gambar (digambar tidak diputar, berukuran w × h piksel)
 * searah jarum jam, sepadan dengan `rotatePoint` untuk letak terminal.
 */
export function artTransform(rotation: Rotation, w: number, h: number): string | undefined {
  switch (rotation) {
    case 0:
      return undefined;
    case 90:
      return `translate(${h} 0) rotate(90)`;
    case 180:
      return `translate(${w} ${h}) rotate(180)`;
    case 270:
      return `translate(0 ${w}) rotate(270)`;
  }
}
