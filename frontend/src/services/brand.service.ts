import api from './api';
import { Brand } from '@/types';

export const brandService = {
  getActiveBrands: async (): Promise<Brand[]> => {
    const response = await api.get('/brands');
    return response.data;
  },
};
