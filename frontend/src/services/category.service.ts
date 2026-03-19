import api from './api';

export interface Category {
  categoryId?: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (categoryData: Category): Promise<Category> => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  update: async (id: number, categoryData: Category): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
