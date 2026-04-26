import { useState, useCallback,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckSquare, Tag, ScrollText, Shield,
  Lock, Unlock, Pencil, Globe, Trash2, RefreshCw,
  AlertTriangle, Check,
} from 'lucide-react';
import { useTask }  from '../context/TaskContext';
import { useAuth }  from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import {
  Avatar, Badge, StatCard, ConfirmModal, Modal, SectionHeader,
} from '../components/UI';
import {
  formatDate, formatDateTime, actionLabel, actionClass,
  statusLabel, getPriorityClass,
} from '../utils/helpers';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: Shield      },
  { id: 'users',      label: 'Users',       icon: Users       },
  { id: 'tasks',      label: 'All tasks',   icon: CheckSquare },
  { id: 'categories', label: 'Categories',  icon: Tag         },
  { id: 'logs',       label: 'Audit log',   icon: ScrollText  },
];

const DESIGNATIONS = ['Intern', 'Junior Developer', 'Senior Developer', 'Team Lead'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function designationColor(d) {
  if (!d) return 'bg-gray-100 text-gray-500';
  if (d === 'Team Lead')        return 'bg-purple-50 text-purple-700';
  if (d === 'Senior Developer') return 'bg-blue-50 text-blue-700';
  if (d === 'Junior Developer') return 'bg-teal-50 text-teal-700';
  return 'bg-amber-50 text-amber-700';
}

// ─── Scrollable table wrapper ─────────────────────────────────────────────────
// Mirrors the same pattern TaskTable uses — card with overflow-auto on tbody area
function ScrollTable({ children, minWidth }) {
  return (
    <div className="card overflow-hidden flex flex-col min-h-0">
      <div className="overflow-auto">
        <table
          className="data-table w-full"
          style={{ tableLayout: 'fixed', minWidth: minWidth ?? 'auto' }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user: u, open, onClose, onSave }) {
  const [firstName,   setFirstName]   = useState(u?.firstName   ?? '');
  const [lastName,    setLastName]    = useState(u?.lastName    ?? '');
  const [designation, setDesignation] = useState(u?.designation ?? '');
  const [saving, setSaving] = useState(false);


useEffect(() => {
  if (u) {
    setFirstName(u.firstName || '');
    setLastName(u.lastName || '');
    setDesignation(u.designation || '');
  }
}, [u, open]);

  if (!open || !u) return null;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(u.id, { firstName: firstName.trim(), lastName: lastName.trim() }, designation);
      toast.success('User updated.');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit user" size="sm"
      footer={
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <Avatar
            initials={(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')}
            size="md" color="blue"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">First name</label>
            <input className="field-input" value={firstName}
              onChange={e => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input className="field-input" value={lastName}
              onChange={e => setLastName(e.target.value)} placeholder="Last name" />
          </div>
        </div>
        <div>
          <label className="field-label">Designation</label>
          <select className="field-input" value={designation}
            onChange={e => setDesignation(e.target.value)}>
            <option value="">— Not set —</option>
            {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin Edit Task Modal ────────────────────────────────────────────────────
function EditTaskModal({ task: t, open, onClose, onSave, allUsers, categories }) {
  const [priority, setPriority] = useState(t?.priority ?? 'Medium');
  const [dueDate,  setDueDate]  = useState(t?.dueDate?.slice(0, 10) ?? '');
  const [title,    setTitle]    = useState(t?.title ?? '');
  const [assignee, setAssignee] = useState(t?.assignedToUserId ?? '');
  const [catId,    setCatId]    = useState(t?.categoryId ?? '');
  const [saving,   setSaving]   = useState(false);

  if (!open || !t) return null;

  const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(t.id, {
        title:            title.trim() || null,
        priority,
        dueDate:          dueDate || null,
        assignedToUserId: assignee || null,
        categoryId:       catId   || null,
      });
      toast.success('Task updated.');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit task (admin)" size="md"
      footer={
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Title</label>
          <input className="field-input" value={title}
            onChange={e => setTitle(e.target.value)} placeholder="Task title" />
        </div>
        <div>
          <label className="field-label">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(p => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  priority === p
                    ? 'bg-brand-50 text-brand-700 border-brand-300 font-semibold'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Due date</label>
            <input type="date" className="field-input" value={dueDate}
              onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="field-input" value={catId}
              onChange={e => setCatId(e.target.value)}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Assigned to</label>
          <select className="field-input" value={assignee}
            onChange={e => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ─── New Global Category Modal ────────────────────────────────────────────────
function GlobalCategoryModal({ open, onClose, onSave }) {
  const [name,   setName]   = useState('');
  const [color,  setColor]  = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color });
      toast.success('Global category created.');
      setName(''); setColor('#3b82f6');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New global category" size="sm"
      footer={
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Name</label>
          <input className="field-input" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Documentation" autoFocus />
        </div>
        <div>
          <label className="field-label">Colour</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color}
              onChange={e => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
            <span className="text-xs text-gray-500">{color}</span>
            <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: color + '22', color }}>
              {name || 'Preview'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Global categories are visible to all users as shared labels.
        </p>
      </div>
    </Modal>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: currentUser }  = useAuth();
  const { tasks, categories, allUsers } = useTask();
  const {
    adminUsers, adminStats, adminActivity, loading, reload,
    toggleBlock, updateName, setDesignation, editTask,
    createGlobalCategory, removeCategory,
  } = useAdmin();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState('overview');
  const [editUser,  setEditUser]  = useState(null);
  const [editTask_, setEditTask_] = useState(null);
  const [blockUser, setBlockUser] = useState(null);
  const [catModal,  setCatModal]  = useState(false);
  const [delCat,    setDelCat]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-full page-enter">
        <div className="text-center">
          <Shield size={32} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-700">Access denied</h2>
          <p className="text-sm text-gray-400 mt-1">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
    toast.success('Data refreshed.');
  };

  const handleSaveUser = async (userId, nameData, designation) => {
    await updateName(userId, nameData);
    if (designation !== undefined) await setDesignation(userId, designation);
  };

  const handleToggleBlock = async () => {
    if (!blockUser) return;
    try {
      const res = await toggleBlock(blockUser.id);
      toast.success(res.blocked
        ? `${blockUser.firstName} has been blocked.`
        : `${blockUser.firstName} has been unblocked.`
      );
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed.');
    } finally {
      setBlockUser(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!delCat) return;
    try {
      await removeCategory(delCat.id);
      toast.success('Category deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed.');
    } finally {
      setDelCat(null);
    }
  };

  const nonAdminUsers = adminUsers.filter(u => u.role !== 'Admin');

  const stats = adminStats ?? {
    totalUsers: 0, totalTasks: 0, completedTasks: 0, overdueTasks: 0,
    tasksByStatus: {}, tasksByPriority: {},
  };

  // ── Layout: fixed header+tabs, scrollable body ─────────────────────────────
  // The outer div uses h-full + flex-col so it fills exactly the space
  // AppLayout gives (h-full flex flex-col min-h-0 in the outlet wrapper).
  // The content area uses overflow-y-auto so only it scrolls, not the whole page.
  return (
    <div className="page-enter h-full flex flex-col min-h-0">

      {/* ── Fixed top: header + stat cards + tabs ── */}
      <div className="flex-shrink-0">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin panel</h1>
              <p className="text-sm text-gray-400">Full system visibility and control</p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Stat cards — always visible regardless of tab */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total users"  value={stats.totalUsers}     sub="registered"       icon={Users}         iconBg="bg-blue-50"  />
          <StatCard label="Total tasks"  value={stats.totalTasks}     sub="across all users" icon={CheckSquare}   iconBg="bg-brand-50" />
          <StatCard label="Completed"    value={stats.completedTasks} sub="all time"         icon={Check}
            valueColor="text-green-600" iconBg="bg-green-50" />
          <StatCard label="Overdue"      value={stats.overdueTasks}   sub="need attention"   icon={AlertTriangle}
            valueColor={stats.overdueTasks > 0 ? 'text-red-500' : 'text-gray-900'}
            iconBg="bg-red-50" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-all ${
                tab === t.id
                  ? 'border-brand-400 text-brand-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content area — grows to fill remaining height ── */}
      <div className="flex-1 overflow-y-auto min-h-0 pt-5 pb-2">

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5 page-enter">

            {/* Tasks by status mini-breakdown */}
            {stats.tasksByStatus && Object.keys(stats.tasksByStatus).length > 0 && (
              <div className="card p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  Tasks by status
                </p>
                <div className="flex gap-3">
                  {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                    <div key={status}
                      className="flex-1 text-center bg-gray-50 rounded-xl py-3 border border-gray-100">
                      <p className="text-lg font-bold text-gray-800">{count}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{statusLabel(status)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User task summary */}
            <div>
              <SectionHeader title="User task summary" />
              <ScrollTable>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>User</th>
                    <th style={{ width: '18%' }}>Designation</th>
                    <th style={{ width: '10%' }}>Assigned</th>
                    <th style={{ width: '12%' }}>In progress</th>
                    <th style={{ width: '12%' }}>Completed</th>
                    <th style={{ width: '10%' }}>Overdue</th>
                    <th style={{ width: '10%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nonAdminUsers.map(u => (
                    <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar initials={(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')} size="sm" color="blue" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${designationColor(u.designation)}`}>
                          {u.designation || '—'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-700">{u.taskStats?.total ?? 0}</td>
                      <td><span className="text-sm text-brand-600 font-medium">{u.taskStats?.inProgress ?? 0}</span></td>
                      <td><span className="text-sm text-green-600 font-medium">{u.taskStats?.completed ?? 0}</span></td>
                      <td>
                        <span className={`text-sm font-medium ${(u.taskStats?.overdue ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {u.taskStats?.overdue ?? 0}
                        </span>
                      </td>
                      <td>
                        {u.isBlocked
                          ? <Badge className="badge-admin">Blocked</Badge>
                          : <Badge className="badge-user">Active</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </div>

            {/* Recent activity */}
            <div>
              <SectionHeader title="Recent activity" />
              <ScrollTable>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Time</th>
                    <th style={{ width: '16%' }}>Action</th>
                    <th style={{ width: '30%' }}>Detail</th>
                    <th style={{ width: '24%' }}>Task</th>
                    <th style={{ width: '14%' }}>User</th>
                  </tr>
                </thead>
                <tbody>
                  {adminActivity.slice(0, 10).map(a => (
                    <tr key={a.id} className="!cursor-default">
                      <td className="text-xs text-gray-400 font-mono">{formatDateTime(a.timestamp)}</td>
                      <td>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionClass(a.action)}`}>
                          {actionLabel(a.action)}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600 truncate">
                        {a.oldValue && a.newValue ? `${a.oldValue} → ${a.newValue}` : '—'}
                      </td>
                      <td className="text-xs text-brand-600 truncate">{a.taskTitle || '—'}</td>
                      <td className="text-xs text-gray-500 truncate">{a.userName?.split(' ')[0] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </div>
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="page-enter">
            <ScrollTable>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>User</th>
                  <th style={{ width: '18%' }}>Designation</th>
                  <th style={{ width: '10%' }}>Tasks</th>
                  <th style={{ width: '14%' }}>Joined</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '14%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nonAdminUsers.map(u => (
                  <tr key={u.id} className="!cursor-default">
                    <td
                      className="cursor-pointer"
                      onClick={() => navigate(`/users/${u.id}`)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          initials={(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')}
                          size="sm"
                          color={u.isBlocked ? 'red' : 'blue'}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${designationColor(u.designation)}`}>
                        {u.designation || '—'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{u.taskStats?.total ?? 0}</td>
                    <td className="text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                    <td>
                      {u.isBlocked
                        ? <Badge className="badge-admin">Blocked</Badge>
                        : <Badge className="badge-user">Active</Badge>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button title="Edit user" className="btn-ghost p-1.5"
                          onClick={() => setEditUser(u)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          title={u.isBlocked ? 'Unblock user' : 'Block user'}
                          className={`btn-ghost p-1.5 ${u.isBlocked
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}
                          onClick={() => setBlockUser(u)}
                        >
                          {u.isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollTable>
          </div>
        )}

        {/* ── ALL TASKS ─────────────────────────────────────────────────────── */}
        {tab === 'tasks' && (
          <div className="page-enter">
            <ScrollTable minWidth={700}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Title</th>
                  <th style={{ width: '11%' }}>Priority</th>
                  <th style={{ width: '13%' }}>Status</th>
                  <th style={{ width: '16%' }}>Assigned to</th>
                  <th style={{ width: '14%' }}>Created by</th>
                  <th style={{ width: '12%' }}>Due</th>
                  <th style={{ width: '6%' }}></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const assignee = allUsers.find(u => u.id === t.assignedToUserId);
                  const creator  = allUsers.find(u => u.id === t.createdByUserId);
                  return (
                    <tr key={t.id} className="!cursor-default">
                      <td className="font-medium text-gray-800 truncate">{t.title}</td>
                      <td><Badge className={getPriorityClass(t.priority)}>{t.priority}</Badge></td>
                      <td className="text-xs text-gray-600">{statusLabel(t.status)}</td>
                      <td>
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              initials={(assignee.firstName?.[0] ?? '') + (assignee.lastName?.[0] ?? '')}
                              size="sm"
                            />
                            <span className="text-xs text-gray-600 truncate">{assignee.firstName}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="text-xs text-gray-500 truncate">
                        {creator ? `${creator.firstName} ${creator.lastName}` : '—'}
                      </td>
                      <td className="text-xs text-gray-500">
                        {t.dueDate ? formatDate(t.dueDate) : '—'}
                      </td>
                      <td>
                        <button className="btn-ghost p-1.5" title="Admin edit"
                          onClick={() => setEditTask_(t)}>
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ScrollTable>
          </div>
        )}

        {/* ── CATEGORIES ────────────────────────────────────────────────────── */}
        {tab === 'categories' && (
          <div className="page-enter">
            <div className="flex justify-end mb-3">
              <button className="btn-primary text-sm flex items-center gap-1.5"
                onClick={() => setCatModal(true)}>
                <Globe size={14} /> New global category
              </button>
            </div>
            <ScrollTable>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Name</th>
                  <th style={{ width: '14%' }}>Type</th>
                  <th style={{ width: '16%' }}>Colour</th>
                  <th style={{ width: '24%' }}>Created by</th>
                  <th style={{ width: '12%' }}>Tasks</th>
                  <th style={{ width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => {
                  const creator = allUsers.find(u => u.id === c.createdByUserId);
                  return (
                    <tr key={c.id} className="!cursor-default">
                      <td className="font-medium text-gray-800">{c.name}</td>
                      <td>
                        {c.isGlobal
                          ? <Badge className="badge-global flex items-center gap-1 w-fit"><Globe size={10} />Global</Badge>
                          : <Badge className="badge-personal">Personal</Badge>}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: (c.color ?? '#3b82f6') + '22', color: c.color ?? '#3b82f6' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: c.color ?? '#3b82f6' }} />
                          {c.color ?? '#3b82f6'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">
                        {creator ? `${creator.firstName} ${creator.lastName}` : '—'}
                      </td>
                      <td className="text-xs text-gray-500">{c.taskCount ?? 0}</td>
                      <td>
                        <button className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDelCat(c)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ScrollTable>
          </div>
        )}

        {/* ── AUDIT LOG ─────────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div className="page-enter">
            <ScrollTable minWidth={600}>
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Time</th>
                  <th style={{ width: '16%' }}>Action</th>
                  <th style={{ width: '30%' }}>Detail</th>
                  <th style={{ width: '24%' }}>Task</th>
                  <th style={{ width: '14%' }}>User</th>
                </tr>
              </thead>
              <tbody>
                {adminActivity.map(a => (
                  <tr key={a.id} className="!cursor-default">
                    <td className="text-xs text-gray-400 font-mono">{formatDateTime(a.timestamp)}</td>
                    <td>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionClass(a.action)}`}>
                        {actionLabel(a.action)}
                      </span>
                    </td>
                    <td className="text-xs text-gray-600 truncate">
                      {a.oldValue && a.newValue ? `${a.oldValue} → ${a.newValue}` : '—'}
                    </td>
                    <td className="text-xs text-brand-600 truncate">{a.taskTitle || '—'}</td>
                    <td className="text-xs text-gray-500 truncate">{a.userName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </ScrollTable>
          </div>
        )}
      </div>

      {/* ── Modals (outside scroll area so they don't get clipped) ── */}
      <EditUserModal
        user={editUser} open={!!editUser}
        onClose={() => setEditUser(null)} onSave={handleSaveUser}
      />
      <EditTaskModal
        task={editTask_} open={!!editTask_}
        onClose={() => setEditTask_(null)} onSave={(id, data) => editTask(id, data)}
        allUsers={nonAdminUsers} categories={categories}
      />
      <GlobalCategoryModal
        open={catModal} onClose={() => setCatModal(false)}
        onSave={createGlobalCategory}
      />
      <ConfirmModal
        open={!!blockUser} onClose={() => setBlockUser(null)}
        onConfirm={handleToggleBlock}
        title={blockUser?.isBlocked ? 'Unblock user' : 'Block user'}
        message={blockUser?.isBlocked
          ? `Unblock ${blockUser?.firstName} ${blockUser?.lastName}? They will be able to log in again.`
          : `Block ${blockUser?.firstName} ${blockUser?.lastName}? They will be immediately signed out and cannot log in.`}
        danger={!blockUser?.isBlocked}
      />
      <ConfirmModal
        open={!!delCat} onClose={() => setDelCat(null)}
        onConfirm={handleDeleteCategory}
        title="Delete category"
        message={`Delete "${delCat?.name}"? Tasks using this category will lose their label.`}
        danger
      />
    </div>
  );
}
