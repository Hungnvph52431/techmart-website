// frontend/src/types/index.ts

// 1. Định nghĩa các Type bổ trợ cho Sản phẩm
export type ProductStatus = 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'pre_order' | 'archived';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';


export interface ProductImage {
  imageId: number;
  productId: number;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  productImageId: number;
  isMain: boolean;
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
}

// 2. Interface Sản phẩm chính - GỘP CẢ 2 BẢN
export interface Product {
  productId: number; // Dùng productId thống nhất với Backend
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  brandName?: string;
  brandSlug?: string;
  brandId?: number;
  price: number;       // Giá gốc (Original Price)
  salePrice?: number;  // Giá đang bán/khuyến mãi
  description?: string;
  specifications?: Record<string, any>;
  mainImage?: string;  // Ảnh đại diện chính
  images?: ProductImage[]; // Album ảnh từ bản Incoming
  variants?: ProductVariant[]; // Các biến thể (màu sắc, dung lượng)
  stockQuantity: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number;   // Điểm đánh giá trung bình
  reviewCount: number;
  isFeatured: boolean; // Sản phẩm nổi bật
  isNew: boolean;
  isBestseller: boolean;
  status: ProductStatus;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;

}

// 3. Các Interface cho lọc và phản hồi từ API
export interface ProductFilter {
  category?: string;
  categorySlug?: string; // THÊM DÒNG NÀY
  brandSlug?: string;    // THÊM DÒNG NÀY ĐỂ ĐỒNG BỘ
  brand?: string;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  categoryId?: number;
  status?: string;
}

export interface ProductResponse {
  products: Product[];
  totalPages: number;
  total: number;
  page: number;
  limit: number;
}

// 4. Quản lý Người dùng và Đơn hàng
export interface User {
  userId: number;       // Sử dụng duy nhất userId kiểu number để đồng bộ
  email: string;
  fullName: string;
  phone?: string;       // Cho phép optional để linh hoạt lúc đăng ký
  address?: string;
  role: 'admin' | 'customer' | 'staff' | 'warehouse';
  avatar?: string;
  status: 'active' | 'inactive' | 'banned';
  points: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt?: string;   // Thêm để khớp với hàm normalizeAuthUser
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  orderId: number;      // Đổi từ id: string sang orderId: number
  userId: number;       // Đổi sang number để khớp với User.userId
  orderCode: string;    // Sử dụng orderCode cho hiển thị (ví dụ: TM-12345)
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: string; // Hoặc dùng interface ShippingAddress nếu cần chi tiết
  shippingName: string;
  paymentMethod: 'cod' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: OrderStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number; // CHỐT: Dùng number để khớp với Database
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
}
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
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  usersByRole: Record<string, number>;
  usersByMembership: Record<string, number>;
}
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  paymentMethodStats: Record<string, number>;
  recentOrders: Array<{
    orderId: number;
    orderCode: string;
    shippingName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}
export interface Category {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
}
