// --- 1. CÁC KIỂU DỮ LIỆU DANH MỤC (ENUMS/UNIONS) ---
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay' | 'wallet' | 'deposit';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderActorRole = 'customer' | 'admin' | 'staff' | 'warehouse' | 'system';

export type OrderEventType =
  | 'order_created'
  | 'status_changed'
  | 'payment_status_changed'
  | 'order_cancelled'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'return_received'
  | 'return_refunded'
  | 'return_closed';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'refunded'
  | 'closed';

export type ReturnRestockAction = 'restock' | 'inspect' | 'discard';

// --- 2. CÁC THỰC THỂ CHÍNH (ENTITIES) ---
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
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDate?: Date;
  depositAmount?: number;
  status: OrderStatus;
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

export interface OrderListItem extends Order {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  itemCount: number;
  openReturnCount: number;
  allReviewed?: boolean;
}

export interface OrderDetail {
  orderDetailId: number;
  orderId: number;
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  sku?: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: Date;
}

// --- 3. QUẢN LÝ DÒNG THỜI GIAN & HOÀN TRẢ ---
export interface OrderEvent {
  orderEventId: number;
  orderId: number;
  eventType: OrderEventType;
  fromStatus?: string;
  toStatus?: string;
  actorUserId?: number;
  actorRole?: OrderActorRole;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface OrderReturnItem {
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
  createdAt: Date;
}

export interface OrderReturn {
  orderReturnId: number;
  orderId: number;
  requestCode: string;
  requestedBy: number;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  evidenceImages?: string[];
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  receivedAt?: Date;
  refundedAt?: Date;
  closedAt?: Date;
  updatedAt: Date;
  items?: OrderReturnItem[];
}

// --- 4. CÁC KIỂU DỮ LIỆU TỔNG HỢP & DTO ---
export interface OrderCustomerSnapshot {
  userId: number;
  name: string;
  email: string;
  phone?: string;
}

export interface OrderAggregate {
  order: Order;
  customer?: OrderCustomerSnapshot;
  items: OrderDetail[];
  timeline: OrderEvent[];
  returns: OrderReturn[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateOrderDTO {
  userId: number;
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

export interface AdminOrderListFilters {
  search?: string;
  status?: OrderStatus | 'all';
  paymentStatus?: PaymentStatus | 'all';
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// --- 5. DTO CẬP NHẬT TRẠNG THÁI ---
export interface TransitionOrderStatusDTO {
  orderId: number;
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  actorUserId: number;
  actorRole: OrderActorRole;
  note?: string;
}

export interface UpdatePaymentStatusDTO {
  orderId: number;
  currentStatus: PaymentStatus;
  nextStatus: PaymentStatus;
  actorUserId: number | null;
  actorRole: OrderActorRole;
  note?: string;
}

export interface CancelOrderDTO {
  orderId: number;
  currentStatus: OrderStatus;
  actorUserId: number;
  actorRole: OrderActorRole;
  reason: string;
  adminNote?: string;
}

// DTO cho Hoàn trả
export interface CreateOrderReturnDTO {
  orderId: number;
  requestedBy: number;
  reason: string;
  customerNote?: string;
  evidenceImages?: string[];
  items: Array<{
    orderDetailId: number;
    quantity: number;
    reason?: string;
    restockAction?: ReturnRestockAction;
  }>;
}

export interface ReviewOrderReturnDTO {
  orderId: number;
  orderReturnId: number;
  actorUserId: number;
  actorRole: OrderActorRole;
  decision: 'approved' | 'rejected';
  adminNote?: string;
}

export interface ReceiveOrderReturnDTO {
  orderId: number;
  orderReturnId: number;
  actorUserId: number;
  actorRole: OrderActorRole;
  adminNote?: string;
}

export interface RefundOrderReturnDTO {
  orderId: number;
  orderReturnId: number;
  actorUserId: number;
  actorRole: OrderActorRole;
  adminNote?: string;
}

export interface CloseOrderReturnDTO {
  orderId: number;
  orderReturnId: number;
  actorUserId: number;
  actorRole: OrderActorRole;
  adminNote?: string;
}