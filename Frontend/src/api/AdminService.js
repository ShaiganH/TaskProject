import axiosInstance from './AxiosInstance';

// ── User management ────────────────────────────────────────────────────────────
export const adminGetUsers       = ()          => axiosInstance.get('/api/admin/users');
export const adminToggleBlock    = (id)        => axiosInstance.patch(`/api/admin/users/${id}/block`);
export const adminUpdateName     = (id, data)  => axiosInstance.patch(`/api/admin/users/${id}/name`, data);
export const adminSetDesignation = (id, designation) =>
  axiosInstance.patch(`/api/admin/users/${id}/designation`, { designation });

// ── Stats & activity ───────────────────────────────────────────────────────────
export const adminGetStats    = () => axiosInstance.get('/api/admin/stats');
export const adminGetActivity = () => axiosInstance.get('/api/admin/activity');

// ── Task management ───────────────────────────────────────────────────────────
// Admin can patch priority, dueDate, title, description, assignedToUserId, categoryId
export const adminEditTask = (id, data) => axiosInstance.patch(`/api/admin/tasks/${id}`, data);

// ── Categories ─────────────────────────────────────────────────────────────────
export const adminCreateGlobalCategory = (data)  => axiosInstance.post('/api/admin/categories', data);
export const adminDeleteCategory       = (id)    => axiosInstance.delete(`/api/admin/categories/${id}`);

// ── Public profile (any authenticated user can call) ──────────────────────────
export const getUserProfile = (id) => axiosInstance.get(`/api/users/${id}/profile`);