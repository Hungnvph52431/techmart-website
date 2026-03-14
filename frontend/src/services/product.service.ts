import api from './api';
import { Product } from '@/types';

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  topSellingProducts: Array<{
    productId: number;
    name: string;
    soldQuantity: number;
    stockQuantity: number;
    mainImage: string | null;
  }>;
  lowStockProducts: Array<{
    productId: number;
    name: string;
    stockQuantity: number;
  }>;
}

export const productService = {
  getAll: async (filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    featured?: boolean;
  }): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
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

  getStats: async (): Promise<ProductStats> => {
    const response = await api.get('/products/stats');
    return response.data.data;
  },
};