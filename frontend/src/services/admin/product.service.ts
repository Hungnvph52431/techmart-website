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
    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
  },

  // 2. TẠO SẢN PHẨM (Bản chốt hạ)
  create: async (payload: SaveAdminProductPayload): Promise<AdminProduct> => {
    const p = payload.product;
    
    // GỬI CẢ 2 CHUẨN ĐỂ VƯỢT QUA LỚP VALIDATION VÀ LỚP DATABASE
    const finalData = {
      // --- CHUẨN CAMELCASE (Để vượt qua cửa bảo vệ Validation) ---
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: Number(p.categoryId),
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : undefined,
      costPrice: p.costPrice ? Number(p.costPrice) : undefined,
      stockQuantity: Number(p.stockQuantity),
      description: p.description || '',
      mainImage: p.mainImage || '',
      status: p.status || 'active',
      isFeatured: p.isFeatured ? 1 : 0,
      isNew: p.isNew ? 1 : 0,
      isBestseller: p.isBestseller ? 1 : 0,

      // --- CHUẨN SNAKE_CASE (Để lưu mượt mà vào Database MySQL) ---
      category_id: Number(p.categoryId),
      sale_price: p.salePrice ? Number(p.salePrice) : null,
      cost_price: p.costPrice ? Number(p.costPrice) : null,
      stock_quantity: Number(p.stockQuantity),
      main_image: p.mainImage || '',
      is_featured: p.isFeatured ? 1 : 0,
      is_new: p.isNew ? 1 : 0,
      is_bestseller: p.isBestseller ? 1 : 0,

      // --- Mảng phụ ---
      images: payload.images || [],
      variants: payload.variants || []
    };

    console.log("🚀 Dữ liệu finalData gửi đi:", finalData); // Khanh soi ở Console nhé!

    const response = await api.post('/products', finalData);
    return response.data;
  },

  // 3. Cập nhật sản phẩm
  // frontend/src/services/admin/product.service.ts

update: async (productId: number, payload: SaveAdminProductPayload): Promise<AdminProduct> => {
  const p = payload.product;
  
  // Gửi cả camelCase và snake_case để vượt qua mọi lớp kiểm tra
  const finalData = {
    ...p,
    category_id: Number(p.categoryId),
    sale_price: p.salePrice ? Number(p.salePrice) : null,
    cost_price: p.costPrice ? Number(p.costPrice) : null,
    stock_quantity: Number(p.stockQuantity),
    main_image: p.mainImage || '',
    is_featured: p.isFeatured ? 1 : 0,
    is_new: p.isNew ? 1 : 0,
    is_bestseller: p.isBestseller ? 1 : 0,
    images: payload.images || [],
    variants: payload.variants || []
  };

  const response = await api.put(`/products/${productId}`, finalData);
  return response.data;
},

getById: async (id: number) => (await api.get(`/admin/products/${id}`)).data,
  archive: async (id: number) => await api.patch(`/products/${id}/archive`),
};