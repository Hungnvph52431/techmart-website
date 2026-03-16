import api from './api';
import { Product, ProductFilter, ProductStats } from '@/types';

export const productService = {
  // 1. LẤY DANH SÁCH SẢN PHẨM (Hỗ trợ bộ lọc Samsung/Apple, Giá, Tìm kiếm)
  //
  getAll: async (filters?: ProductFilter) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      // Thêm điều kiện bỏ qua false
      if (value !== undefined && value !== null && value !== false) {
        params.append(key, String(value));
      }
    });
  }

    const response = await api.get(`/products?${params.toString()}`);
    // Backend hiện đang trả về mảng Product[] trực tiếp
    return response.data;
  },

  // 2. TÌM KIẾM CHI TIẾT
  getById: async (id: string | number): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const response = await api.get(`/products/slug/${slug}`);
    return response.data;
  },

  // 3. CÁC HÀM QUẢN TRỊ (ADMIN)
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

  // 4. THỐNG KÊ (Dành cho Dashboard Admin)
  getStats: async (): Promise<ProductStats> => {
    const response = await api.get('/products/stats');
    // Tùy vào cấu trúc trả về của API, có thể là response.data hoặc response.data.data
    return response.data.data || response.data;
  },
};