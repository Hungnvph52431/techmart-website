import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductStatus,
  ProductVariant,
  SaveProductPayload,
} from '../entities/Product';

// Giao diện thống kê cho Dashboard Admin
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

export interface IProductRepository {
  // 1. Lấy danh sách công khai (Đã gộp đủ slug hãng và danh mục)
  findAll(filters?: {
    productId?: number;
    categoryId?: number;
    categorySlug?: string; // Giữ để lọc theo URL
    brandId?: number;
    brandSlug?: string;    // Giữ để lọc theo URL
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isFeatured?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]>;

  // 2. Các hàm truy vấn cơ bản
  findById(productId: number): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  create(product: CreateProductDTO): Promise<Product>;
  update(product: UpdateProductDTO): Promise<Product | null>;
  delete(productId: number): Promise<boolean>;
  updateStock(productId: number, quantity: number): Promise<boolean>;

  // 3. Các tính năng nâng cao cho Admin (Gộp từ bản mới)
  getStats(): Promise<ProductStats>;
  
  findAdminList(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }): Promise<Product[]>;

  findAdminById(productId: number): Promise<Product | null>;

  // Lưu sản phẩm kèm theo Ảnh và Biến thể (Variants)
  save(payload: SaveProductPayload, productId?: number): Promise<Product>;
  
  // Lưu trữ sản phẩm (thay vì xóa cứng)
  archive(productId: number): Promise<boolean>;

  // 4. Quản lý Biến thể và Kho hàng chi tiết
  findVariantById(variantId: number): Promise<ProductVariant | null>;
  updateVariantStock(variantId: number, quantity: number): Promise<boolean>;
  
  // Tính toán lại tổng tồn kho từ các biến thể
  recalculateStock(productId: number): Promise<boolean>;

  // Kiểm tra mã SKU đã tồn tại chưa
  isSkuTaken(sku: string, options?: {
    excludeProductId?: number;
    excludeVariantId?: number;
  }): Promise<boolean>;
}