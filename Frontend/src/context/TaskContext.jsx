import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  getTasksDashboard,
  getMyTasks,
  createTask as createTaskAPI,
  updateTask as updateTaskAPI,
  updateTaskStatus as updateTaskStatusAPI,
  deleteTask as deleteTaskAPI,
  postComment as postCommentAPI,
} from '../api/TaskService'
import {
  getCategories,
  createCategory as createCategoryAPI,
  updateCategory as updateCategoryAPI,
  deleteCategory as deleteCategoryAPI,
} from '../api/CategoryService'
import { getAuditLogs, getUsers } from '../api/UserService'

const TaskContext = createContext(null)

export function TaskProvider({ children }) {
  const { user } = useAuth()

  const [tasks,      setTasks]      = useState([])

  const [categories, setCategories] = useState([])
  const [allUsers,   setAllUsers]   = useState([])
  const [pagination, setPagination] = useState({ totalCount: 0, page: 1, pageSize: 20, totalPages: 1 })
  const [loading,    setLoading]    = useState(false)

  const statusMap = {
  1: 'Todo',
  2: 'InProgress',
  3: 'OnHold',
  4: 'Completed',
  5: 'Cancelled',
}

  // ── Bootstrap on login ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchCategories()
    fetchUsers()
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchTasks()
  }, [user])

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const res  = await getTasksDashboard(params)
      const data = res.data
      setTasks(data.items ?? [])
      setPagination({
        totalCount: data.totalCount ?? 0,
        page:       data.page       ?? 1,
        pageSize:   data.pageSize   ?? 20,
        totalPages: data.totalPages ?? 1,
      })
    } catch (err) {
      console.error('fetchTasks failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── New fetchMyTasks (MyTasksPage) ────────────────────────────────────────
  const fetchMyTasks = useCallback(async (params = {}) => {
  try {
    const res = await getMyTasks(params)
    return res.data
  } catch (err) {
    console.error("fetchMyTasks failed", err)
    return { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 1 }
  }
}, [])

  

  const createTask = useCallback(async (data) => {
    const res = await createTaskAPI(data)
    setTasks(prev => [res.data, ...prev])
    return res.data
  }, [])

  const updateTask = useCallback(async (id, updates) => {
    const res = await updateTaskAPI(id, updates)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...res.data } : t))
    return res.data
  }, [])

  const updateTaskStatus = useCallback(async (id, status) => {
    await updateTaskStatusAPI(id, status)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }, [])

  const deleteTask = useCallback(async (id) => {
    await deleteTaskAPI(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const addComment = useCallback(async (taskId, content) => {
    const res = await postCommentAPI(taskId, content)
    return res.data
  }, [])

  // ── Real-time cache mutators (called by SignalR provider) ─────────────────
  // These are the ONLY place we mutate tasks from a SignalR event.
  // They are intentionally separate from the API methods above so the
  // realtime provider never calls the API — it only updates the cache.

  const rtTaskCreated = useCallback((task) => {
    setTasks(prev => {
      // Deduplicate — if optimistic insert already added it, skip
      if (prev.some(t => t.id === task.id)) return prev
      return [task, ...prev]
    })
  }, [])
  

  const rtTaskUpdated = useCallback((taskId, patch) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t))
  }, [])

  const rtTaskDeleted = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  const rtCommentAdded = useCallback((taskId, comment) => {
    // Append comment to the matching task's comments array
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, comments: [...(t.comments ?? []), comment], commentCount: (t.commentCount ?? 0) + 1 }
        : t
    ))
  }, [])

  const rtCategoryCreated = useCallback((cat) => {
    setCategories(prev => {
      if (prev.some(c => c.id === cat.id)) return prev
      return [...prev, cat]
    })
  }, [])

  const rtCategoryUpdated = useCallback((catId, patch) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, ...patch } : c))
  }, [])

  const rtCategoryDeleted = useCallback((catId) => {
    setCategories(prev => prev.filter(c => c.id !== catId))
  }, [])

  // ── Categories ────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategories()
      setCategories(res.data ?? [])
    } catch (err) {
      console.error('fetchCategories failed', err)
    }
  }, [])

  const createCategory = useCallback(async (data) => {
    const res = await createCategoryAPI(data)
    setCategories(prev => [...prev, res.data])
    return res.data
  }, [])

  const updateCategory = useCallback(async (id, data) => {
    const res = await updateCategoryAPI(id, data)
    setCategories(prev => prev.map(c => c.id === id ? res.data : c))
    return res.data
  }, [])

  const deleteCategory = useCallback(async (id) => {
    await deleteCategoryAPI(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── Audit logs ────────────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async (params = {}) => {
    try {
      const res = await getAuditLogs(params)
      return res.data
    } catch (err) {
      console.error('fetchAuditLogs failed', err)
      return { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 1 }
    }
  }, [])

  // ── Users ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await getUsers()
      setAllUsers(res.data ?? [])
    } catch (err) {
      console.error('fetchUsers failed', err)
    }
  }, [])

  const getUserById = useCallback((id) =>
    allUsers.find(u => u.id === id) ?? null
  , [allUsers])

  return (
    <TaskContext.Provider value={{
      tasks, categories, allUsers, pagination, loading,
     fetchTasks, fetchMyTasks,
      createTask, updateTask, updateTaskStatus, deleteTask, addComment,
      createCategory, updateCategory, deleteCategory, fetchCategories,
      fetchAuditLogs,
      getUserById,
      // Real-time mutators — used exclusively by TaskRealtimeProvider
      rtTaskCreated, rtTaskUpdated, rtTaskDeleted, rtCommentAdded,
      rtCategoryCreated, rtCategoryUpdated, rtCategoryDeleted,
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export const useTask = () => {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTask must be used within TaskProvider')
  return ctx
}
