export default function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  if (!totalPages) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Build a compact page range: always show first, last, current ± 1
  const getPages = () => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);
    const pages = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    const sorted = [...pages].sort((a, b) => a - b);
    // Insert ellipsis markers
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
      result.push(sorted[i]);
    }
    return result;
  };

  return (
    <div className="flex flex-col items-center mt-4 gap-2">
      {/* Info */}
      <span className="text-xs text-gray-400">
        Showing {start}–{end} of {totalCount}
      </span>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Page size selector */}
        <select
          className="field-input text-xs py-1 w-28"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map(size => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        {/* Pagination buttons */}
        <div className="flex gap-1 flex-wrap justify-center">
          <button
            className="btn-ghost text-xs px-2 py-1"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </button>

          {getPages().map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="text-xs px-2 py-1 text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`text-xs px-3 py-1 rounded ${
                  page === p
                    ? "bg-brand-600 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            className="btn-ghost text-xs px-2 py-1"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
