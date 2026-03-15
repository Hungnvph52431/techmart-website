import api from '../api';
import { AdminCategory } from '@/features/admin/types/catalog';

export const adminCategoryService = {
  getAll: async (): Promise<AdminCategory[]> => {
    const response = await api.get('/admin/categories');
    return response.data;
  },

  getTree: async (): Promise<AdminCategory[]> => {
    const response = await api.get('/admin/categories/tree');
    return response.data;
  },

  create: async (payload: Partial<AdminCategory>): Promise<AdminCategory> => {
    const response = await api.post('/admin/categories', payload);
    return response.data;
  },

  update: async (
    categoryId: number,
    payload: Partial<AdminCategory>
  ): Promise<AdminCategory> => {
    const response = await api.put(`/admin/categories/${categoryId}`, payload);
    return response.data;
  },

  remove: async (categoryId: number): Promise<void> => {
    await api.delete(`/admin/categories/${categoryId}`);
  },
};
