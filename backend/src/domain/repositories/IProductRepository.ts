import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductStatus,
  ProductVariant,
  SaveProductPayload,
} from '../entities/Product';

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
  findAll(filters?: {
    categoryId?: number;
    category?: string;
    brandId?: number;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    featured?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    status?: string;
  }): Promise<Product[]>;
  findById(productId: number): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  create(product: CreateProductDTO): Promise<Product>;
  update(product: UpdateProductDTO): Promise<Product | null>;
  delete(productId: number): Promise<boolean>;
  updateStock(productId: number, quantity: number): Promise<boolean>;
  getStats(): Promise<ProductStats>;
  findAdminList(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }): Promise<Product[]>;
  findAdminById(productId: number): Promise<Product | null>;
  save(payload: SaveProductPayload, productId?: number): Promise<Product>;
  archive(productId: number): Promise<boolean>;
  findVariantById(variantId: number): Promise<ProductVariant | null>;
  updateVariantStock(variantId: number, quantity: number): Promise<boolean>;
  recalculateStock(productId: number): Promise<boolean>;
  isSkuTaken(sku: string, options?: {
    excludeProductId?: number;
    excludeVariantId?: number;
  }): Promise<boolean>;
}