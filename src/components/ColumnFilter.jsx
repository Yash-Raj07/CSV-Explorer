import { useMemo, useState } from 'react';

/** Renders the right control for a column based on its detected type. */
export default function ColumnFilter({ column, value, onChange }) {
  switch (column.type) {
    case 'category':
      return <CategoryFilter column={column} value={value} onChange={onChange} />;
    case 'number':
      return <RangeFilter column={column} value={value} onChange={onChange} />;
    case 'date':
      return <DateFilter column={column} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanFilter column={column} value={value} onChange={onChange} />;
    default:
      return <TextFilter value={value} onChange={onChange} />;
  }
}

function CategoryFilter({ column, value, onChange }) {
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set(value.selected), [value.selected]);
  const options = column.options.filter((o) =>
    (o.value || '(blank)').toLowerCase().includes(q.toLowerCase())
  );

  const toggle = (v) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange({ selected: [...next] });
  };

  return (
    <div className="cat-filter">
      {column.options.length > 8 && (
        <input
          className="input input-sm"
          placeholder={`Search ${column.options.length} values…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      <div className="cat-actions">
        <button className="link-btn" onClick={() => onChange({ selected: [...new Set([...value.selected, ...options.map((o) => o.value)])] })}>
          Select {q ? 'matching' : 'all'}
        </button>
        <button className="link-btn" onClick={() => onChange({ selected: [] })} disabled={!value.selected.length}>
          Clear
        </button>
      </div>
      <ul className="cat-list">
        {options.map((o) => (
          <li key={o.value}>
            <label className="check">
              <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
              <span className={`check-label${o.value === '' ? ' muted' : ''}`}>{o.value || '(blank)'}</span>
              <span className="check-count">{o.count.toLocaleString()}</span>
            </label>
          </li>
        ))}
        {!options.length && <li className="muted small">No matching values</li>}
      </ul>
    </div>
  );
}

function RangeFilter({ column, value, onChange }) {
  return (
    <div className="range">
      <label>
        <span>Min</span>
        <input
          className="input input-sm"
          type="number"
          placeholder={fmt(column.min)}
          value={value.min}
          onChange={(e) => onChange({ ...value, min: e.target.value })}
        />
      </label>
      <label>
        <span>Max</span>
        <input
          className="input input-sm"
          type="number"
          placeholder={fmt(column.max)}
          value={value.max}
          onChange={(e) => onChange({ ...value, max: e.target.value })}
        />
      </label>
      <p className="range-hint">
        Range in data: {fmt(column.min)} – {fmt(column.max)}
      </p>
    </div>
  );
}

function DateFilter({ column, value, onChange }) {
  return (
    <div className="range">
      <label>
        <span>From</span>
        <input
          className="input input-sm"
          type="date"
          min={column.min}
          max={column.max}
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <label>
        <span>To</span>
        <input
          className="input input-sm"
          type="date"
          min={column.min}
          max={column.max}
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>
      <p className="range-hint">
        Dates in data: {column.min} → {column.max}
      </p>
    </div>
  );
}

function BooleanFilter({ column, value, onChange }) {
  const opts = [
    { v: 'all', label: 'All' },
    { v: 'true', label: `True · ${column.trueCount.toLocaleString()}` },
    { v: 'false', label: `False · ${column.falseCount.toLocaleString()}` },
  ];
  return (
    <div className="segmented" role="radiogroup">
      {opts.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value.value === o.v}
          className={value.value === o.v ? 'is-on' : ''}
          onClick={() => onChange({ value: o.v })}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TextFilter({ value, onChange }) {
  return (
    <input
      className="input input-sm"
      placeholder="Contains…"
      value={value.query}
      onChange={(e) => onChange({ query: e.target.value })}
    />
  );
}

const fmt = (n) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '';
