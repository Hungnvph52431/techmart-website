export interface Order {
  orderId: number;
  orderCode: string;
  userId: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingCity: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  couponId?: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentDate?: Date;
  status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
  customerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  orderDate: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

export interface OrderDetail {
  orderDetailId: number;
  orderId: number;
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  sku?: string;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: Date;
}

export interface CreateOrderDTO {
  userId: number;
  items: {
    productId: number;
    variantId?: number;
    quantity: number;
    price: number;
  }[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingCity: string;
  shippingFee?: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';
  customerNote?: string;
}

export interface UpdateOrderDTO {
  orderId: number;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  adminNote?: string;
  cancelReason?: string;
}
