import axiosInstance from './AxiosInstance';

export const createTask = (taskData) =>
  axiosInstance.post('/api/tasks', taskData);

export const getTasksDashboard = (params) =>
  axiosInstance.get('/api/tasks/dashboard', { params });

export const getMyTasks = (params) =>
  axiosInstance.get('/api/tasks/my', { params });

export const getTaskById = (id) =>
  axiosInstance.get(`/api/tasks/${id}`);

export const updateTask = (id, taskData) =>
  axiosInstance.put(`/api/tasks/${id}`, taskData);

export const updateTaskStatus = (id, status) =>
  axiosInstance.patch(`/api/tasks/${id}/status`, { status });

export const deleteTask = (id) =>
  axiosInstance.delete(`/api/tasks/${id}`);

export const postComment = (taskId, content) =>
  axiosInstance.post(`/api/tasks/${taskId}/comments`, { content });

// responseType blob so the browser can trigger a file download
export const exportTasks = (params) =>
  axiosInstance.get('/api/tasks/export', { params, responseType: 'blob' });

export const importTasks = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post('/api/tasks/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};