import {
  Order,
  OrderAggregate,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  OrderActorRole,
  OrderReturn,
  PaymentStatus,
  OrderStatus,
  ReturnStatus,
} from '../../domain/entities/Order';
import {
  canCancelOrder,
  canRequestReturn,
  getAllowedNextPaymentStatuses,
  getAllowedNextOrderStatuses,
  RETURN_DEADLINE_DAYS,
} from '../policies/OrderLifecycle';

const formatAddress = (order: Order) =>
  [order.shippingAddress, order.shippingWard, order.shippingDistrict, order.shippingCity]
    .filter(Boolean)
    .join(', ');

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn/trả',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền',
};

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  received: 'Đã nhận hàng',
  refunded: 'Đã hoàn tiền',
  closed: 'Đã đóng',
};

const EVENT_LABELS: Record<OrderEvent['eventType'], string> = {
  order_created: 'Đơn hàng được tạo',
  status_changed: 'Thay đổi trạng thái đơn hàng',
  payment_status_changed: 'Thay đổi trạng thái thanh toán',
  order_cancelled: 'Đơn hàng bị hủy',
  return_requested: 'Yêu cầu hoàn trả được tạo',
  return_approved: 'Yêu cầu hoàn trả được duyệt',
  return_rejected: 'Yêu cầu hoàn trả bị từ chối',
  return_received: 'Đã nhận hàng hoàn trả',
  return_refunded: 'Đã hoàn tiền hoàn trả',
  return_closed: 'Yêu cầu hoàn trả đã đóng',
};

const ACTOR_ROLE_LABELS: Record<OrderActorRole, string> = {
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  warehouse: 'Kho vận',
  shipper: 'Shipper',
  system: 'Hệ thống',
};

const toEventStatusLabel = (eventType: OrderEvent['eventType'], value?: string) => {
  if (!value) {
    return undefined;
  }

  if (eventType === 'payment_status_changed') {
    return PAYMENT_STATUS_LABELS[value as PaymentStatus] || value;
  }

  if (eventType.startsWith('return_')) {
    return RETURN_STATUS_LABELS[value as ReturnStatus] || value;
  }

  return ORDER_STATUS_LABELS[value as OrderStatus] || value;
};

const toActorDisplayName = (event: OrderEvent) => {
  if (event.actorName) {
    return event.actorName;
  }

  if (event.actorRole) {
    return ACTOR_ROLE_LABELS[event.actorRole];
  }

  if (event.actorEmail) {
    return event.actorEmail;
  }

  return 'Không xác định';
};

const toCustomer = (order: OrderListItem | OrderAggregate['order'], aggregate?: OrderAggregate) => ({
  userId: aggregate?.customer?.userId ?? order.userId ?? undefined,
  name:
    aggregate?.customer?.name ||
    order.customerName ||
    order.shippingName,
  email: aggregate?.customer?.email || order.customerEmail,
  phone:
    aggregate?.customer?.phone ||
    order.customerPhone ||
    order.shippingPhone,
});

const toShipping = (order: Order) => ({
  name: order.shippingName,
  phone: order.shippingPhone,
  address: order.shippingAddress,
  ward: order.shippingWard,
  district: order.shippingDistrict,
  city: order.shippingCity,
  fullAddress: formatAddress(order),
});

const toLineItem = (item: OrderDetail) => ({
  orderDetailId: item.orderDetailId,
  productId: item.productId,
  variantId: item.variantId,
  productName: item.productName,
  variantName: item.variantName,
  sku: item.sku,
  productImage: item.productImage,
  price: item.price,
  quantity: item.quantity,
  subtotal: item.subtotal,
  createdAt: item.createdAt,
});

const toTimelineEvent = (event: OrderEvent, actor: 'admin' | 'customer' | 'guest') => ({
  orderEventId: event.orderEventId,
  eventType: event.eventType,
  eventLabel: EVENT_LABELS[event.eventType] || event.eventType,
  fromStatus: event.fromStatus,
  fromLabel: toEventStatusLabel(event.eventType, event.fromStatus),
  toStatus: event.toStatus,
  toLabel: toEventStatusLabel(event.eventType, event.toStatus),
  actorRole: event.actorRole,
  actorName: actor === 'admin' ? event.actorName : undefined,
  actorEmail: actor === 'admin' ? event.actorEmail : undefined,
  actorDisplayName: toActorDisplayName(event),
  actorDisplayRole: event.actorRole ? ACTOR_ROLE_LABELS[event.actorRole] : undefined,
  note: event.note,
  displayNote: event.note,
  metadata: actor === 'admin' ? event.metadata || {} : undefined,
  createdAt: event.createdAt,
});

