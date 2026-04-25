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

  return (
    <div className="flex flex-col items-center mt-4 gap-2">
      
      {/* Info */}
      <span className="text-xs text-gray-400">
        Showing {start} to {end} of {totalCount} results
      </span>

      <div className="flex items-center gap-3">
        
        {/* Page size selector */}
        <select
          className="field-input text-xs py-1"
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
        <div className="flex gap-1">
          <button
            className="btn-ghost text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            &lt;
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`text-xs px-3 py-1 rounded ${
                  page === p
                    ? "bg-brand-600 text-white"
                    : "bg-white border border-gray-200 text-gray-500"
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            className="btn-ghost text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}