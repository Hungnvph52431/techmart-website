import api from '../api';
import {
  AdminProduct,
  AdminProductStatus,
  SaveAdminProductPayload,
} from '@/features/admin/types/catalog';

export const adminProductService = {
  getAll: async (filters?: {
    search?: string;
    categoryId?: number;
    status?: AdminProductStatus | 'all';
  }): Promise<AdminProduct[]> => {
    const params = new URLSearchParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/admin/products?${params.toString()}`);
    return response.data;
  },

  getById: async (productId: number): Promise<AdminProduct> => {
    const response = await api.get(`/admin/products/${productId}`);
    return response.data;
  },

  create: async (payload: SaveAdminProductPayload): Promise<AdminProduct> => {
    const response = await api.post('/admin/products', payload);
    return response.data;
  },

  update: async (
    productId: number,
    payload: SaveAdminProductPayload
  ): Promise<AdminProduct> => {
    const response = await api.put(`/admin/products/${productId}`, payload);
    return response.data;
  },

  archive: async (productId: number): Promise<void> => {
    await api.patch(`/admin/products/${productId}/archive`);
  },
};
