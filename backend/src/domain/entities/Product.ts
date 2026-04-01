// backend/src/domain/entities/Product.ts

// 1. Định nghĩa các trạng thái sản phẩm
export type ProductStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'out_of_stock'
  | 'pre_order'
  | 'archived';

// 2. Định nghĩa thực thể Ảnh
export interface ProductImage {
  imageId: number;
  productId: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt?: Date;
}

// 3. Định nghĩa thực thể Biến thể (RAM, Màu sắc...)
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

// 4. Thực thể Sản phẩm chính (Đã gộp Slug và Quan hệ)
export interface Product {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  brandId?: number;
  
  // Giữ lại các trường Slug cho SEO và Bộ lọc
  categoryName?: string;
  categorySlug?: string;
  brandName?: string;
  brandSlug?: string;

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
  hasVariants?: boolean;
  variantCount?: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  status: ProductStatus;
  
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;

  // Thêm các mảng quan hệ từ bản cập nhật
  images?: ProductImage[];
  variants?: ProductVariant[];

  createdAt: Date;
  updatedAt: Date;
}

// 5. Các Data Transfer Objects (DTOs)
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

// 6. Các DTOs phục vụ tính năng Lưu nâng cao (SavePayload)
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
  product: CreateProductDTO | UpdateProductDTO;
  images: UpsertProductImageDTO[];
  variants: UpsertProductVariantDTO[];
}