const toReturn = (item: OrderReturn, actor: 'admin' | 'customer' | 'guest') => ({
  orderReturnId: item.orderReturnId,
  orderId: item.orderId,
  requestCode: item.requestCode,
  requestedBy: item.requestedBy,
  refundDestination: item.refundDestination || 'wallet',
  refundBankCode: item.refundBankCode,
  refundBankName: item.refundBankName,
  refundAccountNumber: actor === 'admin' ? item.refundAccountNumber : undefined,
  refundAccountNumberMasked: item.refundAccountNumberMasked,
  refundAccountHolderName: item.refundAccountHolderName,
  refundBranchName: item.refundBranchName,
  status: item.status,
  reason: item.reason,
  customerNote: item.customerNote,
  adminNote: actor === 'admin' ? item.adminNote : undefined,
  evidenceImages: item.evidenceImages,
  refundReceiptImageUrl: item.refundReceiptImageUrl,
  refundReceiptUploadedAt: item.refundReceiptUploadedAt,
  refundReceiptUploadedBy: actor === 'admin' ? item.refundReceiptUploadedBy : undefined,
  requestedAt: item.requestedAt,
  approvedAt: item.approvedAt,
  rejectedAt: item.rejectedAt,
  receivedAt: item.receivedAt,
  refundedAt: item.refundedAt,
  closedAt: item.closedAt,
  updatedAt: item.updatedAt,
  items: (item.items || []).map((returnItem) => ({
    orderReturnItemId: returnItem.orderReturnItemId,
    orderReturnId: returnItem.orderReturnId,
    orderDetailId: returnItem.orderDetailId,
    productId: returnItem.productId,
    variantId: returnItem.variantId,
    productName: returnItem.productName,
    variantName: returnItem.variantName,
    sku: returnItem.sku,
    quantity: returnItem.quantity,
    reason: returnItem.reason,
    restockAction: returnItem.restockAction,
    createdAt: returnItem.createdAt,
  })),
});

const getReturnWindowMeta = (order: Order | OrderListItem) => {
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : undefined;
  if (!deliveredAt) {
    // Chưa giao → chưa bắt đầu return window → coi như expired
    return {
      returnDeadlineAt: undefined,
      returnWindowDays: RETURN_DEADLINE_DAYS,
      returnWindowExpired: true,
    };
  }

  const returnDeadlineAt = new Date(deliveredAt);
  returnDeadlineAt.setDate(returnDeadlineAt.getDate() + RETURN_DEADLINE_DAYS);

  return {
    returnDeadlineAt,
    returnWindowDays: RETURN_DEADLINE_DAYS,
    returnWindowExpired: new Date() > returnDeadlineAt,
  };
};

const toLifecycleFlags = (
  order: Order | OrderListItem,
  actorRole: 'admin' | 'customer' | 'guest'
) => {
  const returnWindow = getReturnWindowMeta(order);
  const withinReturnWindow =
    returnWindow.returnDeadlineAt != null && !returnWindow.returnWindowExpired;

  if (actorRole === 'guest') {
    return {
      canCancel: false,
      canRequestReturn: canRequestReturn(order.status) && withinReturnWindow,
      returnDeadlineAt: returnWindow.returnDeadlineAt,
      returnWindowDays: returnWindow.returnWindowDays,
      returnWindowExpired: returnWindow.returnWindowExpired,
      allowedNextStatuses: [],
    };
  }

  return {
    canCancel: canCancelOrder(order.status, actorRole),
    canRequestReturn:
      actorRole === 'customer'
        ? canRequestReturn(order.status) && withinReturnWindow
        : canRequestReturn(order.status),
    returnDeadlineAt: returnWindow.returnDeadlineAt,
    returnWindowDays: returnWindow.returnWindowDays,
    returnWindowExpired: returnWindow.returnWindowExpired,
    allowedNextStatuses:
      actorRole === 'admin' ? getAllowedNextOrderStatuses(order.status) : [],
  };
};

export const toOrderListItem = (
  order: OrderListItem,
  actorRole: 'admin' | 'customer' | 'guest'
) => ({
  orderId: order.orderId,
  orderCode: order.orderCode,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  total: order.total,
  subtotal: order.subtotal,
  shippingFee: order.shippingFee,
  discountAmount: order.discountAmount,
  orderDate: order.orderDate,
  updatedAt: order.updatedAt,
  itemCount: order.itemCount,
  openReturnCount: order.openReturnCount,
  customer: toCustomer(order),
  shipping: toShipping(order),
  ...toLifecycleFlags(order, actorRole),
  allowedNextPaymentStatuses:
    actorRole === 'admin' ? getAllowedNextPaymentStatuses(order.paymentStatus) : [],
});

export const toOrderDetail = (
  aggregate: OrderAggregate,
  actorRole: 'admin' | 'customer' | 'guest'
) => ({
  order: {
    ...toOrderListItem(
      {
        ...aggregate.order,
        customerName: aggregate.customer?.name,
        customerEmail: aggregate.customer?.email,
        customerPhone: aggregate.customer?.phone,
        itemCount: aggregate.items.length,
        openReturnCount: aggregate.returns.filter((item) => !['closed', 'rejected'].includes(item.status))
          .length,
      },
      actorRole
    ),
    customerNote: aggregate.order.customerNote,
    adminNote: actorRole === 'admin' ? aggregate.order.adminNote : undefined,
    cancelReason: aggregate.order.cancelReason,
    couponCode: aggregate.order.couponCode,
    paymentDate: aggregate.order.paymentDate,
    confirmedAt: aggregate.order.confirmedAt,
    shippedAt: aggregate.order.shippedAt,
    deliveredAt: aggregate.order.deliveredAt,
    cancelledAt: aggregate.order.cancelledAt,
  },
  items: aggregate.items.map(toLineItem),
  timeline: aggregate.timeline.map((item) => toTimelineEvent(item, actorRole)),
  returns: aggregate.returns.map((item) => toReturn(item, actorRole)),
});

export const toOrderTimeline = (
  timeline: OrderEvent[],
  actorRole: 'admin' | 'customer' | 'guest'
) => timeline.map((item) => toTimelineEvent(item, actorRole));
