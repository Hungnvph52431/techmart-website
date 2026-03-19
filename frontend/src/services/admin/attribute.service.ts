import api from '../api';

export const adminAttributeService = {
  getAll: async () => {
    const response = await api.get('/admin/attributes');
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await api.get(`/admin/attributes/${id}`);
    return response.data;
  },

  create: async (payload: any) => {
    const response = await api.post('/admin/attributes', payload);
    return response.data;
  },

  update: async (id: number | string, payload: any) => {
    const response = await api.put(`/admin/attributes/${id}`, payload);
    return response.data;
  },

  remove: async (id: number | string) => {
    const response = await api.delete(`/admin/attributes/${id}`);
    return response.data;
  },

  getCategoryAssignments: async (categoryId: number | string) => {
    const response = await api.get(`/admin/attributes/category/${categoryId}`);
    return response.data;
  },

  assignCategoryAttributes: async (categoryId: number | string, attributes: any[]) => {
    const response = await api.put(`/admin/attributes/category/${categoryId}`, { attributes });
    return response.data;
  },
};
