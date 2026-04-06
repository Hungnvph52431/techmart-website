import { AdminCategory } from '@/features/admin/types/catalog';
import api from '../api';

export const adminCategoryService = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  getTree: async () => {
    const response = await api.get('/categories/tree');
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (payload: any) => {
    const response = await api.post('/categories', payload);
    return response.data;
  },

  update: async (id: number | string, payload: any) => {
    const response = await api.put(`/categories/${id}`, payload);
    return response.data;
  },

  remove: async (id: number | string) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
  getDeleted: async (): Promise<AdminCategory[]> => {
    const res = await api.get('/admin/categories/deleted');
    return res.data;
  },

  restore: async (id: number | string) => {
    const res = await api.patch(`/admin/categories/${id}/restore`);
    return res.data;
  },
};
