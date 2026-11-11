import { useEditor } from '../editor/store';

/** Pita pesan gangguan, mis. MCB trip karena hubung singkat. */
export function Notice() {
  const notice = useEditor((s) => s.notice);
  const dismiss = useEditor((s) => s.dismissNotice);
  if (!notice) return null;
  return (
    <div className="notice" role="alert">
      <span className="notice-text">{notice}</span>
      <button type="button" className="notice-close" onClick={dismiss}>
        Tutup
      </button>
    </div>
  );
}
