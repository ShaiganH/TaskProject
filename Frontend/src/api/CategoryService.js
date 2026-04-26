import axiosInstance from './axiosInstance';

export const getCategories = () =>
  axiosInstance.get('/api/categories');

export const getCategoryById = (id) =>
  axiosInstance.get(`/api/categories/${id}`);

export const createCategory = (data) =>
  axiosInstance.post('/api/categories', data);

export const updateCategory = (id, data) =>
  axiosInstance.put(`/api/categories/${id}`, data);

export const deleteCategory = (id) =>
  axiosInstance.delete(`/api/categories/${id}`);