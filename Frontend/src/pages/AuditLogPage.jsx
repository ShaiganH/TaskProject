import { useState, useEffect, useCallback } from "react";
import { Search, Download, X } from "lucide-react";
import { useTask } from "../context/TaskContext";
import { Badge, EmptyState } from "../components/UI";
import { ScrollText } from "lucide-react";
import Pagination from "../components/Pagination";
import {
  formatDateTime,
  actionLabel,
  actionClass,
  downloadFile,
} from "../utils/helpers";
import toast from "react-hot-toast";

const ACTION_FILTERS = [
  { label: "All actions", value: "All" },
  { label: "Task created", value: "TaskCreated" },
  { label: "Status changed", value: "StatusChanged" },
  { label: "Category changed", value: "CategoryChanged" },
  { label: "Comment added", value: "CommentAdded" },
  { label: "Login", value: "Login" },
  { label: "Task deleted", value: "TaskDeleted" },
];

export default function AuditLogPage() {
  const { fetchAuditLogs } = useTask();
  const [result, setResult] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetch = useCallback(async () => {
    setLoading(true);
    const data = await fetchAuditLogs({
      action: action !== "All" ? action : undefined,
      search: search || undefined,
      page,
      pageSize,
    });
    setResult(data);
    setLoading(false);
  }, [fetchAuditLogs, action, search, page, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    const header = "Timestamp,User,Action,Detail,Task";
    const rows = result.items.map((a) => {
      const detail =
        a.oldValue && a.newValue ? `${a.oldValue} → ${a.newValue}` : "";
      return `"${a.timestamp}","${a.userName}","${a.action}","${detail}","${a.taskTitle ?? ""}"`;
    });
    downloadFile([header, ...rows].join("\n"), "audit-log.csv", "text/csv");
    toast.success("Audit log exported");
  };

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Chronological record of all actions
          </p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Action filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setAction(f.value);
              setPage(1);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              action === f.value
                ? "bg-brand-50 text-brand-800 border-brand-200 font-medium"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          className="field-input pl-8 pl-r text-sm"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No log entries found"
          subtitle="Try adjusting your filters"
        />
      ) : (
        <div className="card h-[calc(100vh-220px)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
          <div className="overflow-x-auto"><table className="data-table w-full" style={{ tableLayout: "fixed", minWidth: 560 }}>
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th style={{ width: "16%" }}>Timestamp</th>
                <th style={{ width: "16%" }}>Action</th>
                <th style={{ width: "28%" }}>Detail</th>
                <th style={{ width: "28%" }}>Task / Category</th>
                <th style={{ width: "12%" }}>User</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((a) => (
                <tr key={a.id} className="!cursor-default">
                  <td className="text-xs text-gray-400 font-mono">
                    {formatDateTime(a.timestamp)}
                  </td>
                  <td>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded ${actionClass(a.action)}`}
                    >
                      {actionLabel(a.action)}
                    </span>
                  </td>
                  <td>
                    {a.oldValue && a.newValue ? (
                      <span className="text-xs text-gray-600">
                        <span className="text-gray-400">{a.oldValue}</span> →{" "}
                        <span className="font-medium">{a.newValue}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="text-xs text-brand-600 truncate">
                    {a.taskTitle || "—"}
                  </td>
                  <td className="text-xs text-gray-500">
                    {a.userName?.split(" ")[0] || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          </div>

          {/* Pagination */}
          <div className="flex-shrink-0">
          <Pagination
            page={page}
            totalPages={result.totalPages}
            totalCount={result.totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
          </div>
        </div>
      )}
    </div>
  );
}
