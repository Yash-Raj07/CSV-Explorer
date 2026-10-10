import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import DataTable from './components/DataTable.jsx';
import Pagination from './components/Pagination.jsx';
import ColumnPicker from './components/ColumnPicker.jsx';
import {
  analyzeColumns,
  applyFilters,
  describeFilter,
  downloadCsv,
  emptyFilter,
  isFilterActive,
  parseCsv,
  sortRows,
} from './utils/csv.js';

const initialFilters = (columns) =>
  Object.fromEntries(columns.map((c) => [c.key, emptyFilter(c.type)]));

export default function App() {
  const [dataset, setDataset] = useState(null); // { fileName, fields, rows, columns, warnings }
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [hidden, setHidden] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile drawer

  const deferredSearch = useDeferredValue(search);

  /* ---------------- loading ---------------- */

  const load = useCallback(async (input, fileName) => {
    setLoading(true);
    setError('');
    try {
      const { fields, rows, errors } = await parseCsv(input);
      if (!fields.length || !rows.length) {
        throw new Error('The file has no data rows. Make sure the first row contains column headers.');
      }
      const columns = analyzeColumns(fields, rows);
      setDataset({ fileName, fields, rows, columns, warnings: errors.length });
      setFilters(initialFilters(columns));
      setSearch('');
      setSort({ key: null, dir: 'asc' });
      setHidden(new Set());
      setPage(1);
    } catch (e) {
      setError(e?.message || 'Could not read that file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFile = (file) => load(file, file.name);

  const handleSample = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample.csv`);
      if (!res.ok) throw new Error();
      load(await res.text(), 'shampoo_share_of_shelf.csv');
    } catch {
      setError('Could not load the sample file.');
    }
  };

  /* ---------------- derived data ---------------- */

  const columns = dataset?.columns ?? [];
  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);
  const colByKey = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);

  const filtered = useMemo(
    () =>
      dataset
        ? applyFilters(dataset.rows, columns, filters, deferredSearch, visibleColumns.map((c) => c.key))
        : [],
    [dataset, columns, filters, deferredSearch, visibleColumns]
  );

  const sorted = useMemo(() => sortRows(filtered, colByKey[sort.key], sort.dir), [filtered, colByKey, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilters = columns.filter((c) => isFilterActive(c.type, filters[c.key]));

  /* ---------------- handlers ---------------- */

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilter = (key) => updateFilter(key, emptyFilter(colByKey[key].type));

  const clearAll = () => {
    setFilters(initialFilters(columns));
    setSearch('');
    setPage(1);
  };

  const handleSort = (key) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' }; // third click clears sorting
    });
    setPage(1);
  };

  const handleExport = () => {
    const base = dataset.fileName.replace(/\.[^.]+$/, '');
    downloadCsv(sorted, visibleColumns.map((c) => c.key), `${base}_filtered.csv`);
  };

  /* ---------------- render ---------------- */

  if (!dataset) {
    return (
      <div className="landing">
        <header className="landing-head">
          <Logo />
          <h1>CSV Explorer</h1>
          <p>Upload a CSV to browse it as a table, sort any column and filter by values, ranges, dates or text.</p>
        </header>
        <FileUpload onFile={handleFile} onError={setError} onSample={handleSample} loading={loading} />
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
    );
  }

  const filterCount = activeFilters.length + (search.trim() ? 1 : 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>CSV Explorer</span>
        </div>
        <div className="file-info">
          <span className="file-name" title={dataset.fileName}>{dataset.fileName}</span>
          <span className="muted">
            {dataset.rows.length.toLocaleString()} rows · {dataset.fields.length} columns
            {dataset.warnings > 0 && ` · ${dataset.warnings} parse warning${dataset.warnings > 1 ? 's' : ''}`}
          </span>
        </div>
        <FileUpload variant="button" onFile={handleFile} onError={setError} />
      </header>

      {error && <p className="alert alert-inline" role="alert">{error}</p>}

      <div className="workspace">
        <aside className={`sidebar${filtersOpen ? ' is-open' : ''}`}>
          <FilterPanel
            columns={columns}
            filters={filters}
            onChange={updateFilter}
            onClearAll={clearAll}
            activeCount={activeFilters.length}
            onClose={() => setFiltersOpen(false)}
          />
        </aside>
        {filtersOpen && <div className="backdrop" onClick={() => setFiltersOpen(false)} />}

        <main className="main">
          <div className="toolbar">
            <button className="btn sidebar-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
              Filters
              {activeFilters.length > 0 && <span className="count-pill">{activeFilters.length}</span>}
            </button>
            <div className="search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="input"
                type="search"
                placeholder="Search all visible columns…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="toolbar-right">
              <ColumnPicker fields={dataset.fields} hidden={hidden} onChange={setHidden} />
              <button className="btn btn-primary" onClick={handleExport} disabled={!sorted.length}>
                Export {sorted.length === dataset.rows.length ? 'CSV' : 'filtered CSV'}
              </button>
            </div>
          </div>

          <div className="result-bar">
            <span className="result-count">
              <strong>{sorted.length.toLocaleString()}</strong> of {dataset.rows.length.toLocaleString()} rows
            </span>
            {activeFilters.map((c) => (
              <span key={c.key} className="chip">
                <span className="chip-key">{c.key}:</span> {describeFilter(c, filters[c.key])}
                <button onClick={() => clearFilter(c.key)} aria-label={`Remove ${c.key} filter`}>×</button>
              </span>
            ))}
            {search.trim() && (
              <span className="chip">
                <span className="chip-key">search:</span> “{search.trim()}”
                <button onClick={() => setSearch('')} aria-label="Clear search">×</button>
              </span>
            )}
            {filterCount > 0 && (
              <button className="link-btn" onClick={clearAll}>Reset</button>
            )}
          </div>

          <DataTable
            columns={visibleColumns}
            rows={pageRows}
            sort={sort}
            onSort={handleSort}
            startIndex={(safePage - 1) * pageSize}
          />

          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={sorted.length}
            onPage={setPage}
            onPageSize={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg className="logo" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M8 10h16M8 16h16M8 22h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
