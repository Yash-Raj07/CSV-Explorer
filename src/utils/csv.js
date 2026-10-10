import Papa from 'papaparse';

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse a CSV File object or a raw CSV string.
 * Resolves to { fields, rows, errors }. Every cell is kept as a string so the
 * table shows exactly what is in the file; typed comparisons happen in filters.
 */
export function parseCsv(input) {
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (h, i) => (h ?? '').trim() || `column_${i + 1}`,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        // Normalise: every row gets every field as a trimmed string.
        const rows = res.data.map((r) => {
          const out = {};
          for (const f of fields) {
            const v = r[f];
            out[f] = v == null ? '' : String(v).trim();
          }
          return out;
        });
        resolve({ fields, rows, errors: res.errors ?? [] });
      },
      error: (err) => reject(err),
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Column type detection                                              */
/* ------------------------------------------------------------------ */

const BOOL_VALUES = new Set(['true', 'false', 'yes', 'no']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?$/;
const CATEGORY_LIMIT = 40; // up to this many distinct values -> pick-list filter
const NUMERIC_CATEGORY_LIMIT = 12; // numbers with few distinct values -> pick-list

export const toNumber = (v) => {
  if (v === '' || v == null) return NaN;
  return Number(String(v).replace(/,/g, ''));
};

const isNumeric = (v) => !Number.isNaN(toNumber(v));
const isBool = (v) => BOOL_VALUES.has(v.toLowerCase());
const isIsoDate = (v) => ISO_DATE.test(v) && !Number.isNaN(Date.parse(v));
export const toBool = (v) => ['true', 'yes'].includes(String(v).toLowerCase());

/**
 * Inspect every column and decide which filter UI suits it.
 * Types: 'boolean' | 'date' | 'number' | 'category' | 'text'
 */
export function analyzeColumns(fields, rows) {
  return fields.map((key) => {
    const counts = new Map();
    let empty = 0;
    let allNum = true;
    let allBool = true;
    let allDate = true;

    for (const row of rows) {
      const v = row[key];
      if (v === '') {
        empty++;
        continue;
      }
      counts.set(v, (counts.get(v) ?? 0) + 1);
      if (allNum && !isNumeric(v)) allNum = false;
      if (allBool && !isBool(v)) allBool = false;
      if (allDate && !isIsoDate(v)) allDate = false;
    }

    const nonEmpty = rows.length - empty;
    const distinct = counts.size;
    let type = 'text';

    if (nonEmpty === 0) type = 'text';
    else if (allBool) type = 'boolean';
    else if (allDate) type = 'date';
    else if (allNum) type = distinct <= NUMERIC_CATEGORY_LIMIT ? 'category' : 'number';
    else if (distinct <= CATEGORY_LIMIT) type = 'category';

    const meta = { key, type, distinct, empty, numeric: allNum && nonEmpty > 0 };

    if (type === 'category') {
      meta.options = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) =>
          allNum ? toNumber(a.value) - toNumber(b.value) : a.value.localeCompare(b.value)
        );
      if (empty) meta.options.push({ value: '', count: empty });
    }

    if (type === 'number') {
      let min = Infinity;
      let max = -Infinity;
      for (const v of counts.keys()) {
        const n = toNumber(v);
        if (n < min) min = n;
        if (n > max) max = n;
      }
      meta.min = min;
      meta.max = max;
    }

    if (type === 'date') {
      const keys = [...counts.keys()].sort();
      meta.min = keys[0]?.slice(0, 10);
      meta.max = keys[keys.length - 1]?.slice(0, 10);
    }

    if (type === 'boolean') {
      meta.trueCount = 0;
      meta.falseCount = 0;
      for (const [v, c] of counts) {
        if (toBool(v)) meta.trueCount += c;
        else meta.falseCount += c;
      }
    }

    return meta;
  });
}

/* ------------------------------------------------------------------ */
/*  Filtering                                                          */
/* ------------------------------------------------------------------ */

