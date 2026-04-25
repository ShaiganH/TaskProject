import { useState } from "react";
import { Modal, PrioritySelector } from "./UI";
import { useTask } from "../context/TaskContext";
import { useAuth } from "../context/AuthContext";
import { createTask as createTaskAPI } from "../api/TaskService";
import toast from "react-hot-toast";

const COLORS = [
  { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" },
  { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
  { bg: "#FAEEDA", text: "#633806", border: "#FAC775" },
  { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
];

const BLANK = (userId) => ({
  title: "",
  description: "",
  priority: "Medium",
  assignedToUserId: userId ?? "",
  dueDate: "",
  dueTime: "",
  categoryId: "",
  initialStatus: "Todo",
  isPrivate: false,
});

export default function NewTaskModal({ open, onClose }) {
  const { categories, allUsers, createCategory } = useTask();
  const { user } = useAuth();

  const [form, setForm] = useState(BLANK(user?.id));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: COLORS[0] });

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    return errs;
  };

  const buildDueDateTime = () => {
    if (!form.dueDate) return null;

    const time = form.dueTime || "00:00";
    return `${form.dueDate}T${time}:00`;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await createTaskAPI({
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        initialStatus: form.initialStatus,
        assignedToUserId: form.assignedToUserId || null,
        dueDate: buildDueDateTime(),
        categoryId: form.categoryId || null,
        isPrivate: form.isPrivate,
      });
      toast.success("Task created!");
      setForm(BLANK(user?.id));
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewCat = async () => {
    if (!newCat.name.trim()) return;
    try {
      // Creates via API + updates local categories state in TaskContext immediately
      const cat = await createCategory({
        name: newCat.name.trim(),
        color: newCat.color.bg,
        textColor: newCat.color.text,
      });
      set("categoryId", cat.id);
      setShowNewCat(false);
      setNewCat({ name: "", color: COLORS[0] });
      toast.success("Category created");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Failed to create category");
    }
  };

  const globalCats = categories.filter((c) => c.isGlobal);
  const personalCats = categories.filter(
    (c) => !c.isGlobal && c.createdByUserId === user?.id,
  );

  const userName = (u) => {
    if (u.id === user?.id) return `Me (${u.firstName ?? u.email})`;
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      footer={
        <>
          <p className="text-xs text-gray-400">
            Fields marked <span className="text-red-400">*</span> are required
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creating…" : "Create task"}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-3">
        

        {/* Title + Description */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              className={`field-input ${errors.title ? "error" : ""}`}
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={120}
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea
              className="field-input resize-none"
              rows={3}
              placeholder="Add context, steps to reproduce, links…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        {/* Priority + Initial Status */}
        <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="field-label">Priority <span className="text-red-400">*</span></label>
    <PrioritySelector value={form.priority} onChange={(v) => set("priority", v)} />
  </div>
  <div>
    <label className="field-label">Initial status</label>
    <select className="field-input" value={form.initialStatus} onChange={(e) => set("initialStatus", e.target.value)}>
      <option value="Todo">To do</option>
      <option value="InProgress">In progress</option>
    </select>
  </div>
</div>

        {/* Assign + Category */}
        <div className="grid grid-cols-2 gap-3">
          {/* Assign to (full width) */}
          <div>
            <label className="field-label">Assign to</label>
            <select
              className="field-input"
              value={form.assignedToUserId}
              onChange={(e) => set("assignedToUserId", e.target.value)}
            >
              <option value="">— Self assign —</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Due date</label>
              <input
                type="date"
                className="field-input"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Time</label>
              <input
                type="time"
                className="field-input"
                value={form.dueTime || ""}
                onChange={(e) => set("dueTime", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Category</label>
            <select
              className="field-input"
              value={form.categoryId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCat(true);
                  return;
                }
                set("categoryId", e.target.value);
              }}
            >
              <option value="">— None —</option>
              {globalCats.length > 0 && (
                <optgroup label="Global">
                  {globalCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {personalCats.length > 0 && (
                <optgroup label="My categories">
                  {personalCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__new__">+ New category…</option>
            </select>

            {showNewCat && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                <p className="text-xs font-medium text-gray-500">
                  New personal category
                </p>
                <input
                  className="field-input text-xs"
                  placeholder="Category name"
                  value={newCat.name}
                  onChange={(e) =>
                    setNewCat((n) => ({ ...n, name: e.target.value }))
                  }
                />
                <div className="flex gap-1.5">
                  {COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`w-5 h-5 rounded-full transition-all ${newCat.color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                      style={{
                        background: c.bg,
                        border: `1.5px solid ${c.border}`,
                      }}
                      onClick={() => setNewCat((n) => ({ ...n, color: c }))}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-xs py-1 px-3"
                    type="button"
                    onClick={handleSaveNewCat}
                  >
                    Save
                  </button>
                  <button
                    className="btn-secondary text-xs py-1 px-3"
                    type="button"
                    onClick={() => setShowNewCat(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Private toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => set("isPrivate", e.target.checked)}
            className="rounded border-gray-300 text-brand-400 focus:ring-brand-400"
          />
          <span className="text-xs text-gray-600">
            Private task — only visible to you and the assignee
          </span>
        </label>
      </div>
    </Modal>
  );
}
