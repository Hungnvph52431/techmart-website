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
  status: 'active' | 'inactive' | 'out_of_stock' | 'pre_order';
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
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
  status?: 'active' | 'inactive' | 'out_of_stock' | 'pre_order';
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  productId: number;
}
