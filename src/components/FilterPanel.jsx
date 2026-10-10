import { useState } from 'react';
import ColumnFilter from './ColumnFilter.jsx';
import { isFilterActive } from '../utils/csv.js';

const TYPE_LABEL = {
  category: 'list',
  number: 'number',
  date: 'date',
  boolean: 'yes/no',
  text: 'text',
};

/** Sidebar listing every column with a collapsible filter control. */
export default function FilterPanel({ columns, filters, onChange, onClearAll, activeCount, onClose }) {
  const [open, setOpen] = useState(() => new Set());
  const [q, setQ] = useState('');

  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const shown = columns.filter((c) => c.key.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="filter-panel">
      <div className="filter-head">
        <h2>
          Filters {activeCount > 0 && <span className="count-pill">{activeCount}</span>}
        </h2>
        <div className="filter-head-actions">
          <button className="link-btn" onClick={onClearAll} disabled={!activeCount}>
            Clear all
          </button>
          {onClose && (
            <button className="btn btn-sm mobile-only" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>

      {columns.length > 8 && (
        <input
          className="input input-sm"
          placeholder={`Find a column (${columns.length})…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      <ul className="filter-list">
        {shown.map((col) => {
          const active = isFilterActive(col.type, filters[col.key]);
          const isOpen = open.has(col.key);
          return (
            <li key={col.key} className={`filter-item${active ? ' is-active' : ''}`}>
              <button className="filter-toggle" aria-expanded={isOpen} onClick={() => toggle(col.key)}>
                <span className="chev" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                <span className="filter-name" title={col.key}>{col.key}</span>
                {active && <span className="dot" aria-label="filter active" />}
                <span className="type-tag">{TYPE_LABEL[col.type]}</span>
              </button>
              {isOpen && (
                <div className="filter-body">
                  <ColumnFilter
                    column={col}
                    value={filters[col.key]}
                    onChange={(v) => onChange(col.key, v)}
                  />
                </div>
              )}
            </li>
          );
        })}
        {!shown.length && <li className="muted small pad">No columns match “{q}”.</li>}
      </ul>
    </div>
  );
}
