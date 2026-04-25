import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  adminGetUsers,
  adminGetStats,
  adminGetActivity,
  adminToggleBlock,
  adminUpdateName,
  adminSetDesignation,
  adminEditTask,
  adminCreateGlobalCategory,
  adminDeleteCategory,
} from '../api/AdminService';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [adminUsers,    setAdminUsers]    = useState([]);
  const [adminStats,    setAdminStats]    = useState(null);
  const [adminActivity, setAdminActivity] = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Keep the SignalR connection ref so we can attach/detach listeners
  const connRef = useRef(null);

  // ─── Load all admin data ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [usersRes, statsRes, actRes] = await Promise.all([
        adminGetUsers(),
        adminGetStats(),
        adminGetActivity(),
      ]);
      setAdminUsers(usersRes.data   ?? []);
      setAdminStats(statsRes.data   ?? null);
      setAdminActivity(actRes.data  ?? []);
    } catch (err) {
      console.error('[AdminContext] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // ─── Initial load + 30-second polling ──────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin, loadAll]);

  // ─── SignalR real-time: register listeners on the connection ───────────────
  // The connection object is passed in via registerConnection() called from
  // TaskRealtimeProvider so we don't have to create a second hub connection.
  const registerConnection = useCallback((conn) => {
    if (!conn || !isAdmin) return;
    connRef.current = conn;

    // User blocked/unblocked
    conn.on('UserBlocked', ({ userId, blocked }) => {
      setAdminUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, isBlocked: blocked } : u)
      );
      // Also refresh stats (blocked user still counts in totals, but good to keep fresh)
      adminGetStats().then(r => setAdminStats(r.data)).catch(() => {});
    });

    // User name / designation updated by admin
    conn.on('UserUpdated', ({ userId, firstName, lastName, designation }) => {
      setAdminUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, firstName, lastName, designation } : u
        )
      );
    });

    // Task created — bump stats total
    conn.on('TaskCreated', () => {
      adminGetStats().then(r => setAdminStats(r.data)).catch(() => {});
      adminGetActivity().then(r => setAdminActivity(r.data)).catch(() => {});
    });

    // Task updated / status changed — refresh stats + activity
    conn.on('TaskUpdated', () => {
      adminGetStats().then(r => setAdminStats(r.data)).catch(() => {});
      adminGetActivity().then(r => setAdminActivity(r.data)).catch(() => {});
      // Refresh per-user task stats too
      adminGetUsers().then(r => setAdminUsers(r.data ?? [])).catch(() => {});
    });

    conn.on('TaskStatusUpdated', () => {
      adminGetStats().then(r => setAdminStats(r.data)).catch(() => {});
      adminGetActivity().then(r => setAdminActivity(r.data)).catch(() => {});
      adminGetUsers().then(r => setAdminUsers(r.data ?? [])).catch(() => {});
    });

    conn.on('TaskDeleted', () => {
      adminGetStats().then(r => setAdminStats(r.data)).catch(() => {});
      adminGetActivity().then(r => setAdminActivity(r.data)).catch(() => {});
      adminGetUsers().then(r => setAdminUsers(r.data ?? [])).catch(() => {});
    });

    conn.on('TaskCommentAdded', () => {
      adminGetActivity().then(r => setAdminActivity(r.data)).catch(() => {});
    });
  }, [isAdmin]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const toggleBlock = useCallback(async (userId) => {
    const res = await adminToggleBlock(userId);
    // Optimistic update (server also broadcasts via SignalR)
    setAdminUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, isBlocked: res.data.blocked } : u)
    );
    return res.data;
  }, []);

  const updateName = useCallback(async (userId, data) => {
    await adminUpdateName(userId, data);
    setAdminUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, firstName: data.firstName, lastName: data.lastName }
          : u
      )
    );
  }, []);

  const setDesignation = useCallback(async (userId, designation) => {
    await adminSetDesignation(userId, designation);
    setAdminUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, designation } : u)
    );
  }, []);

  const editTask = useCallback(async (taskId, data) => {
    await adminEditTask(taskId, data);
    // Stats / activity will update via SignalR
  }, []);

  const createGlobalCategory = useCallback(async (data) => {
    const res = await adminCreateGlobalCategory(data);
    return res.data;
  }, []);

  const removeCategory = useCallback(async (id) => {
    await adminDeleteCategory(id);
  }, []);

  return (
    <AdminContext.Provider value={{
      adminUsers,
      adminStats,
      adminActivity,
      loading,
      reload: loadAll,
      registerConnection,  // called by TaskRealtimeProvider
      // actions
      toggleBlock,
      updateName,
      setDesignation,
      editTask,
      createGlobalCategory,
      removeCategory,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
