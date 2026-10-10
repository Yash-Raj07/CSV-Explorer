const SIZES = [10, 25, 50, 100];

export default function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <label className="page-size">
        Rows per page
        <select className="input input-sm" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <span className="page-range">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>

      <div className="page-btns">
        <button className="btn btn-icon" onClick={() => onPage(1)} disabled={page <= 1} aria-label="First page">«</button>
        <button className="btn btn-icon" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
        <span className="page-of">
          Page{' '}
          <input
            className="input input-sm page-input"
            type="number"
            min={1}
            max={pages}
            value={page}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1 && n <= pages) onPage(n);
            }}
            aria-label="Current page"
          />{' '}
          of {pages.toLocaleString()}
        </span>
        <button className="btn btn-icon" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">›</button>
        <button className="btn btn-icon" onClick={() => onPage(pages)} disabled={page >= pages} aria-label="Last page">»</button>
      </div>
    </div>
  );
}
