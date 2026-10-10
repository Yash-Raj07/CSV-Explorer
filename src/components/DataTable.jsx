/** Sortable table for the current page of rows. */
export default function DataTable({ columns, rows, sort, onSort, startIndex }) {
  if (!rows.length) {
    return (
      <div className="table-empty">
        <p>No rows match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="row-num">#</th>
            {columns.map((col) => {
              const active = sort.key === col.key;
              const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={col.key} aria-sort={ariaSort} className={alignClass(col)}>
                  <button className={`th-btn${active ? ' is-sorted' : ''}`} onClick={() => onSort(col.key)}>
                    <span>{col.key}</span>
                    <span className="sort-ind" aria-hidden="true">
                      {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={startIndex + i}>
              <td className="row-num">{startIndex + i + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className={alignClass(col)}>
                  <Cell value={row[col.key]} type={col.type} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value, type }) {
  if (value === '') return <span className="blank">—</span>;
  if (type === 'boolean') {
    const yes = ['true', 'yes'].includes(value.toLowerCase());
    return <span className={`bool ${yes ? 'bool-yes' : 'bool-no'}`}>{value}</span>;
  }
  return value;
}

const alignClass = (col) => (col.numeric || col.type === 'number' ? 'num' : '');
