export interface Product {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  brandName?: string;
  brandSlug?: string;
  brandId?: number;
  price: number;
  salePrice?: number; // QUAN TRỌNG: Phải có dòng này!
  costPrice?: number;
  description?: string;
  specifications?: Record<string, any>;
  mainImage?: string; // QUAN TRỌNG: Phải có dòng này!
  stockQuantity: number;
  soldQuantity: number;
  viewCount: number;
  ratingAvg: number; // QUAN TRỌNG: Phải có dòng này!
  reviewCount: number;
  isFeatured: boolean; // QUAN TRỌNG: Phải có dòng này!
  isNew: boolean;
  isBestseller: boolean;
  status: 'active' | 'inactive' | 'out_of_stock' | 'pre_order';
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProductFilter {
  category?: string;
  brand?: string;
  search?: string;
  featured?: boolean;

  minPrice?: number;
  maxPrice?: number;

  page?: number;
  limit?: number;
}

export interface ProductResponse {
  products: Product[];
  totalPages: number;
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address?: string;
  role: 'customer' | 'admin';
  avatar?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: 'cod' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
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
