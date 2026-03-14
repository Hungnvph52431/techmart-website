import {
  AdminOrderListFilters,
  CreateOrderDTO,
  CreateOrderReturnDTO,
  OrderActorRole,
  OrderStatus,
  PaymentStatus,
} from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import {
  canCancelOrder,
  canRequestReturn,
  getAllowedNextOrderStatuses,
  getAllowedNextPaymentStatuses,
} from '../policies/OrderLifecycle';

export class OrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async getAdminOrders(filters?: AdminOrderListFilters) {
    return this.orderRepository.findAdminList(filters);
  }

  async getAdminOrderDetail(orderId: number) {
    return this.orderRepository.findAdminDetail(orderId);
  }

  async getAdminOrderTimeline(orderId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return null;
    }

    return this.orderRepository.getOrderTimeline(orderId);
  }

  async getMyOrders(userId: number, status?: OrderStatus | 'all') {
    return this.orderRepository.findUserList(userId, status);
  }

  async getMyOrderDetail(orderId: number, userId: number) {
    return this.orderRepository.findOwnedDetail(orderId, userId);
  }

  async getMyOrderTimeline(orderId: number, userId: number) {
    const order = await this.orderRepository.findOwnedById(orderId, userId);
    if (!order) {
      return null;
    }

    return this.orderRepository.getOrderTimeline(orderId);
  }

  async getOrderStats() {
    return this.orderRepository.getStats();
  }

  async createOrder(orderData: CreateOrderDTO) {
    if (!orderData.items.length) {
      throw new Error('Order must contain at least one item');
    }

    for (const item of orderData.items) {
      if (item.quantity <= 0) {
        throw new Error('Order item quantity must be greater than zero');
      }

      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (item.variantId) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        if (!variant || variant.productId !== item.productId || !variant.isActive) {
          throw new Error(`Variant ${item.variantId} not found`);
        }

        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for variant ${variant.variantName}`);
        }
      } else if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }
    }

    return this.orderRepository.create(orderData);
  }

  async transitionOrderStatus(
    orderId: number,
    status: OrderStatus,
    actorUserId: number,
    actorRole: OrderActorRole,
    note?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return null;
    }

    if (!getAllowedNextOrderStatuses(order.status).includes(status)) {
      throw new Error(`Cannot transition order from ${order.status} to ${status}`);
    }

    return this.orderRepository.transitionStatus({
      orderId,
      currentStatus: order.status,
      nextStatus: status,
      actorUserId,
      actorRole,
      note,
    });
  }

  async updateOrderPaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatus,
    actorUserId: number,
    actorRole: OrderActorRole,
    note?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return null;
    }

    if (!getAllowedNextPaymentStatuses(order.paymentStatus).includes(paymentStatus)) {
      throw new Error(
        `Cannot transition payment status from ${order.paymentStatus} to ${paymentStatus}`
      );
    }

    return this.orderRepository.updatePaymentStatus({
      orderId,
      currentStatus: order.paymentStatus,
      nextStatus: paymentStatus,
      actorUserId,
      actorRole,
      note,
    });
  }

  async cancelOrder(
    orderId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    reason: string,
    adminNote?: string
  ) {
    const order =
      actorRole === 'customer'
        ? await this.orderRepository.findOwnedById(orderId, actorUserId)
        : await this.orderRepository.findById(orderId);

    if (!order) {
      return null;
    }

    if (!reason.trim()) {
      throw new Error('Cancel reason is required');
    }

    if (!canCancelOrder(order.status, actorRole)) {
      throw new Error(`Cannot cancel order in status ${order.status}`);
    }

    return this.orderRepository.cancel({
      orderId,
      currentStatus: order.status,
      actorUserId,
      actorRole,
      reason: reason.trim(),
      adminNote: adminNote?.trim() || undefined,
    });
  }

  async requestReturn(orderId: number, userId: number, payload: Omit<CreateOrderReturnDTO, 'orderId' | 'requestedBy'>) {
    const aggregate = await this.orderRepository.findOwnedDetail(orderId, userId);
    if (!aggregate) {
      return null;
    }

    if (!canRequestReturn(aggregate.order.status)) {
      throw new Error(`Cannot request return for order in status ${aggregate.order.status}`);
    }

    if (!payload.reason?.trim()) {
      throw new Error('Return reason is required');
    }

    if (!payload.items.length) {
      throw new Error('Return request must include at least one item');
    }

    const detailMap = new Map(
      aggregate.items.map((item) => [item.orderDetailId, item])
    );

    payload.items.forEach((item) => {
      const detail = detailMap.get(item.orderDetailId);
      if (!detail) {
        throw new Error(`Order detail ${item.orderDetailId} not found`);
      }

      if (item.quantity <= 0 || item.quantity > detail.quantity) {
        throw new Error(`Invalid return quantity for order detail ${item.orderDetailId}`);
      }
    });

    return this.orderRepository.createReturn({
      orderId,
      requestedBy: userId,
      reason: payload.reason.trim(),
      customerNote: payload.customerNote?.trim() || undefined,
      items: payload.items,
    });
  }

  async getOrderReturns(orderId: number, userId?: number) {
    if (userId) {
      const order = await this.orderRepository.findOwnedById(orderId, userId);
      if (!order) {
        return null;
      }
    } else {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return null;
      }
    }

    return this.orderRepository.listReturns(orderId);
  }

  async getOrderReturn(orderId: number, orderReturnId: number, userId?: number) {
    if (userId) {
      const order = await this.orderRepository.findOwnedById(orderId, userId);
      if (!order) {
        return null;
      }
    } else {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return null;
      }
    }

    return this.orderRepository.getReturnById(orderId, orderReturnId);
  }

  async reviewReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    decision: 'approved' | 'rejected',
    adminNote?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) {
      return null;
    }

    if (orderReturn.status !== 'requested') {
      throw new Error(`Cannot review return in status ${orderReturn.status}`);
    }

    return this.orderRepository.reviewReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      decision,
      adminNote: adminNote?.trim() || undefined,
    });
  }

  async receiveReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) {
      return null;
    }

    if (orderReturn.status !== 'approved') {
      throw new Error(`Cannot receive return in status ${orderReturn.status}`);
    }

    return this.orderRepository.receiveReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote: adminNote?.trim() || undefined,
    });
  }

  async refundReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) {
      return null;
    }

    if (orderReturn.status !== 'received') {
      throw new Error(`Cannot refund return in status ${orderReturn.status}`);
    }

    return this.orderRepository.refundReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote: adminNote?.trim() || undefined,
    });
  }

  async closeReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string
  ) {
    const aggregate = await this.orderRepository.findAdminDetail(orderId);
    if (!aggregate) {
      return null;
    }

    const orderReturn = aggregate.returns.find((item) => item.orderReturnId === orderReturnId);
    if (!orderReturn) {
      return null;
    }

    if (
      !['received', 'refunded', 'rejected'].includes(orderReturn.status) ||
      (aggregate.order.paymentStatus === 'paid' && orderReturn.status === 'received')
    ) {
      throw new Error(`Cannot close return in status ${orderReturn.status}`);
    }

    return this.orderRepository.closeReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote: adminNote?.trim() || undefined,
    });
  }
}
