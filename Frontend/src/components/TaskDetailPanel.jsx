import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Send,
  Pencil,
  Trash2,
  Clock,
  User,
  Tag,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Activity,
  ChevronDown,
  Circle,
  PauseCircle,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTask } from "../context/TaskContext";
import { useAuth } from "../context/AuthContext";
import { Avatar, Badge, ConfirmModal, PrioritySelector } from "./UI";
import {
  formatDate,
  formatDateTime,
  getPriorityClass,
  statusLabel,
  actionLabel,
  actionClass,
} from "../utils/helpers";
import {
  getTaskById,
  postComment as postCommentAPI,
  updateTaskStatus as updateStatusAPI,
  updateTask as updateTaskAPI,
  deleteTask as deleteTaskAPI,
} from "../api/TaskService";
import { useRealtime } from "../realtime/TaskRealtimeProvider";
import toast from "react-hot-toast";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Todo: {
    label: "To Do",
    icon: Circle,
    color: "#6b7280",
    barColor: "#9ca3af",
    step: 0,
  },
  InProgress: {
    label: "In Progress",
    icon: Loader2,
    color: "#2563eb",
    barColor: "#3b82f6",
    step: 1,
  },
  OnHold: {
    label: "On Hold",
    icon: PauseCircle,
    color: "#d97706",
    barColor: "#f59e0b",
    step: 1,
  },
  Completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "#16a34a",
    barColor: "#22c55e",
    step: 2,
  },
  Cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "#dc2626",
    barColor: "#ef4444",
    step: 2,
  },
};

const PRIORITY_CFG = {
  Low: {
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-200",
    dot: "bg-green-400",
  },
  Medium: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-200",
    dot: "bg-yellow-400",
  },
  High: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200",
    dot: "bg-orange-400",
  },
  Critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-red-500",
  },
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
function StatusProgressBar({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Todo;
  const isOnHold = status === "OnHold";
  const isCancelled = status === "Cancelled";
  const isCompleted = status === "Completed";
  const isInProgress = status === "InProgress";
  const isTodo = status === "Todo";

  const widthMap = {
    Todo: "0%",
    InProgress: "50%",
    OnHold: "50%",
    Completed: "100%",
    Cancelled: "100%",
  };
  const width = widthMap[status] ?? "0%";

  const steps = [
    { label: "To Do", active: true },
    { label: "Progress", active: !isTodo },
    { label: "Done", active: isCompleted || isCancelled },
  ];

  return (
    <div className="px-5 pb-5 pt-2">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {steps.map((s, i) => (
          <span
            key={i}
            className={`text-[10px] font-semibold transition-colors duration-300 ${s.active ? "text-gray-500" : "text-gray-300"}`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Track */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        {/* Filled bar */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: cfg.barColor }}
          initial={{ width: "0%" }}
          animate={{ width }}
          transition={{ duration: 0.75, ease: [0.34, 1.2, 0.64, 1] }}
        />

        {/* InProgress shimmer */}
        {isInProgress && (
          <motion.div
            className="absolute inset-y-0 w-20 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
            }}
            animate={{ left: ["-30%", "130%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1,
            }}
          />
        )}

        {/* OnHold pulse */}
        {isOnHold && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: cfg.barColor, width }}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-between mt-2">
        {[0, 1, 2].map((i) => {
          const stepIndex =
            isCancelled || isCompleted ? 2 : isInProgress || isOnHold ? 1 : 0;
          const active = i <= stepIndex;
          const current = i === stepIndex;
          return (
            <motion.div
              key={i}
              animate={{ scale: current ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.45, delay: current ? 0.55 : 0 }}
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{
                background: current
                  ? cfg.barColor
                  : active
                    ? "#9ca3af"
                    : "#e5e7eb",
                boxShadow: current ? `0 0 0 3px ${cfg.barColor}25` : "none",
              }}
            />
          );
        })}
      </div>

      {/* Status pill */}
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center mt-3"
      >
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            background: `${cfg.barColor}15`,
            color: cfg.barColor,
            border: `1px solid ${cfg.barColor}30`,
          }}
        >
          {(() => {
            const Icon = cfg.icon;
            return (
              <Icon
                size={10}
                className={isInProgress ? "animate-spin" : ""}
                style={{ animationDuration: "2.5s" }}
              />
            );
          })()}
          {cfg.label}
        </span>
      </motion.div>
    </div>
  );
}

