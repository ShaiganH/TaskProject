import { useState, useEffect, useCallback, useMemo,useRef } from "react";
import { Clock, AlertTriangle, Plus, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTask } from "../context/TaskContext";
import { Badge, EmptyState, StatusDot } from "../components/UI";
import TaskDrawer from '../components/TaskDrawer'
import { useRealtime } from '../realtime/TaskRealtimeProvider'
import NewTaskModal from "../components/NewTaskModal";
import { useOutletContext } from 'react-router-dom'
import {
  getPriorityClass,
  dueDateLabel,
  isOverdue,
  isTaskDueToday,
} from "../utils/helpers";
import { getTasksDashboard } from "../api/TaskService";
import { differenceInDays, isToday as isTodayFn, startOfDay } from "date-fns";
import { memo } from "react";

const DueCard = memo(function DueCard({ task, onSelect, isSelected }) {
  const { categories, getUserById } = useTask();
  const cat = categories.find((c) => c.id === task.categoryId);
  const creator = getUserById(task.createdByUserId);
  const isToday = isTodayFn(new Date(task.dueDate));
  const overdue = isOverdue(task.dueDate, task.status);

  const label = dueDateLabel(task.dueDate);
  const border = overdue
    ? "border-l-red-400"
    : isToday
      ? "border-l-amber-400"
      : "border-l-brand-400";

  return (
    <div
      onClick={() => onSelect(task)}
      className={`card border-l-[3px] ${border} px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? "bg-brand-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className={getPriorityClass(task.priority)}>
              {task.priority}
            </Badge>
            {cat && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: cat.color, color: cat.textColor }}
              >
                {cat.name}
              </span>
            )}
            {creator && (
              <span className="text-[10px] text-gray-400">
                from {creator.firstName ?? creator.name?.split(" ")[0]}
              </span>
            )}
            <div className="flex items-center gap-1">
              <StatusDot status={task.status} />
              <span className="text-[10px] text-gray-500">{task.status}</span>
            </div>
          </div>
        </div>
        <span
          className={`text-xs font-semibold flex-shrink-0 ${overdue ? "text-red-500" : isToday ? "text-amber-600" : "text-brand-600"}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
});

function Group({ title, color, tasks, onSelect, selected, active, onToggle }) {
  if (tasks.length === 0) return null;

  const isOpen = active === title;

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => onToggle(title)}
        className=" flex items-center justify-between px-4 py-3 bg-white"
      >
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-semibold uppercase ${color}`}>
            {title}
          </h2>
          <span className="text-xs text-gray-400">({tasks.length})</span>
        </div>

        <span className="text-xs text-gray-400">{isOpen ? "−" : "+"}</span>
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="h-full overflow-y-auto px-3 pb-3 space-y-2">
          {tasks.map((t) => (
            <DueCard
              key={t.id}
              task={t}
              onSelect={onSelect}
              isSelected={selected?.id === t.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DueSoonPage() {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState("Overdue");
  const { openTask } = useOutletContext()
  const [now, setNow] = useState(() => new Date())
 
  useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 60000)
  return () => clearInterval(interval)
}, [])

  const fetch = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await getTasksDashboard({
          pageSize: 200,
          sortBy: "DueDateEarliest",
          search: search || undefined,
        });
        setAllTasks(res.data.items ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetch();
  }, [fetch]); 


  const connection = useRealtime()
const fetchRef = useRef(fetch)
useEffect(() => { fetchRef.current = fetch }, [fetch])

useEffect(() => {
  if (!connection) return

  const refetch = () => fetchRef.current(true) // silent refetch

  const statusHandler = (payload) => {
    setAllTasks(prev => prev.map(t =>
      t.id === payload.id ? { ...t, status: payload.status } : t
    ))
  }

  connection.on('TaskStatusUpdated', statusHandler)
  connection.on('TaskUpdated', refetch)
  connection.on('TaskCreated', refetch)
  connection.on('TaskDeleted', refetch)

  return () => {
    connection.off('TaskStatusUpdated', statusHandler)
    connection.off('TaskUpdated', refetch)
    connection.off('TaskCreated', refetch)
    connection.off('TaskDeleted', refetch)
  }
}, [connection])




  const myTasks = allTasks.filter(
    (t) =>
      (t.assignedToUserId === user?.id || t.createdByUserId === user?.id) &&
      t.status !== "Completed" &&
      t.status !== "Cancelled" &&
      t.dueDate,
  );


  const groups = useMemo(() => {
    const overdue = myTasks.filter((t) => isOverdue(t.dueDate, t.status,now));

    const todayT = myTasks.filter(
      (t) =>
        t.dueDate &&
        t.status !== "Completed" &&
        t.status !== "Cancelled" &&
        isTaskDueToday(t.dueDate, t.status,now) &&
        !isOverdue(t.dueDate, t.status,now),
    );

    const next3 = myTasks.filter((t) => {
      const diff = differenceInDays(
        startOfDay(new Date(t.dueDate)),
        startOfDay(now),
      );
      return diff > 0 && diff <= 3;
    });

    const thisWeek = myTasks.filter((t) => {
      const diff = differenceInDays(
        startOfDay(new Date(t.dueDate)),
        startOfDay(now),
      );
      return diff > 3 && diff <= 7;
    });

    const later = myTasks.filter((t) => {
      const diff = differenceInDays(
        startOfDay(new Date(t.dueDate)),
        startOfDay(now),
      );
      return diff > 7;
    });

    return {
      Overdue: overdue,
      "Due today": todayT,
      "Next 3 days": next3,
      "This week": thisWeek,
      Later: later,
    };
  }, [myTasks,now]);

  const handleSelect = (task) => openTask(task)

  const handleToggle = (group) => {
    setActiveGroup((prev) => (prev === group ? null : group));
  };


  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Due soon</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Tasks approaching or past their due date
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> New task
        </button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          className="field-input pl-8 pr-8 text-sm"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {groups.Overdue.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            You have <strong>{groups.Overdue.length}</strong> overdue{" "}
            {groups.Overdue.length === 1 ? "task" : "tasks"}.
          </p>
        </div>
      )}

      <div className="h-[calc(100vh-220px)] flex flex-col gap-3 overflow-hidden pr-2 pb-6">
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden pr-2 pb-6">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : myTasks.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="You're all caught up!"
              subtitle="No upcoming due dates."
            />
          ) : (
            <>
              <Group
                title="Overdue"
                color="text-red-500"
                tasks={groups.Overdue}
                onSelect={handleSelect}
                selected={selected}
                active={activeGroup}
                onToggle={handleToggle}
              />
              <Group
                title="Due today"
                color="text-amber-600"
                tasks={groups["Due today"]}
                onSelect={handleSelect}
                selected={selected}
                active={activeGroup}
                onToggle={handleToggle}
              />
              <Group
                title="Next 3 days"
                color="text-brand-600"
                tasks={groups["Next 3 days"]}
                onSelect={handleSelect}
                selected={selected}
                active={activeGroup}
                onToggle={handleToggle}
              />
              <Group
                title="This week"
                color="text-gray-600"
                tasks={groups["This week"]}
                onSelect={handleSelect}
                selected={selected}
                active={activeGroup}
                onToggle={handleToggle}
              />
              <Group
                title="Later"
                color="text-gray-400"
                tasks={groups.Later}
                onSelect={handleSelect}
                selected={selected}
                active={activeGroup}
                onToggle={handleToggle}
              />
            </>
          )}
        </div>
        
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
