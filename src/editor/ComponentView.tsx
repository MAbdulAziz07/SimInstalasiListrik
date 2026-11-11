import type { PointerEvent } from 'react';
import { catalog } from '../core/catalog';
import { placedTerminals, rotatedSizeOf, shapeOf, terminalCaption } from '../core/geometry';
import type { ComponentState, PlacedComponent } from '../core/types';
import { artOf, artTransform } from './art';
import { MotorView } from './MotorView';
import { lampLevel, motorText } from './simView';
import { GRID } from './store';

interface Props {
  component: PlacedComponent;
  selected?: boolean;
  /** Bayangan komponen yang sedang diseret dari palet. */
  ghost?: boolean;
  onPointerDown?: (event: PointerEvent<SVGGElement>) => void;
  onSelect?: () => void;
  /** Posisi saklar, tuas MCB, tombol, atau kontaktor yang digambar. */
  state?: ComponentState;
  /** Daya lampu dibanding nominalnya (0–1); hanya diisi saat papan bertegangan. */
  brightness?: number;
  /** Diisi saat bertegangan untuk komponen yang bisa dioperasikan; `part` = nomor tuas. */
  onOperate?: (part: number) => void;
  /** Diisi saat bertegangan untuk push button: ditekan selama ditahan. */
  momentary?: { onPress(): void; onRelease(): void };
  onDoubleClick?: () => void;
}

interface Lever {
  text: string;
  tone: 'on' | 'off' | 'trip' | 'position';
}

const onOff = (closed: boolean): Lever => ({
  text: closed ? 'ON' : 'OFF',
  tone: closed ? 'on' : 'off',
});

/** Tuas yang digambar pada komponen; kosong untuk komponen tanpa tuas. */
function leversOf(state: ComponentState | undefined): Lever[] {
  switch (state?.kind) {
    case 'switch':
      return [onOff(state.closed)];
    case 'mcb':
      return [state.tripped ? { text: 'TRIP', tone: 'trip' } : onOff(state.closed)];
    case 'switch2gang':
      return [onOff(state.closed1), onOff(state.closed2)];
    case 'switch2way':
      return [{ text: `POS ${state.position}`, tone: 'position' }];
    case 'contactor':
      return [state.burnt ? { text: 'TERBAKAR', tone: 'trip' } : onOff(state.pulled)];
    case 'overload':
      if (state.tripped) return [{ text: 'TRIP', tone: 'trip' }];
      return state.heat > 0
        ? [{ text: `PANAS ${Math.round(state.heat * 100)}%`, tone: 'position' }]
        : [{ text: 'NORMAL', tone: 'off' }];
    case 'timer':
      if (state.done) return [{ text: 'ON', tone: 'on' }];
      return state.elapsed > 0
        ? [{ text: `${state.elapsed.toFixed(1).replace('.', ',')} s`, tone: 'position' }]
        : [{ text: 'OFF', tone: 'off' }];
    case 'pushButton':
      return [{ text: state.pressed ? 'DITEKAN' : 'LEPAS', tone: state.pressed ? 'on' : 'off' }];
    default:
      return [];
  }
}

const LABEL_OFFSET = 11;

