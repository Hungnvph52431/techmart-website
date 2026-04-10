export interface WishlistProductSummary {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  categoryName?: string;
  brandId?: number;
  brandName?: string;
  price: number;
  salePrice?: number;
  mainImage?: string | null;
  stockQuantity: number;
  availableStockQuantity: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number;
  reviewCount: number;
  hasVariants?: boolean;
  variantCount?: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IWishlistRepository {
  findProductIdsByUserId(userId: number): Promise<number[]>;
  findProductsByUserId(userId: number): Promise<WishlistProductSummary[]>;
  productExists(productId: number): Promise<boolean>;
  add(userId: number, productId: number): Promise<void>;
  remove(userId: number, productId: number): Promise<void>;
}
