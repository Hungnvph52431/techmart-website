import api from './api';

export interface Brand {
  brandId?: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isActive?: boolean;
}

export const brandService = {
  getAll: async (): Promise<Brand[]> => {
    const response = await api.get('/brands');
    return response.data;
  },

  getById: async (id: number): Promise<Brand> => {
    const response = await api.get(`/brands/${id}`);
    return response.data;
  },

  create: async (brandData: Brand): Promise<Brand> => {
    const response = await api.post('/brands', brandData);
    return response.data;
  },

  update: async (id: number, brandData: Brand): Promise<Brand> => {
    const response = await api.put(`/brands/${id}`, brandData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
};
