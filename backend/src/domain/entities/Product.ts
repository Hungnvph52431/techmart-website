export type ProductStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'out_of_stock'
  | 'pre_order'
  | 'archived';

export interface ProductImage {
  imageId: number;
  productId: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt?: Date;
}

export interface ProductVariant {
  variantId: number;
  productId: number;
  variantName: string;
  sku: string;
  attributes: Record<string, any>;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  brandId?: number;
  price: number;
  salePrice?: number;
  costPrice?: number;
  description?: string;
  specifications?: Record<string, any>;
  mainImage?: string;
  stockQuantity: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number;
  reviewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  status: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  categoryName?: string;
  brandName?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO {
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  brandId?: number;
  price: number;
  salePrice?: number;
  costPrice?: number;
  description?: string;
  specifications?: Record<string, any>;
  mainImage?: string;
  stockQuantity?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  status?: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  productId: number;
}

export interface UpsertProductImageDTO {
  imageId?: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface UpsertProductVariantDTO {
  variantId?: number;
  variantName: string;
  sku: string;
  attributes: Record<string, any>;
  priceAdjustment?: number;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface SaveProductPayload {
  product: CreateProductDTO;
  images: UpsertProductImageDTO[];
  variants: UpsertProductVariantDTO[];
}
