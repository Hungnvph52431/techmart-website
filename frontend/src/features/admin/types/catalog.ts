// frontend/src/features/admin/types/catalog.ts

export type AdminProductStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'out_of_stock'
  | 'pre_order'
  | 'archived';

export interface AdminCategory {
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  children?: AdminCategory[];
}

export type AdminAttributeInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'color';

export type AdminAttributeScope = 'product' | 'variant';

export interface AdminAttributeOption {
  optionId?: number;
  attributeId?: number;
  label: string;
  value: string;
  colorHex?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminAttribute {
  attributeId: number;
  name: string;
  code: string;
  inputType: AdminAttributeInputType;
  scope: AdminAttributeScope;
  isRequired: boolean;
  isFilterable: boolean;
  isVariantAxis: boolean;
  displayOrder: number;
  isActive: boolean;
  options: AdminAttributeOption[];
}

export interface CategoryAttributeAssignment {
  categoryAttributeId: number;
  categoryId: number;
  attributeId: number;
  isRequired: boolean;
  isVariantAxis: boolean;
  displayOrder: number;
}

// FIX: Mở rộng type để khớp với z.record(z.string(), z.any()) trong Zod schema
// Trước: string | string[]  →  Sau: any (bao gồm cả string, string[], number...)
export type AdminAttributeValue = any;

export interface AdminProductImage {
  imageId?: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface AdminProductVariant {
  variantId?: number;
  variantName: string;
  sku: string;
  // FIX: Dùng Record<string, any> thay vì Record<string, AdminAttributeValue>
  // để tương thích với Zod inferred type
  attributes: Record<string, any>;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface AdminProduct {
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
  // FIX: Dùng Record<string, any> để tương thích với Zod
  specifications: Record<string, any>;
  mainImage?: string;
  stockQuantity: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number;
  reviewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  status: AdminProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  categoryName?: string;
  brandName?: string;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveAdminProductPayload {
  product: {
    name: string;
    slug: string;
    sku: string;
    categoryId: number;
    brandId?: number;
    price: number;
    salePrice?: number;
    costPrice?: number;
    description?: string;
    // FIX: Dùng Record<string, any> để tương thích với Zod
    specifications: Record<string, any>;
    mainImage?: string;
    stockQuantity?: number;
    isFeatured?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    status: AdminProductStatus;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  images: AdminProductImage[];
  variants: AdminProductVariant[];
}