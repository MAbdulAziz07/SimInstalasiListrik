import { useEffect, useRef, useState } from 'react';
import { WIRE_COLORS } from '../core/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { downloadProject, importFile } from './persistence';
import { selectionKind, useEditor } from './store';
import { WIRE_COLOR_INFO } from './wiring';

const ZOOM_STEP = 1.25;

export function Toolbar() {
  const kind = useEditor(selectionKind);
  const scale = useEditor((s) => s.views[s.activeBoard].scale);
  const wireColor = useEditor((s) => s.wireColor);
  const energized = useEditor((s) => s.sim !== null);
  const canUndo = useEditor((s) => s.history.past.length > 0);
  const canRedo = useEditor((s) => s.history.future.length > 0);
  const empty = useEditor((s) =>
    Object.values(s.project.boards).every((board) => board.components.length === 0),
  );
  // Terminal blok X1 mengikuti panel listrik dan tidak bisa dihapus sendiri.
  const managed = useEditor(
    (s) =>
      s.project.boards.panel.components.find((c) => c.id === s.selectedId)?.type ===
      'terminalBlock',
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    rotateSelected,
    deleteSelected,
    zoomBy,
    resetView,
    select,
    stopPlacing,
    cancelWiring,
    setWireColor,
    energize,
    deenergize,
    undo,
    redo,
    clearBoards,
  } = useEditor.getState();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' || key === 'y') {
          e.preventDefault();
          if (key === 'y' || e.shiftKey) redo();
          else undo();
        }
        return;
      }
      if (e.altKey) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      else if (e.key === 'r' || e.key === 'R') rotateSelected();
      else if (e.key === 'Escape') {
        select(null);
        stopPlacing();
        cancelWiring();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, rotateSelected, select, stopPlacing, cancelWiring, undo, redo]);

  return (
    <div className="toolbar" role="toolbar" aria-label="Alat papan">
      <button
        type="button"
        className={energized ? 'power on' : 'power'}
        aria-pressed={energized}
        onClick={energized ? deenergize : energize}
      >
        {energized ? 'Matikan' : 'Beri tegangan'}
      </button>
      <span className="toolbar-gap" />

      <button
        type="button"
        onClick={rotateSelected}
        disabled={energized || kind !== 'component'}
        title="Putar (R)"
      >
        Putar
      </button>
      <button
        type="button"
        onClick={deleteSelected}
        disabled={energized || kind === null || managed}
        title={
          managed ? 'Terminal blok X1 ikut terhapus bila panel listrik dihapus' : 'Hapus (Del)'
        }
      >
        Hapus
      </button>
      <span className="toolbar-gap" />

      <button
        type="button"
        onClick={undo}
        disabled={energized || !canUndo}
        title="Urungkan (Ctrl+Z)"
      >
        Urungkan
      </button>
      <button type="button" onClick={redo} disabled={energized || !canRedo} title="Ulangi (Ctrl+Y)">
        Ulangi
      </button>
      <span className="toolbar-gap" />

      <div className="wire-colors" role="radiogroup" aria-label="Warna kabel">
        {WIRE_COLORS.map((color) => {
          const info = WIRE_COLOR_INFO[color];
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={color === wireColor}
              aria-label={info.label}
              title={info.label}
              className="wire-color"
              disabled={energized}
              onClick={() => setWireColor(color)}
            >
              <span
                className="wire-swatch"
                style={{
                  background: info.dash
                    ? `repeating-linear-gradient(90deg, ${info.stroke} 0 5px, ${info.dash} 5px 10px)`
                    : info.stroke,
                }}
              />
            </button>
          );
        })}
      </div>
      <span className="toolbar-gap" />

      <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Perkecil">
        −
      </button>
      <button type="button" onClick={resetView} title="Kembalikan tampilan">
        {Math.round(scale * 100)}%
      </button>
      <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Perbesar">
        +
      </button>

      <span className="toolbar-gap" />

      <button
        type="button"
        onClick={() => downloadProject(useEditor.getState().project)}
        title="Simpan papan sebagai berkas .json"
      >
        Ekspor
      </button>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={energized}
        title="Buka berkas .json"
      >
        Impor
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Berkas papan"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Dikosongkan agar berkas yang sama bisa dipilih lagi.
          e.target.value = '';
          if (file) void importFile(file);
        }}
      />
      <button type="button" onClick={() => setConfirmingClear(true)} disabled={energized || empty}>
        Kosongkan
      </button>

      {confirmingClear && (
        <ConfirmDialog
          title="Kosongkan papan?"
          message="Semua komponen dan kabel di kedua papan akan dihapus. Anda masih bisa mengembalikannya dengan Urungkan."
          confirmLabel="Kosongkan"
          onCancel={() => setConfirmingClear(false)}
          onConfirm={() => {
            clearBoards();
            setConfirmingClear(false);
          }}
        />
      )}
    </div>
  );
}
