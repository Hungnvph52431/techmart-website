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
  couponCode?: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentDate?: string; 
  status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
  customerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  orderDate: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  updatedAt: string;
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
  createdAt: string;
}

export type OrderStatus = Order['status'];
export type PaymentStatus = Order['paymentStatus'];