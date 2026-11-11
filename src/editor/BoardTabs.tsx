import { BOARD_IDS, type BoardId } from '../core/types';
import { StatusLine } from './StatusLine';
import { useEditor } from './store';

export const BOARD_LABELS: Record<BoardId, string> = {
  installation: 'Instalasi',
  panel: 'Dalam Panel',
};

/** Tab pemilih papan kerja, dengan petunjuk keadaan papan di sampingnya. */
export function BoardTabs() {
  const activeBoard = useEditor((s) => s.activeBoard);
  const setActiveBoard = useEditor((s) => s.setActiveBoard);
  return (
    <div className="board-bar">
      <div className="board-tabs" role="tablist" aria-label="Papan kerja">
        {BOARD_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === activeBoard}
            className={id === activeBoard ? 'board-tab active' : 'board-tab'}
            onClick={() => setActiveBoard(id)}
          >
            {BOARD_LABELS[id]}
          </button>
        ))}
      </div>
      <StatusLine />
    </div>
  );
}
