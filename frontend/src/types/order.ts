export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'refunded'
  | 'closed';

export type ReturnRestockAction = 'restock' | 'inspect' | 'discard';

export interface OrderCustomerInfo {
  userId: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface OrderShippingInfo {
  name: string;
  phone: string;
  address: string;
  ward?: string;
  district?: string;
  city: string;
  fullAddress: string;
}

export interface OrderListItemView {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  orderDate: string;
  updatedAt: string;
  itemCount: number;
  openReturnCount: number;
  customer: OrderCustomerInfo;
  shipping: OrderShippingInfo;
  canCancel: boolean;
  canRequestReturn: boolean;
  allowedNextStatuses: OrderStatus[];
  allowedNextPaymentStatuses: PaymentStatus[];
}

export interface OrderLineItemView {
  orderDetailId: number;
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  sku?: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: string;
}

export interface OrderTimelineEventView {
  orderEventId: number;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  actorRole?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OrderReturnItemView {
  orderReturnItemId: number;
  orderReturnId: number;
  orderDetailId: number;
  productId: number;
  variantId?: number;
  productName?: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  reason?: string;
  restockAction: ReturnRestockAction;
  createdAt: string;
}

export interface OrderReturnView {
  orderReturnId: number;
  orderId: number;
  requestCode: string;
  requestedBy: number;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
  refundedAt?: string;
  closedAt?: string;
  updatedAt: string;
  items: OrderReturnItemView[];
}

export interface OrderDetailView {
  order: OrderListItemView & {
    customerNote?: string;
    adminNote?: string;
    cancelReason?: string;
    paymentDate?: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
  };
  items: OrderLineItemView[];
  timeline: OrderTimelineEventView[];
  returns: OrderReturnView[];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateOrderPayload {
  items: Array<{
    productId: number;
    variantId?: number;
    quantity: number;
    price: number;
  }>;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingCity: string;
  shippingFee?: number;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  customerNote?: string;
}

export interface CreateOrderReturnPayload {
  reason: string;
  customerNote?: string;
  items: Array<{
    orderDetailId: number;
    quantity: number;
    reason?: string;
    restockAction?: ReturnRestockAction;
  }>;
}
