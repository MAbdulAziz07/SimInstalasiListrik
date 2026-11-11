import type { ReactNode } from 'react';
import { catalog } from '../core/catalog';
import { COMPONENT_TYPES } from '../core/types';
import { GROUPS } from './labels';
import { useEditor } from './store';

interface PaletteProps {
  /** Kelompok tambahan di bawah daftar komponen, mis. alat ukur. */
  children?: ReactNode;
}

export function Palette({ children }: PaletteProps) {
  const activeBoard = useEditor((s) => s.activeBoard);
  const placing = useEditor((s) => s.placing);
  const energized = useEditor((s) => s.sim !== null);
  const hasPanel = useEditor((s) =>
    s.project.boards.installation.components.some((c) => c.type === 'panel'),
  );
  const startPlacing = useEditor((s) => s.startPlacing);
  const addAtViewCenter = useEditor((s) => s.addAtViewCenter);

  const allowed = COMPONENT_TYPES.map((type) => catalog[type]).filter(
    (def) => def.boards.includes(activeBoard) && !def.managed,
  );

  return (
    <aside className="palette" aria-label="Palet peralatan">
      <p className="palette-hint">
        {energized
          ? 'Papan bertegangan. Matikan dulu untuk menambah peralatan.'
          : 'Seret ke papan, atau klik untuk menaruh di tengah.'}
      </p>
      {GROUPS.map((group) => {
        const defs = allowed.filter((def) => def.group === group.id);
        if (defs.length === 0) return null;
        return (
          <section key={group.id} className="palette-group">
            <h2>{group.label}</h2>
            <ul>
              {defs.map((def) => (
                <li key={def.type}>
                  <button
                    type="button"
                    className={placing === def.type ? 'palette-item dragging' : 'palette-item'}
                    disabled={energized || (def.type === 'panel' && hasPanel)}
                    title={
                      def.type === 'panel' && hasPanel
                        ? 'Versi ini hanya mendukung satu panel listrik.'
                        : undefined
                    }
                    onPointerDown={(e) => {
                      if (e.button === 0) startPlacing(def.type);
                    }}
                    onClick={() => addAtViewCenter(def.type)}
                  >
                    {def.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {children}
    </aside>
  );
}
