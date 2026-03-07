import { Product, CreateProductDTO, UpdateProductDTO } from '../entities/Product';
import { ProductImage, CreateProductImageDTO } from '../entities/ProductImage';
import { ProductVariant, CreateProductVariantDTO, UpdateProductVariantDTO } from '../entities/ProductVariant';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  status?: string;
}

export interface IProductRepository {
  findAll(filters?: ProductFilters): Promise<Product[]>;
  findAllPaginated(filters: ProductFilters, page: number, limit: number): Promise<PaginatedResult<Product>>;
  findById(productId: number): Promise<any | null>;
  findBySlug(slug: string): Promise<any | null>;
  create(product: CreateProductDTO): Promise<Product>;
  update(product: UpdateProductDTO): Promise<Product | null>;
  delete(productId: number): Promise<boolean>;
  updateStock(productId: number, quantity: number): Promise<boolean>;

  // Product Images
  findImages(productId: number): Promise<ProductImage[]>;
  addImage(image: CreateProductImageDTO): Promise<ProductImage>;
  deleteImage(imageId: number): Promise<boolean>;

  // Product Variants
  findVariants(productId: number): Promise<ProductVariant[]>;
  addVariant(variant: CreateProductVariantDTO): Promise<ProductVariant>;
  updateVariant(variant: UpdateProductVariantDTO): Promise<ProductVariant | null>;
  deleteVariant(variantId: number): Promise<boolean>;
}
