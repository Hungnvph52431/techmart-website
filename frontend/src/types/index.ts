/**
 * TECHMART - THƯ VIỆN TYPES THỐNG NHẤT
 */

// --- 1. CÁC KIỂU TRẠNG THÁI (ENUM-LIKE) ---
export type ProductStatus = 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'pre_order' | 'archived';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// --- 2. LIÊN QUAN ĐẾN SẢN PHẨM ---

export interface ProductImage {
  imageId: number;
  productId: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string; // Bổ sung để dập lỗi TS ở Repository
}

export interface ProductVariant {
  variantId: number;
  productId: number;
  variantName: string;
  sku: string;
  attributes: Record<string, any>;
  priceAdjustment: number;
  stockQuantity: number;
  availableStockQuantity?: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Product {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  brandId?: number;
  brandName?: string;
  brandSlug?: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  description?: string;
  specifications?: Record<string, any>;
  mainImage?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  stockQuantity: number;
  availableStockQuantity?: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number;
  reviewCount: number;
  hasVariants?: boolean;
  variantCount?: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  status: ProductStatus | string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 3. LIÊN QUAN ĐẾN DANH MỤC & HÃNG ---

export interface Category {
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  children?: Category[]; // Hỗ trợ cấu trúc cây của Khanh
}

export interface Brand {
  brandId: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
}

// --- 4. NGƯỜI DÙNG & GIỎ HÀNG ---

export interface User {
  userId: number; // Sử dụng duy nhất userId thống nhất với Backend
  email: string;
  fullName: string; // Dùng fullName thay vì name
  phone?: string;
  address?: string;
  role: 'admin' | 'customer' | 'staff' | 'warehouse' | 'shipper';
  avatar?: string;
  status: 'active' | 'inactive' | 'banned';
  points: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  walletBalance: number;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariantId?: number; // Variant được chọn (nếu có)
  selectedVariantName?: string; // Tên variant (vd: "iPhone 14 Pro 256GB - Tím")
  selectedVariantPrice?: number; // Giá đã tính variant adjustment
  selectedVariantStock?: number; // Tồn kho của variant
}

// --- 5. ĐƠN HÀNG ---

export interface OrderItem {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

export interface Order {
  orderId: number;
  userId: number;
  orderCode: string; // Mã đơn hàng (TM-XXXX)
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: string;
  shippingName: string;
  shippingPhone: string;
  paymentMethod: 'cod' | 'online';
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 6. PHẢN HỒI API & THỐNG KÊ (Dành cho Admin) ---

export interface ProductResponse {
  products: Product[];
  totalPages: number;
  total: number;
  page: number;
  limit: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalStockUnits: number;
  totalInventoryValue: number;
  totalSoldUnits: number;
  topSellingProducts: Array<{
    productId: number;
    name: string;
    soldQuantity: number;
    stockQuantity: number;
    mainImage: string | null;
    price: number;
  }>;
  lowStockProducts: Array<{
    productId: number;
    name: string;
    stockQuantity: number;
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    productCount: number;
    totalSold: number;
  }>;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  usersByMembership: Record<string, number>;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueToday: number;
  revenueYesterday: number;
  ordersToday: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  avgOrderValue: number;
  completionRate: number;
  cancellationRate: number;
  ordersByStatus: Record<string, number>;
  paymentMethodStats: Record<string, number>;
  paymentMethodRevenue: Record<string, number>;
  recentOrders: Array<any>;
  revenueByDay: Array<{ date: string; revenue: number; orderCount: number }>;
  returnStats: {
    total: number;
    pending: number;
    refunded: number;
  };
  topCustomers: Array<{
    name: string;
    email: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

export interface ProductFilter {
  search?: string;
  categoryId?: number;
  categorySlug?: string;
  brandSlug?: string;
  status?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  onSale?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}