// ── Custom Status Dropdown ────────────────────────────────────────────────────
function StatusDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CFG[value] ?? STATUS_CFG.Todo;
  const Icon = cfg.icon;

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all shadow-sm ${
          disabled
            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow cursor-pointer"
        }`}
      >
        <Icon
          size={12}
          style={{ color: cfg.color, animationDuration: "2.5s" }}
          className={value === "InProgress" ? "animate-spin" : ""}
        />
        <span style={{ color: cfg.color }}>{cfg.label}</span>
        {!disabled && (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={11} className="text-gray-400" />
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute right-0 top-full mt-2 z-50 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden py-1.5"
          >
            {Object.entries(STATUS_CFG).map(([key, sc]) => {
              const SIcon = sc.icon;
              const isSel = key === value;
              return (
                <motion.button
                  key={key}
                  whileHover={{ x: 3, backgroundColor: "#f9fafb" }}
                  onClick={() => {
                    setOpen(false);
                    onChange(key);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${isSel ? "bg-gray-50" : ""}`}
                >
                  <SIcon
                    size={13}
                    style={{ color: sc.color }}
                    className={key === "InProgress" ? "animate-spin" : ""}
                  />
                  <span style={{ color: isSel ? sc.color : "#374151" }}>
                    {sc.label}
                  </span>
                  {isSel && (
                    <motion.div
                      layoutId="ddot"
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: sc.color }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaskDetailPanel({ task, onClose, onRefresh }) {
  const { categories, allUsers } = useTask();
  const { user } = useAuth();
  const navigate = useNavigate();
  const connection = useRealtime();
  const commentEndRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dueDate: task.dueDate?.slice(0, 10) ?? "",
    categoryId: task.categoryId ?? "",
  });

  const fetchDetail = useCallback(async () => {
    try {
      const res = await getTaskById(task.id);
      setDetail(res.data);
    } catch {
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (!connection) return;
    const onComment = (p) => {
      if (p.taskId !== task.id) return;
      setDetail((prev) => {
        if (!prev) return prev;
        if (prev.comments?.some((c) => c.id === p.id)) return prev;
        return {
          ...prev,
          comments: [
            ...(prev.comments ?? []),
            {
              id: p.id,
              content: p.content,
              userId: p.userId,
              createdAt: p.createdAt,
            },
          ],
        };
      });
    };
    const onStatus = (p) => {
      if (p.id === task.id)
        setDetail((d) => (d ? { ...d, status: p.status } : d));
    };
    const onUpdated = (p) => {
      if (p.id === task.id) setDetail((d) => (d ? { ...d, ...p } : d));
    };
    connection.on("TaskCommentAdded", onComment);
    connection.on("TaskStatusUpdated", onStatus);
    connection.on("TaskUpdated", onUpdated);
    return () => {
      connection.off("TaskCommentAdded", onComment);
      connection.off("TaskStatusUpdated", onStatus);
      connection.off("TaskUpdated", onUpdated);
    };
  }, [connection, task.id]);

  const display = detail ?? task;
  const cat = categories.find((c) => c.id === display.categoryId);
  const resolve = (id) => allUsers.find((u) => u.id === id);
  const creator = resolve(display.createdByUserId);
  const assignee = resolve(display.assignedToUserId);
  const taskComments = detail?.comments ?? [];
  const taskAudit = detail?.auditLogs ?? [];

  const isAdmin = user?.role === "Admin";
  const isCreator = display.createdByUserId === user?.id;
  const isAssignee = display.assignedToUserId === user?.id;
  const canFullEdit = isAdmin || isCreator;
  const canStatus = isAdmin || isCreator || isAssignee;
  const canComment = isAdmin || isCreator || isAssignee;
  const isLocked =
    display.status === "Completed" || display.status === "Cancelled";
  const isOverdue =
    display.dueDate && new Date(display.dueDate) < new Date() && !isLocked;

  const priorityCfg = PRIORITY_CFG[display.priority] ?? PRIORITY_CFG.Medium;

  const handleStatusChange = (s) => {
    if (s === "Completed" || s === "Cancelled") {
      setPendingStatus(s);
      setStatusConfirm(true);
      return;
    }
    applyStatusChange(s);
  };

  const applyStatusChange = async (newStatus) => {
    const prev = display.status;
    setDetail((d) => (d ? { ...d, status: newStatus } : d));
    try {
      await updateStatusAPI(display.id, newStatus);
      toast.success("Status updated");
      onRefresh?.();
    } catch (err) {
      setDetail((d) => (d ? { ...d, status: prev } : d));
      toast.error(err?.response?.data.error ?? err?.response?.data ?? "Failed");
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    const text = comment.trim();
    setComment("");
    const oid = "optimistic-" + Date.now();
    setDetail((p) =>
      p
        ? {
            ...p,
            comments: [
              ...(p.comments ?? []),
              {
                id: oid,
                content: text,
                userId: user.id,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : p,
    );
    setTimeout(
      () => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
    try {
      await postCommentAPI(display.id, text);
      await fetchDetail();
      toast.success("Comment added");
    } catch (err) {
      setDetail((p) =>
        p
          ? { ...p, comments: (p.comments ?? []).filter((c) => c.id !== oid) }
          : p,
      );
      setComment(text);
      toast.error(
        err?.response?.data.error ??
          err?.response?.data ??
          "Failed to add comment",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateTaskAPI(display.id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        assignedToUserId: display.assignedToUserId,
        dueDate: form.dueDate || null,
        categoryId: form.categoryId || null,
      });
      await fetchDetail();
      setEditing(false);
      toast.success("Task updated");
      onRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error ?? err?.response?.data ?? "Failed",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTaskAPI(display.id);
      toast.success("Task deleted");
      onClose();
      onRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error ?? err?.response?.data ?? "Failed",
      );
    }
  };

  return (
    <>
      <div
        className="h-screen w-full bg-white flex flex-col"
        style={{
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* ══ HEADER — flight card style ══════════════════════════════════ */}
        <div
          className="flex-shrink-0 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {/* Subtle dot-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative px-5 pt-4">
            {/* Action bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                {canFullEdit && !isLocked && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setEditing(!editing)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                      editing
                        ? "bg-brand-50 text-brand-700 border-brand-200"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 shadow-sm"
                    }`}
                  >
                    <Pencil size={11} /> {editing ? "Editing" : "Edit"}
                  </motion.button>
                )}
                {canFullEdit && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setDelOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                  >
                    <Trash2 size={11} /> Delete
                  </motion.button>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.08, rotate: 90 }}
                transition={{ duration: 0.16 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-700 shadow-sm transition-colors"
              >
                <X size={13} />
              </motion.button>
            </div>

            {/* Title / Edit form */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="skeleton"
                  className="space-y-2 pb-5 animate-pulse"
                >
                  <div className="h-4 bg-gray-200/70 rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                  <div className="flex gap-1.5 mt-2">
                    <div className="h-4 w-14 bg-gray-100 rounded-full" />
                    <div className="h-4 w-20 bg-gray-100 rounded-full" />
                  </div>
                </motion.div>
              ) : editing ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 pb-5"
                >
                  <input
                    className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all shadow-sm"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Task title"
                  />
                  <textarea
                    className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs text-gray-600 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all shadow-sm"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Add a description…"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all shadow-sm"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dueDate: e.target.value }))
                      }
                    />
                    <select
                      className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all shadow-sm"
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categoryId: e.target.value }))
                      }
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <PrioritySelector
                    value={form.priority}
                    onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                  />
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pb-4"
                >
                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.ring}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`}
                      />
                      {display.priority}
                    </span>
                    {cat && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1"
                        style={{
                          background: `${cat.color}15`,
                          color: cat.color,
                          boxShadow: `0 0 0 1px ${cat.color}25`,
                        }}
                      >
                        <Tag size={8} />
                        {cat.name}
                      </span>
                    )}
                    {isOverdue && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200"
                      >
                        <AlertCircle size={8} />
                        Overdue
                      </motion.span>
                    )}
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200">
                        <Lock size={8} />
                        Locked
                      </span>
                    )}
                  </div>
                  {/* Title */}
                  <h2 className="text-[15px] font-bold text-gray-900 leading-snug">
                    {display.title}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar — flush to header bottom */}
            {!loading && !editing && (
              <StatusProgressBar status={display.status} />
            )}
          </div>
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto">
          {/* Flight-card perforation divider */}
          <div className="flex items-center px-4 py-0 select-none pointer-events-none">
            <div className="flex-1 border-t border-dashed border-gray-200" />
            <div className="mx-3">
              <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200" />
            </div>
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>

          <div className="px-5 pt-4 pb-8 space-y-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[75, 50, 66, 83, 45].map((w, i) => (
                  <div
                    key={i}
                    className="h-2.5 bg-gray-100 rounded-full"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : (
              !editing && (
                <>
                  {/* Description */}
                  {display.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3"
                    >
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Description
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {display.description}
                      </p>
                    </motion.div>
                  )}

                  {/* Meta card */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 }}
                    className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50"
                    style={{
                      background:
                        "linear-gradient(180deg,#fafafa 0%,#ffffff 100%)",
                    }}
                  >
                    {[
                      {
                        icon: Activity,
                        label: "Status",
                        value: (
                          <StatusDropdown
                            value={display.status}
                            onChange={handleStatusChange}
                            disabled={!canStatus || isLocked}
                          />
                        ),
                      },
                      {
                        icon: User,
                        label: "Assigned to",
                        // Assigned to
                        value: assignee ? (
                          <button
                            onClick={() => navigate(`/users/${assignee.id}`)}
                            className="flex items-center gap-1.5"
                          >
                            <Avatar
                              initials={
                                (assignee.firstName?.[0] ?? "") +
                                (assignee.lastName?.[0] ?? "")
                              }
                              size="sm"
                              imageUrl={assignee?.profilePictureUrl}
                            />
                            <span className="text-xs text-gray-700 font-medium hover:text-brand-600 transition-colors">
                              {assignee.firstName} {assignee.lastName}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Unassigned
                          </span>
                        ),
                      },
                      {
                        icon: User,
                        label: "Created by",
                        value: creator ? (
                          <button
                            onClick={() => navigate(`/users/${creator.id}`)}
                            className="flex items-center gap-1.5"
                          >
                            <Avatar
                              initials={
                                (creator.firstName?.[0] ?? "") +
                                (creator.lastName?.[0] ?? "")
                              }
                              size="sm"
                              imageUrl={creator?.profilePictureUrl}
                            />
                            <span className="text-xs text-gray-700 font-medium hover:text-violet-600 transition-colors">
                              {creator.firstName} {creator.lastName}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        ),
                      },
                      {
                        icon: Calendar,
                        label: "Due date",
                        value: (
                          <span
                            className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-700"}`}
                          >
                            {formatDate(display.dueDate) ?? (
                              <span className="text-gray-400 font-normal">
                                Not set
                              </span>
                            )}
                          </span>
                        ),
                      },
                      {
                        icon: Clock,
                        label: "Created",
                        value: (
                          <span className="text-xs text-gray-500">
                            {formatDate(display.createdAt)}
                          </span>
                        ),
                      },
                    ].map(({ icon: Icon, label, value }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={11} className="text-gray-400" />
                          <span className="text-[11px] font-medium text-gray-500">
                            {label}
                          </span>
                        </div>
                        {value}
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── Tabs ───────────────────────────────────────────────── */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {/* Pill switcher */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
                      {[
                        {
                          id: "comments",
                          label: "Comments",
                          icon: MessageSquare,
                          count: taskComments.length,
                        },
                        {
                          id: "activity",
                          label: "Activity",
                          icon: Activity,
                          count: taskAudit.length,
                        },
                      ].map((tab) => (
                        <motion.button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activeTab === tab.id
                              ? "text-gray-800"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {activeTab === tab.id && (
                            <motion.div
                              layoutId="pill-bg"
                              className="absolute inset-0 bg-white rounded-lg shadow-sm"
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              }}
                            />
                          )}
                          <span className="relative flex items-center gap-1.5">
                            <tab.icon size={11} />
                            {tab.label}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-gray-100 text-gray-500" : "bg-gray-200/60 text-gray-400"}`}
                            >
                              {tab.count}
                            </span>
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Tab panes */}
                    <AnimatePresence mode="wait">
                      {activeTab === "comments" ? (
                        <motion.div
                          key="comments"
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={{ duration: 0.17 }}
                        >
                          <div className="space-y-3 mb-4 min-h-[60px]">
                            {taskComments.length === 0 ? (
                              <div className="flex flex-col items-center py-8 text-gray-300">
                                <MessageSquare
                                  size={26}
                                  strokeWidth={1.3}
                                  className="mb-2"
                                />
                                <p className="text-xs text-gray-400 font-medium">
                                  No comments yet
                                </p>
                                <p className="text-[10px] text-gray-300 mt-0.5">
                                  Start the conversation
                                </p>
                              </div>
                            ) : (
                              taskComments.map((c, idx) => {
                                const u = allUsers.find(
                                  (u) => u.id === c.userId,
                                );
                                const initials =
                                  (u?.firstName?.[0] ?? "") +
                                    (u?.lastName?.[0] ?? "") || "?";
                                const name = u
                                  ? `${u.firstName} ${u.lastName}`
                                  : (c.userName ?? "Unknown");
                                const isOpt = c.id?.startsWith?.("optimistic-");
                                const isMe = c.userId === user?.id;
                                return (
                                  <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{
                                      opacity: isOpt ? 0.65 : 1,
                                      y: 0,
                                    }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex gap-2.5"
                                  >
                                    <Avatar
                                      initials={initials}
                                      size="sm"
                                      imageUrl={u?.profilePictureUrl}
                                    />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-[11px] font-semibold text-gray-700">
                                          {name}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                          {formatDateTime(c.createdAt)}
                                        </span>
                                        {isOpt && (
                                          <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                                            <Loader2
                                              size={9}
                                              className="animate-spin"
                                            />
                                            Sending
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                        {c.content}
                                      </p>
                                    </div>
                                  </motion.div>
                                );
                              })
                            )}
                            <div ref={commentEndRef} />
                          </div>

                          {canComment && (
                            <div className="flex gap-2">
                              <input
                                className="flex-1 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
                                placeholder="Write a comment…"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  !e.shiftKey &&
                                  handleSendComment()
                                }
                              />
                              <motion.button
                                whileHover={{ scale: 1.07 }}
                                whileTap={{ scale: 0.93 }}
                                onClick={handleSendComment}
                                disabled={saving || !comment.trim()}
                                className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-40 shadow-sm"
                              >
                                {saving ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Send size={13} />
                                )}
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="activity"
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={{ duration: 0.17 }}
                        >
                          {taskAudit.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-gray-300">
                              <Activity
                                size={26}
                                strokeWidth={1.3}
                                className="mb-2"
                              />
                              <p className="text-xs text-gray-400 font-medium">
                                No activity yet
                              </p>
                            </div>
                          ) : (
                            <div className="relative space-y-0 pl-1">
                              <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gray-100" />
                              {taskAudit.map((a, idx) => {
                                const u = allUsers.find(
                                  (u) => u.id === a.userId,
                                );
                                const name = u
                                  ? `${u.firstName} ${u.lastName}`
                                  : (a.userName ?? "Unknown");
                                return (
                                  <motion.div
                                    key={a.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="flex gap-3 items-start pb-3.5"
                                  >
                                    <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-200 flex-shrink-0 mt-0.5 z-10" />
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${actionClass(a.action)}`}
                                        >
                                          {actionLabel(a.action)}
                                        </span>
                                        {a.oldValue && a.newValue && (
                                          <span className="text-[10px] text-gray-400">
                                            {a.oldValue}
                                            <span className="mx-1 text-gray-300">
                                              →
                                            </span>
                                            <span className="text-gray-600 font-medium">
                                              {a.newValue}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400">
                                        {name} · {formatDateTime(a.timestamp)}
                                      </p>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </>
              )
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={handleDelete}
        title="Delete task"
        message="Are you sure? This action cannot be undone."
        danger
      />
      <ConfirmModal
        open={statusConfirm}
        onClose={() => {
          setStatusConfirm(false);
          setPendingStatus(null);
        }}
        onConfirm={() => {
          setStatusConfirm(false);
          applyStatusChange(pendingStatus);
        }}
        title={`Mark as ${pendingStatus}?`}
        message={`Setting a task to ${pendingStatus} is permanent and cannot be undone.`}
        danger
      />
    </>
  );
}