export function emptyFilter(type) {
  switch (type) {
    case 'category':
      return { selected: [] };
    case 'number':
      return { min: '', max: '' };
    case 'date':
      return { from: '', to: '' };
    case 'boolean':
      return { value: 'all' };
    default:
      return { query: '' };
  }
}

export function isFilterActive(type, f) {
  if (!f) return false;
  switch (type) {
    case 'category':
      return f.selected.length > 0;
    case 'number':
      return f.min !== '' || f.max !== '';
    case 'date':
      return f.from !== '' || f.to !== '';
    case 'boolean':
      return f.value !== 'all';
    default:
      return f.query.trim() !== '';
  }
}

/** Build a fast predicate for one column filter. */
function makePredicate(col, f) {
  const { key, type } = col;
  switch (type) {
    case 'category': {
      const set = new Set(f.selected);
      return (row) => set.has(row[key]);
    }
    case 'number': {
      const min = f.min === '' ? -Infinity : Number(f.min);
      const max = f.max === '' ? Infinity : Number(f.max);
      return (row) => {
        const n = toNumber(row[key]);
        return !Number.isNaN(n) && n >= min && n <= max;
      };
    }
    case 'date': {
      return (row) => {
        const d = row[key].slice(0, 10);
        if (!d) return false;
        if (f.from && d < f.from) return false;
        if (f.to && d > f.to) return false;
        return true;
      };
    }
    case 'boolean': {
      const want = f.value === 'true';
      return (row) => row[key] !== '' && toBool(row[key]) === want;
    }
    default: {
      const q = f.query.trim().toLowerCase();
      return (row) => row[key].toLowerCase().includes(q);
    }
  }
}

/**
 * Apply all active column filters plus a global search across visible columns.
 */
export function applyFilters(rows, columns, filters, search, searchKeys) {
  const predicates = columns
    .filter((c) => isFilterActive(c.type, filters[c.key]))
    .map((c) => makePredicate(c, filters[c.key]));

  const q = search.trim().toLowerCase();
  if (!predicates.length && !q) return rows;

  return rows.filter((row) => {
    for (const p of predicates) if (!p(row)) return false;
    if (q) {
      for (const k of searchKeys) if (row[k].toLowerCase().includes(q)) return true;
      return false;
    }
    return true;
  });
}

/** Human-readable summary of a filter, used for the active-filter chips. */
export function describeFilter(col, f) {
  switch (col.type) {
    case 'category': {
      const labels = f.selected.map((v) => (v === '' ? '(blank)' : v));
      return labels.length <= 2
        ? labels.join(', ')
        : `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
    }
    case 'number':
      if (f.min !== '' && f.max !== '') return `${f.min} – ${f.max}`;
      return f.min !== '' ? `≥ ${f.min}` : `≤ ${f.max}`;
    case 'date':
      if (f.from && f.to) return `${f.from} → ${f.to}`;
      return f.from ? `from ${f.from}` : `until ${f.to}`;
    case 'boolean':
      return f.value === 'true' ? 'True' : 'False';
    default:
      return `contains “${f.query.trim()}”`;
  }
}

/* ------------------------------------------------------------------ */
/*  Sorting                                                            */
/* ------------------------------------------------------------------ */

export function sortRows(rows, col, dir) {
  if (!col) return rows;
  const { key, numeric, type } = col;
  const sign = dir === 'desc' ? -1 : 1;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    // Blanks always sink to the bottom regardless of direction.
    if (av === '' && bv === '') return 0;
    if (av === '') return 1;
    if (bv === '') return -1;
    if (numeric || type === 'number') return (toNumber(av) - toNumber(bv)) * sign;
    return collator.compare(av, bv) * sign;
  });
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export function downloadCsv(rows, fields, fileName) {
  const csv = Papa.unparse({ fields, data: rows.map((r) => fields.map((f) => r[f])) });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
