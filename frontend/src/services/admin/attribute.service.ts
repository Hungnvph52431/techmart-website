import api from '../api';
import {
  AdminAttribute,
  CategoryAttributeAssignment,
} from '@/features/admin/types/catalog';

export const adminAttributeService = {
  getAll: async (): Promise<AdminAttribute[]> => {
    const response = await api.get('/admin/attributes');
    return response.data;
  },

  create: async (payload: Partial<AdminAttribute>): Promise<AdminAttribute> => {
    const response = await api.post('/admin/attributes', payload);
    return response.data;
  },

  update: async (
    attributeId: number,
    payload: Partial<AdminAttribute>
  ): Promise<AdminAttribute> => {
    const response = await api.put(`/admin/attributes/${attributeId}`, payload);
    return response.data;
  },

  remove: async (attributeId: number): Promise<void> => {
    await api.delete(`/admin/attributes/${attributeId}`);
  },

  getCategoryAssignments: async (
    categoryId: number
  ): Promise<CategoryAttributeAssignment[]> => {
    const response = await api.get(`/admin/attributes/category/${categoryId}`);
    return response.data;
  },

  assignCategoryAttributes: async (
    categoryId: number,
    attributes: Array<{
      attributeId: number;
      isRequired?: boolean;
      isVariantAxis?: boolean;
      displayOrder?: number;
    }>
  ): Promise<CategoryAttributeAssignment[]> => {
    const response = await api.put(`/admin/attributes/category/${categoryId}`, {
      attributes,
    });
    return response.data;
  },
};
