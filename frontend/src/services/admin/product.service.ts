// frontend/src/services/admin/product.service.ts
import api from '../api';
import { AdminProduct, SaveAdminProductPayload } from '@/features/admin/types/catalog';

export const adminProductService = {
  // 1. Lấy danh sách
  getAll: async (filters?: any): Promise<AdminProduct[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const apiKey = key === 'categoryId' ? 'category_id' : key;
          params.append(apiKey, String(value));
        }
      });
    }
    const response = await api.get(`/admin/products?${params.toString()}`);
    return response.data;
  },

  // 2. TẠO SẢN PHẨM — gửi đúng route admin + payload nested
  create: async (payload: SaveAdminProductPayload): Promise<AdminProduct> => {
    const p = payload.product;

    const finalData = {
      product: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryId: Number(p.categoryId),
        brandId: p.brandId || null,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        costPrice: p.costPrice ? Number(p.costPrice) : null,
        stockQuantity: Number(p.stockQuantity),
        description: p.description || '',
        mainImage: p.mainImage || '',
        status: p.status || 'active',
        isFeatured: p.isFeatured || false,
        isNew: p.isNew || false,
        isBestseller: p.isBestseller || false,
        specifications: p.specifications || {},
      },
      images: payload.images || [],
      variants: payload.variants || [],
    };

    console.log("🚀 Dữ liệu finalData gửi đi:", finalData);

    // ✅ POST /admin/products (gọi AdminProductController.create → saveProduct)
    const response = await api.post('/admin/products', finalData);
    return response.data;
  },

  // 3. CẬP NHẬT SẢN PHẨM
  update: async (productId: number, payload: SaveAdminProductPayload): Promise<AdminProduct> => {
    const p = payload.product;

    const finalData = {
      product: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryId: Number(p.categoryId),
        brandId: p.brandId || null,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        costPrice: p.costPrice ? Number(p.costPrice) : null,
        stockQuantity: Number(p.stockQuantity),
        description: p.description || '',
        mainImage: p.mainImage || '',
        status: p.status || 'active',
        isFeatured: p.isFeatured || false,
        isNew: p.isNew || false,
        isBestseller: p.isBestseller || false,
        specifications: p.specifications || {},
      },
      images: payload.images || [],
      variants: payload.variants || [],
    };

    // ✅ PUT /admin/products/:id (gọi AdminProductController.update → saveProduct)
    const response = await api.put(`/admin/products/${productId}`, finalData);
    return response.data;
  },

  // 4. Lấy chi tiết
  getById: async (id: number) => {
    const response = await api.get(`/admin/products/${id}`);
    return response.data;
  },

  archive: async (id: number) => await api.patch(`/admin/products/${id}/archive`),
  restore: async (id: number) => await api.patch(`/admin/products/${id}/restore`),
};