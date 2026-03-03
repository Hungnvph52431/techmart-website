import { Product, CreateProductDTO, UpdateProductDTO } from '../entities/Product';

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
}