function isActivation(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

/**
 * Badan komponen: gambar piktorial (lihat `art/`) dengan nama terminal di atasnya. Titik
 * terminalnya digambar terpisah di atas kabel (lihat Board).
 */
export function ComponentView({
  component,
  selected,
  ghost,
  onPointerDown,
  onSelect,
  state,
  brightness,
  onOperate,
  momentary,
  onDoubleClick,
}: Props) {
  const def = catalog[component.type];
  const size = rotatedSizeOf(component);
  const width = size.w * GRID;
  const height = size.h * GRID;

  const Art = artOf(component.type);
  const artSize = shapeOf(component).size;
  const levers = ghost ? [] : leversOf(state);
  const single = levers.length === 1 ? levers[0] : undefined;
  /** Komponen bertuas satu dioperasikan dengan mengklik badannya. */
  const operateWhole = onOperate && single;
  const burnt = single?.text === 'TERBAKAR';
  const motor = !ghost && state?.kind === 'motor' ? state : undefined;

  const classes = ['component'];
  if (selected) classes.push('selected');
  if (ghost) classes.push('ghost');
  if (operateWhole || momentary) classes.push('operable');
  if (burnt) classes.push('burnt');

  const level = brightness === undefined ? null : lampLevel(brightness);
  let label = def.label;
  if (level) label = `${def.label}, ${level}`;
  else if (burnt) label = `${def.label}, terbakar`;
  else if (state?.kind === 'overload' && state.tripped && !ghost) {
    label = operateWhole ? 'Reset TOR' : `${def.label}, trip`;
  } else if (motor && motor.mode !== 'stopped') {
    label = `${def.label}, ${motorText(motor).toLowerCase()}`;
  } else if (single?.tone === 'position') label = `${def.label}, ${single.text.toLowerCase()}`;

  // Saklar hidup-mati tampil sebagai sakelar; saklar tukar dan push button sebagai tombol.
  let role: 'group' | 'button' | 'switch' = 'group';
  if (momentary) role = 'button';
  else if (operateWhole) {
    role = single.tone === 'position' || state?.kind === 'overload' ? 'button' : 'switch';
  }

  return (
    <g
      className={classes.join(' ')}
      transform={`translate(${component.position.x * GRID} ${component.position.y * GRID})`}
      role={ghost ? undefined : role}
      tabIndex={ghost ? undefined : 0}
      aria-label={ghost ? undefined : label}
      aria-checked={role === 'switch' ? single?.tone === 'on' : undefined}
      aria-pressed={momentary ? single?.tone === 'on' : undefined}
      data-component-id={ghost ? undefined : component.id}
      data-selected={ghost ? undefined : Boolean(selected)}
      data-lamp={level ?? undefined}
      data-state={single?.text ?? (motor && motorText(motor))}
      onPointerDown={onPointerDown}
      onFocus={onSelect}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (!isActivation(e.key) || e.repeat) return;
        if (momentary) {
          e.preventDefault();
          momentary.onPress();
        } else if (operateWhole) {
          e.preventDefault();
          onOperate(0);
        }
      }}
      onKeyUp={(e) => {
        if (momentary && isActivation(e.key)) momentary.onRelease();
      }}
      onBlur={momentary?.onRelease}
    >
      {/* Kotak tembus pandang: sasaran penunjuk dan bingkai pilihan. */}
      <rect className="component-body frame" width={width} height={height} rx={4} />
      <g
        className="art"
        transform={artTransform(component.rotation, artSize.w * GRID, artSize.h * GRID)}
      >
        <Art
          w={artSize.w * GRID}
          h={artSize.h * GRID}
          state={state ?? def.initialState}
          settings={component.settings ?? {}}
          brightness={brightness}
        />
      </g>
      {motor && <MotorView cx={width / 2} cy={height / 2 - 2} state={motor} />}
      {levers.map((lever, index) => {
        const slot = width / levers.length;
        return (
          <g key={index}>
            {onOperate && levers.length > 1 && (
              <rect
                className="lever-hit"
                x={slot * index}
                width={slot}
                height={height}
                role="switch"
                tabIndex={0}
                aria-label={`${def.label}, tuas ${index + 1}`}
                aria-checked={lever.tone === 'on'}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  onOperate(index);
                }}
                onKeyDown={(e) => {
                  if (isActivation(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    onOperate(index);
                  }
                }}
              />
            )}
          </g>
        );
      })}
      {placedTerminals(component).map((terminal) => {
        const x = (terminal.position.x - component.position.x) * GRID;
        const y = (terminal.position.y - component.position.y) * GRID;
        // Nama terminal digeser ke arah dalam kotak.
        const dx = x === 0 ? LABEL_OFFSET : x === width ? -LABEL_OFFSET : 0;
        const dy = y === 0 ? LABEL_OFFSET : y === height ? -LABEL_OFFSET : 0;
        return (
          <text key={terminal.id} className="terminal-label on-art" x={x + dx} y={y + dy}>
            {terminalCaption(component, terminal.id)}
          </text>
        );
      })}
      {ghost &&
        placedTerminals(component).map((terminal) => (
          <circle
            key={terminal.id}
            className="terminal-dot"
            cx={(terminal.position.x - component.position.x) * GRID}
            cy={(terminal.position.y - component.position.y) * GRID}
            r={4}
          />
        ))}
    </g>
  );
}
