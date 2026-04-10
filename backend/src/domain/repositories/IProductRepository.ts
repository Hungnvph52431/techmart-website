import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductStatus,
  ProductVariant,
  SaveProductPayload
} from '../entities/Product';
import { ProductImage, CreateProductImageDTO } from '../entities/ProductImage';
import { CreateProductVariantDTO, UpdateProductVariantDTO } from '../entities/ProductVariant';

// --- 1. CÁC INTERFACE HỖ TRỢ (Gộp từ cả 2 bản) ---

// Cấu trúc phân trang từ bản Tuấn Anh
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Bộ lọc sản phẩm mở rộng (Kết hợp Slugs của Khanh và cấu trúc của Tuấn Anh)
export interface ProductFilters {
  productId?: number;
  categoryId?: number;
  categorySlug?: string;
  brandId?: number;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  ram?: string;
  storage?: string;
  chip?: string;
  need?: string;
  feature?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// Giao diện thống kê cho Dashboard Admin (Giữ từ bản Khanh)
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

// --- 2. GIAO DIỆN REPOSITORY CHÍNH ---

export interface IProductRepository {
  // Truy vấn danh sách
  findAll(filters?: ProductFilters): Promise<Product[]>;
  findAllPaginated(filters: ProductFilters, page: number, limit: number): Promise<PaginatedResult<Product>>;

  // Truy vấn chi tiết
  findById(productId: number): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  getAvailableProductStock(productId: number): Promise<number>;
  getAvailableVariantStock(variantId: number): Promise<number>;

  // Thao tác cơ bản
  create(product: CreateProductDTO): Promise<Product>;
  update(product: UpdateProductDTO): Promise<Product | null>;
  delete(productId: number): Promise<boolean>;
  hardDelete(productId: number): Promise<boolean>;
  restore(productId: number): Promise<boolean>;
  updateStock(productId: number, quantity: number): Promise<boolean>;

  // --- 3. QUẢN LÝ ẢNH (BÍ QUYẾT HIỂN THỊ ẢNH CỦA TUẤN ANH) ---
  findImages(productId: number): Promise<ProductImage[]>;
  addImage(image: CreateProductImageDTO): Promise<ProductImage>;
  deleteImage(imageId: number): Promise<boolean>;

  // --- 4. QUẢN LÝ BIẾN THỂ (KẾT HỢP CẢ 2) ---
  findVariants(productId: number): Promise<ProductVariant[]>;
  findVariantById(variantId: number): Promise<ProductVariant | null>;
  addVariant(variant: CreateProductVariantDTO): Promise<ProductVariant>;
  updateVariant(variant: UpdateProductVariantDTO): Promise<ProductVariant | null>;
  deleteVariant(variantId: number): Promise<boolean>;
  updateVariantStock(variantId: number, quantity: number): Promise<boolean>;
  recalculateStock(productId: number): Promise<boolean>;

  // --- 5. TÍNH NĂNG ADMIN CAO CẤP (CỦA KHANH) ---
  getStats(): Promise<ProductStats>;
  findAdminList(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }): Promise<Product[]>;
  findAdminById(productId: number): Promise<Product | null>;
  save(payload: SaveProductPayload, productId?: number): Promise<Product>;
  archive(productId: number): Promise<boolean>;

  // Kiểm tra sản phẩm đang được sử dụng (giỏ hàng, đơn hàng chờ)
  checkProductInUse(productId: number): Promise<{ inCart: number; inPendingOrders: number }>;

  // Kiểm tra mã SKU
  isSkuTaken(sku: string, options?: {
    excludeProductId?: number;
    excludeVariantId?: number;
  }): Promise<boolean>;
}
