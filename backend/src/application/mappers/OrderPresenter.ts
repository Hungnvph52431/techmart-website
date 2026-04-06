import {
  Order,
  OrderAggregate,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  OrderReturn,
  OrderStatus,
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

const toCustomer = (order: OrderListItem | OrderAggregate['order'], aggregate?: OrderAggregate) => ({
  userId: aggregate?.customer?.userId ?? order.userId,
  name:
    aggregate?.customer?.name ||
    ('customerName' in order ? order.customerName : undefined) ||
    order.shippingName,
  email: aggregate?.customer?.email || ('customerEmail' in order ? order.customerEmail : undefined),
  phone:
    aggregate?.customer?.phone ||
    ('customerPhone' in order ? order.customerPhone : undefined) ||
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

const toTimelineEvent = (event: OrderEvent, actor: 'admin' | 'customer') => ({
  orderEventId: event.orderEventId,
  eventType: event.eventType,
  fromStatus: event.fromStatus,
  toStatus: event.toStatus,
  actorRole: event.actorRole,
  note: event.note,
  metadata: actor === 'admin' ? event.metadata || {} : undefined,
  createdAt: event.createdAt,
});

const toReturn = (item: OrderReturn, actor: 'admin' | 'customer') => ({
  orderReturnId: item.orderReturnId,
  orderId: item.orderId,
  requestCode: item.requestCode,
  requestedBy: item.requestedBy,
  status: item.status,
  reason: item.reason,
  customerNote: item.customerNote,
  adminNote: actor === 'admin' ? item.adminNote : undefined,
  evidenceImages: item.evidenceImages,
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
    return {
      returnDeadlineAt: undefined,
      returnWindowDays: RETURN_DEADLINE_DAYS,
      returnWindowExpired: false,
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
  actorRole: 'admin' | 'customer'
) => {
  const returnWindow = getReturnWindowMeta(order);
  const withinReturnWindow =
    !returnWindow.returnWindowExpired || !returnWindow.returnDeadlineAt;

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
  actorRole: 'admin' | 'customer'
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
  actorRole: 'admin' | 'customer'
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
