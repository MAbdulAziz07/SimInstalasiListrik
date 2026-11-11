import { memo, type PointerEvent } from 'react';
import { catalog } from '../core/catalog';
import { placedTerminals, terminalName } from '../core/geometry';
import type { ComponentState, PlacedComponent, Point, TerminalRef, Wire } from '../core/types';
import { ComponentView } from './ComponentView';
import { toggled } from './simView';
import { GRID } from './store';

/**
 * Penangan peristiwa papan. Identitasnya tetap sepanjang umur papan, sehingga bagian papan
 * yang di-memo tidak digambar ulang hanya karena papan digambar ulang.
 */
export interface BoardHandlers {
  componentDown(event: PointerEvent, component: PlacedComponent): void;
  select(id: string): void;
  operate(id: string, part: number): void;
  press(id: string): void;
  release(id: string): void;
  openPanel(): void;
  terminalDown(event: PointerEvent, ref: TerminalRef): void;
  terminalActivate(ref: TerminalRef): void;
  wireDown(event: PointerEvent, wire: Wire): void;
  bendDown(event: PointerEvent, wire: Wire, index: number): void;
  /** Menekan pegangan tengah ruas: sisipkan titik belok baru di indeks itu. */
  midpointDown(event: PointerEvent, wire: Wire, index: number, at: Point): void;
  bendDoubleClick(wire: Wire, index: number): void;
}

interface BoardComponentProps {
  component: PlacedComponent;
  selected: boolean;
  state: ComponentState;
  /** Daya lampu dibanding nominalnya (0–1); hanya diisi saat papan bertegangan. */
  brightness: number | undefined;
  energized: boolean;
  handlers: BoardHandlers;
}

/** Satu komponen di papan; hanya digambar ulang bila komponen atau keadaannya sendiri berubah. */
export const BoardComponent = memo(function BoardComponent({
  component,
  selected,
  state,
  brightness,
  energized,
  handlers,
}: BoardComponentProps) {
  const id = component.id;
  return (
    <ComponentView
      component={component}
      selected={selected}
      state={state}
      brightness={brightness}
      onOperate={energized && toggled(state) ? (part) => handlers.operate(id, part) : undefined}
      momentary={
        energized && state.kind === 'pushButton'
          ? { onPress: () => handlers.press(id), onRelease: () => handlers.release(id) }
          : undefined
      }
      onDoubleClick={component.type === 'panel' ? handlers.openPanel : undefined}
      onPointerDown={(e) => handlers.componentDown(e, component)}
      onSelect={() => handlers.select(id)}
    />
  );
});

interface TerminalGroupProps {
  component: PlacedComponent;
  /** Terminal komponen ini yang sedang menjadi awal kabel; `null` bila tidak ada. */
  activeTerminal: string | null;
  handlers: BoardHandlers;
}

/** Titik-titik terminal sebuah komponen, digambar di atas kabel agar selalu bisa diklik. */
export const TerminalGroup = memo(function TerminalGroup({
  component,
  activeTerminal,
  handlers,
}: TerminalGroupProps) {
  return (
    <>
      {placedTerminals(component).map((terminal) => {
        const ref = { componentId: component.id, terminalId: terminal.id };
        const active = activeTerminal === terminal.id;
        return (
          <g
            key={terminal.id}
            className={active ? 'terminal active' : 'terminal'}
            transform={`translate(${terminal.position.x * GRID} ${terminal.position.y * GRID})`}
            role="button"
            tabIndex={0}
            aria-label={`Terminal ${terminalName(component, terminal.id)} ${catalog[component.type].label}`}
            aria-pressed={active}
            data-terminal={`${component.id}:${terminal.id}`}
            onPointerDown={(e) => handlers.terminalDown(e, ref)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlers.terminalActivate(ref);
              }
            }}
          >
            <circle className="terminal-hit" r={9} />
            <circle className="terminal-dot" r={4} />
          </g>
        );
      })}
    </>
  );
});
