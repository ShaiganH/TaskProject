import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Lock, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTask } from "../context/TaskContext";
import { Modal, ConfirmModal, EmptyState } from "../components/UI";
import { Tag } from "lucide-react";
import toast from "react-hot-toast";

const PALETTE = [
  { bg: "#EEEDFE", text: "#3C3489", label: "Purple" },
  { bg: "#E6F1FB", text: "#0C447C", label: "Blue" },
  { bg: "#E1F5EE", text: "#085041", label: "Teal" },
  { bg: "#FAEEDA", text: "#633806", label: "Amber" },
  { bg: "#FCEBEB", text: "#A32D2D", label: "Red" },
  { bg: "#EAF3DE", text: "#27500A", label: "Green" },
  { bg: "#F1EFE8", text: "#444441", label: "Gray" },
  { bg: "#FBEAF0", text: "#72243E", label: "Pink" },
];




function CategoryCard({ cat, taskCount, onEdit, onDelete, canEdit }) {
  return (
    <div className="card p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div
        className="w-9 h-9 rounded-xl flex-shrink-0 border"
        style={{
          background: cat.color,
          borderColor: (cat.textColor ?? "#888") + "40",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">
            {cat.name}
          </span>
          {cat.isGlobal ? (
            <span className="badge badge-global flex items-center gap-1 text-[10px]">
              <Globe size={9} /> Global
            </span>
          ) : (
            <span className="badge badge-personal text-[10px]">Personal</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </p>
      </div>
      <div className="flex gap-1.5">
        {canEdit ? (
          <>
            <button className="btn-ghost p-1.5" onClick={() => onEdit(cat)}>
              <Pencil size={13} />
            </button>
            <button
              className="btn-ghost p-1.5 text-red-400 hover:bg-red-50"
              onClick={() => onDelete(cat)}
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-400 px-2">
            <Lock size={11} />
            <span>Read only</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryFormModal({ open, onClose, initial, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(
    PALETTE.find((p) => p.bg === initial?.color) ?? PALETTE[0],
  );
  const [err, setErr] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    onSave({ name: name.trim(), color: color.bg, textColor: color.text });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit category" : "New category"}
      size="sm"
      footer={
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {initial ? "Save" : "Create"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Name</label>
          <input
            className={`field-input ${err ? "error" : ""}`}
            placeholder="e.g. Client - XYZ"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
            autoFocus
          />
          {err && <p className="field-error">{err}</p>}
        </div>
        <div>
          <label className="field-label">Color</label>
          <div className="grid grid-cols-4 gap-2">
            {PALETTE.map((p) => (
              <button
                key={p.bg}
                type="button"
                title={p.label}
                onClick={() => setColor(p)}
                className={`h-10 rounded-xl border-2 flex items-center justify-center transition-all ${color.bg === p.bg ? "border-gray-700 scale-105" : "border-transparent hover:border-gray-300"}`}
                style={{ background: p.bg }}
              >
                {color.bg === p.bg && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.text }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Preview</label>
          <span
            className="badge text-xs px-2.5 py-1"
            style={{ background: color.bg, color: color.text }}
          >
            {name || "Category name"}
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { categories, tasks, createCategory, updateCategory, deleteCategory } =
    useTask();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("categoriesTab") || "personal"
  );
  console.log(categories);

  const globalCats = categories.filter((c) => c.isGlobal);
  const personalCats = categories.filter(
    (c) => !c.isGlobal && c.createdByUserId === user?.id,
  );
  const sharedCats = categories.filter(
    (c) => !c.isGlobal && c.createdByUserId !== user?.id,
  );

  const TABS = [
  { label: `Global (${globalCats.length})`, value: "global" },
  { label: `My categories (${personalCats.length})`, value: "personal" },
  { label: `Shared (${sharedCats.length})`, value: "shared" },
];
  const taskCount = (id) => categories.find(c => c.id === id)?.taskCount ?? 0;
  const handleSave = async (data) => {
    try {
      if (editing) {
        await updateCategory(editing.id, data);
        toast.success("Category updated");
      } else {
        await createCategory(data);
        toast.success("Category created");
      }
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Failed to save category");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(delTarget.id);
      toast.success("Category deleted");
    } catch (e) {
      toast.error(
        e?.response?.data ?? "Failed to delete — active tasks may be using it",
      );
    }
    setDelTarget(null);
  };

  useEffect(() => {
  localStorage.setItem("categoriesTab", activeTab);
}, [activeTab]);
  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Organise your tasks with labels
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={15} /> New category
        </button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              activeTab === t.value
                ? "bg-brand-50 text-brand-800 border-brand-200 font-medium"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Global */}
      <div className="card h-[calc(100vh-220px)] overflow-y-auto p-3">
  {activeTab === "global" && (
    globalCats.length === 0 ? (
      <p className="text-sm text-gray-400">No global categories yet.</p>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {globalCats.map((c) => (
          <CategoryCard
            key={c.id}
            cat={c}
            taskCount={taskCount(c.id)}
            canEdit={user?.role === "Admin"}
            onEdit={() => {
              setEditing(c);
              setFormOpen(true);
            }}
            onDelete={() => setDelTarget(c)}
          />
        ))}
      </div>
    )
  )}

  {activeTab === "personal" && (
    personalCats.length === 0 ? (
      <EmptyState
        icon={Tag}
        title="No personal categories yet"
        subtitle="Create your own labels to organise tasks your way"
        action={
          <button
            className="btn-primary mt-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} /> New category
          </button>
        }
      />
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {personalCats.map((c) => (
          <CategoryCard
            key={c.id}
            cat={c}
            taskCount={taskCount(c.id)}
            canEdit
            onEdit={() => {
              setEditing(c);
              setFormOpen(true);
            }}
            onDelete={() => setDelTarget(c)}
          />
        ))}
      </div>
    )
  )}

  {activeTab === "shared" && (
    sharedCats.length === 0 ? (
      <div className="h-full flex items-center justify-center text-center px-4">
      <p className="text-sm text-gray-400 max-w-xs">
        Shared categories will appear here when tasks are assigned to you by others.
      </p>
    </div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {sharedCats.map((c) => (
          <CategoryCard
            key={c.id}
            cat={c}
            taskCount={taskCount(c.id)}
            canEdit={false}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
      </div>
    )
  )}
</div>

      <CategoryFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={handleSave}
      />
      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        title="Delete category"
        message={`Delete "${delTarget?.name}"? Tasks in this category will become uncategorised.`}
        danger
      />
    </div>
  );
}
