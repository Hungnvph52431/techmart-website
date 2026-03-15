import {
  OrderStatus,
  PaymentStatus,
  OrderActorRole,
} from '../../domain/entities/Order';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
  returned: [],
};

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  failed: ['pending'],
  refunded: [],
};

const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed'];
const BACKOFFICE_CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing'];
const RETURN_REQUESTABLE_STATUSES: OrderStatus[] = ['delivered'];

export const getAllowedNextOrderStatuses = (status: OrderStatus) =>
  ORDER_STATUS_TRANSITIONS[status] || [];

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
