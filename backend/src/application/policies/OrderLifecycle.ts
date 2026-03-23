import {
  OrderStatus,
  PaymentStatus,
  OrderActorRole,
} from '../../domain/entities/Order';

// ─── Luồng trạng thái ─────────────────────────────────────────────────────────
// pending → confirmed → shipping → delivered → completed
// Admin chỉ được chuyển tối đa đến delivered
// Chỉ customer (hoặc system sau 3 ngày) mới được chuyển delivered → completed
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping:  ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  returned:  [],
};

// Admin KHÔNG được chuyển sang completed — chỉ customer/system mới được
const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping:  ['delivered'],
  delivered: [],              // ❌ Admin không được chuyển delivered → completed
  completed: [],
  cancelled: [],
  returned:  [],
};

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending:  ['paid', 'failed'],
  paid:     ['refunded'],
  failed:   ['pending'],
  refunded: [],
};

// ✅ Khách chỉ hủy được khi pending/confirmed — KHÔNG được hủy khi shipping trở đi
const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed'];

// Admin cũng không hủy được khi đang giao (theo yêu cầu)
const BACKOFFICE_CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed'];

// Yêu cầu trả hàng khi đã giao hoặc đã hoàn thành (delivered/completed)
const RETURN_REQUESTABLE_STATUSES: OrderStatus[] = ['delivered', 'completed'];

// Thời hạn cho phép yêu cầu hoàn trả (tính từ ngày giao hàng)
export const RETURN_DEADLINE_DAYS = 7;

export const getAllowedNextOrderStatuses = (status: OrderStatus, actorRole?: OrderActorRole) => {
  // Admin bị chặn chuyển delivered → completed
  if (actorRole === 'admin') {
    return ADMIN_STATUS_TRANSITIONS[status] || [];
  }
  return ORDER_STATUS_TRANSITIONS[status] || [];
};

export const getAllowedNextPaymentStatuses = (status: PaymentStatus) =>
  PAYMENT_STATUS_TRANSITIONS[status] || [];

export const canCancelOrder = (status: OrderStatus, actorRole: OrderActorRole) => {
  if (actorRole === 'customer') {
    return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
  }
  return BACKOFFICE_CANCELLABLE_STATUSES.includes(status);
};

export const canRequestReturn = (status: OrderStatus) =>
  RETURN_REQUESTABLE_STATUSES.includes(status);