export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  brand: string;
  category: string;
  stock: number;
  images: string[];
  specifications: {
    screen?: string;
    os?: string;
    camera?: string;
    processor?: string;
    ram?: string;
    storage?: string;
    battery?: string;
    [key: string]: string | undefined;
  };
  featured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
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
