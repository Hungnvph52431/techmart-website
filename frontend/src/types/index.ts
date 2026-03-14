export interface Product {
  id: number;
  productId?: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  brand: string;
  category: string;
  stock: number;
  images: string[];
  specifications: Record<string, string>;
  featured: boolean;
  rating: number;
  reviewCount: number;
  status?: 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'pre_order' | 'archived';
  variants?: Array<{
    id: number;
    variantId: number;
    name: string;
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
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
  productId: number;
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
