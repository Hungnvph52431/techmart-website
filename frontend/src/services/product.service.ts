import api from './api';
import { Product, ProductFilter, ProductResponse } from '@/types';

export const productService = {
  getAll: async (filters?: ProductFilter): Promise<ProductResponse> => {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const response = await api.get(`/products?${params.toString()}`);

  return response.data;
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const response = await api.get(`/products/slug/${slug}`);
    return response.data;
  },

  createProduct: async (productData: any): Promise<Product> => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id: number, productData: any): Promise<Product> => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
