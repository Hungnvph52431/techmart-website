import { Product, CreateProductDTO, UpdateProductDTO } from '../entities/Product';

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
    brandId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
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
}
