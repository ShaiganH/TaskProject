import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Search, ArrowUpDown,X } from "lucide-react";
import { useRealtime } from '../realtime/TaskRealtimeProvider'
import { useTask } from "../context/TaskContext";
import { getMyTasks } from "../api/TaskService";
import TaskTable from "../components/TaskTable";
import { useOutletContext } from 'react-router-dom'
import NewTaskModal from "../components/NewTaskModal";
import Pagination from "../components/Pagination";
const TASK_TABS = [
  { label: "All", value: "All" },
  { label: "Assigned to me", value: "Assigned" },
  { label: "Created by me", value: "Created" },
];

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "To do", value: "Todo" },
  { label: "In progress", value: "InProgress" },
  { label: "On hold", value: "OnHold" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "DueDateEarliest", label: "Due date (earliest)" },
  { value: "DueDateLatest", label: "Due date (latest)" },
  { value: "PriorityHighest", label: "Priority (highest)" },
  { value: "NewestFirst", label: "Newest first" },
  { value: "OldestFirst", label: "Oldest first" },
];

export default function MyTasksPage() {
  const { fetchMyTasks, categories} = useTask()
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("");
  const [catId, setCatId] = useState("");
  const [sort, setSort] = useState("NewestFirst");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All");

  const [pageSize, setPageSize] = useState(20);

const fetch = useCallback(async () => {
  setLoading(true)
  try {
    const data = await fetchMyTasks({
      search: search || undefined,
      status: status || undefined,
      categoryId: catId || undefined,
      sortBy: sort,
      page,
      pageSize,
      filter: tab,
    })

    setData(data)
  } finally {
    setLoading(false)
  }
}, [fetchMyTasks, search, status, catId, sort, page, tab, pageSize])

useEffect(() => {
  fetch()
}, [fetch])

const connection = useRealtime()

const fetchRef = useRef(fetch)
useEffect(() => { fetchRef.current = fetch }, [fetch])
const statusHandler = (payload) => {
  setData(prev => {
    if (!prev) return prev
    return {
      ...prev,
      items: prev.items.map(t =>
        t.id === payload.id ? { ...t, status: payload.status } : t
      )
    }
  })
}
useEffect(() => {
  if (!connection) return
  const handler = () => fetchRef.current()
  connection.on('TaskStatusUpdated', statusHandler)
  connection.on('TaskUpdated', handler)
  connection.on('TaskCreated', handler)
  connection.on('TaskDeleted', handler)

  return () => {
    connection.off('TaskStatusUpdated', statusHandler)  // update this too
    connection.off('TaskUpdated', handler)
    connection.off('TaskCreated', handler)
    connection.off('TaskDeleted', handler)
  }
}, [connection]) // no `fetch` dependency here




  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleStatus = (val) => {
    setStatus(val);
    setPage(1);
  };
  const visibleCats = categories.filter((c) => c.isGlobal || !c.isGlobal);
  const tableRef = useRef(null);

  const { openTask } = useOutletContext()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My tasks</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Tasks assigned to or created by you
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> New task
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 flex-shrink-0">
        {STATUS_TABS.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatus(s.value)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
              status === s.value
                ? "bg-brand-50 text-brand-800 border-brand-200 font-medium"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 mb-6 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="field-input pl-8 pr-8 text-sm"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
    <button
      onClick={() => setSearch('')}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="Clear search"
    >
      <X size={14} />
    </button>
  )}
        </div>
        <select
          className="field-input w-44 text-sm"
          value={catId}
          onChange={(e) => {
            setCatId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {visibleCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <ArrowUpDown
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            className="field-input pl-8 w-52 text-sm"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-shrink-0">
        {TASK_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              tab === t.value
                ? "bg-brand-50 text-brand-800 border-brand-200 font-medium"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div ref={tableRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
        <TaskTable
          tasks={data?.items || []}
          loading={loading}
          emptyTitle="No tasks found"
          onRowClick={openTask}
        />
      </div>

      <div className="flex-shrink-0">
        <Pagination
          page={page}
          totalPages={data?.totalPages}
          totalCount={data?.totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
            tableRef.current?.scrollTo({ top: 0 });
          }}
        />
      </div>

      <NewTaskModal
        open={modal}
        onClose={() => {
          setModal(false);
          fetch();
        }}
      />
    </div>
  );
}
