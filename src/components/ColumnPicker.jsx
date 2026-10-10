import { useEffect, useRef, useState } from 'react';

/** Dropdown to show/hide table columns. */
export default function ColumnPicker({ fields, hidden, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const visibleCount = fields.length - hidden.size;

  const toggle = (f) => {
    const next = new Set(hidden);
    next.has(f) ? next.delete(f) : next.add(f);
    if (next.size < fields.length) onChange(next); // keep at least one column visible
  };

  return (
    <div className="popover-wrap" ref={ref}>
      <button className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Columns <span className="muted">{visibleCount}/{fields.length}</span>
      </button>
      {open && (
        <div className="popover">
          <div className="cat-actions">
            <button className="link-btn" onClick={() => onChange(new Set())}>Show all</button>
            <button className="link-btn" onClick={() => onChange(new Set(fields.slice(1)))}>Hide all</button>
          </div>
          <ul className="cat-list">
            {fields.map((f) => (
              <li key={f}>
                <label className="check">
                  <input type="checkbox" checked={!hidden.has(f)} onChange={() => toggle(f)} />
                  <span className="check-label">{f}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
