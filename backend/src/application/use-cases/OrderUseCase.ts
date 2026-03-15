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
} from '../policies/OrderLifecycle'; // Đảm bảo Khanh đã có file Policy này

export class OrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  // --- TRUY VẤN DÀNH CHO ADMIN ---
  async getAdminOrders(filters?: AdminOrderListFilters) {
    return this.orderRepository.findAdminList(filters);
  }

  async getAdminOrderDetail(orderId: number) {
    return this.orderRepository.findAdminDetail(orderId);
  }

  async getAdminOrderTimeline(orderId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;
    return this.orderRepository.getOrderTimeline(orderId);
  }

  async getOrderStats() {
    return this.orderRepository.getStats();
  }

  async updateOrderPaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatus,
    actorUserId: number,
    actorRole: OrderActorRole,
    note?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;

    // Kiểm tra chính sách chuyển đổi trạng thái thanh toán
    if (!getAllowedNextPaymentStatuses(order.paymentStatus).includes(paymentStatus)) {
      throw new Error(`Không thể chuyển trạng thái thanh toán từ ${order.paymentStatus} sang ${paymentStatus}`);
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

  async getOrderReturns(orderId: number, userId?: number) {
    if (userId) {
      const order = await this.orderRepository.findOwnedById(orderId, userId);
      if (!order) return null;
    } else {
      const order = await this.orderRepository.findById(orderId);
      if (!order) return null;
    }
    return this.orderRepository.listReturns(orderId);
  }
  async getOrderReturn(orderId: number, orderReturnId: number, userId?: number) {
    if (userId) {
      // Nếu có userId, kiểm tra quyền sở hữu để bảo mật (Dành cho khách hàng)
      const order = await this.orderRepository.findOwnedById(orderId, userId);
      if (!order) return null;
    } else {
      // Nếu không có userId (Admin), truy vấn thẳng đơn hàng
      const order = await this.orderRepository.findById(orderId);
      if (!order) return null;
    }

    // Gọi repository để lấy chi tiết yêu cầu hoàn trả kèm danh sách sản phẩm
    return this.orderRepository.getReturnById(orderId, orderReturnId);
  }
 
  async receiveReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) return null;

    if (orderReturn.status !== 'approved') {
      throw new Error(`Chỉ có thể nhận hàng khi yêu cầu đã được chấp nhận (approved)`);
    }

    return this.orderRepository.receiveReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote: adminNote?.trim(),
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
    if (!aggregate) return null;

    const orderReturn = aggregate.returns.find((item) => item.orderReturnId === orderReturnId);
    if (!orderReturn) return null;

    return this.orderRepository.closeReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote: adminNote?.trim(),
    });
  }

  
  // --- TRUY VẤN DÀNH CHO KHÁCH HÀNG ---
  async getMyOrders(userId: number, status?: OrderStatus | 'all') {
    return this.orderRepository.findUserList(userId, status);
  }

  async getMyOrderDetail(orderId: number, userId: number) {
    return this.orderRepository.findOwnedDetail(orderId, userId);
  }
  async getMyOrderTimeline(orderId: number, userId: number) {
    // Kiểm tra xem đơn hàng có đúng là của User này không
    const order = await this.orderRepository.findOwnedById(orderId, userId);
    if (!order) {
      return null;
    }

    // Nếu đúng chủ sở hữu, trả về lịch sử sự kiện
    return this.orderRepository.getOrderTimeline(orderId);
  }
  // --- LOGIC TẠO ĐƠN HÀNG ---
  async createOrder(orderData: CreateOrderDTO) {
    if (!orderData.items.length) {
      throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
    }

    // Kiểm tra tồn kho trước khi đặt hàng
    for (const item of orderData.items) {
      if (item.quantity <= 0) throw new Error('Số lượng sản phẩm phải lớn hơn 0');

      const product = await this.productRepository.findById(item.productId);
      if (!product) throw new Error(`Sản phẩm mã ${item.productId} không tồn tại`);

      // Kiểm tra biến thể (Màu sắc/Dung lượng) nếu có
      if (item.variantId) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        if (!variant || variant.productId !== item.productId || !variant.isActive) {
          throw new Error(`Phiên bản sản phẩm ${item.variantId} không khả dụng`);
        }
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Kho không đủ máy ${variant.variantName} (Còn ${variant.stockQuantity})`);
        }
      } else if (product.stockQuantity < item.quantity) {
        throw new Error(`Sản phẩm ${product.name} đã hết hàng hoặc không đủ số lượng`);
      }
    }

    // Repository sẽ tự động thực hiện trừ kho trong Transaction
    return this.orderRepository.create(orderData);
  }

  // --- QUẢN LÝ TRẠNG THÁI & HỦY ĐƠN ---
  async transitionOrderStatus(
    orderId: number,
    status: OrderStatus,
    actorUserId: number,
    actorRole: OrderActorRole,
    note?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;

    // Kiểm tra chính sách chuyển đổi trạng thái (Ví dụ: Không thể nhảy từ Chờ duyệt sang Đã giao ngay)
    if (!getAllowedNextOrderStatuses(order.status).includes(status)) {
      throw new Error(`Không thể chuyển trạng thái đơn hàng từ ${order.status} sang ${status}`);
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

  async cancelOrder(
    orderId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    reason: string,
    adminNote?: string
  ) {
    const order = actorRole === 'customer'
        ? await this.orderRepository.findOwnedById(orderId, actorUserId)
        : await this.orderRepository.findById(orderId);

    if (!order) return null;
    if (!reason.trim()) throw new Error('Vui lòng cung cấp lý do hủy đơn');

    // Khách hàng chỉ được hủy khi đơn đang ở trạng thái 'pending'
    if (!canCancelOrder(order.status, actorRole)) {
      throw new Error(`Đơn hàng đã ở trạng thái ${order.status}, không thể hủy`);
    }

    return this.orderRepository.cancel({
      orderId,
      currentStatus: order.status,
      actorUserId,
      actorRole,
      reason: reason.trim(),
      adminNote: adminNote?.trim(),
    });
  }

  // --- QUẢN LÝ HOÀN TRẢ (RETURNS) ---
  async requestReturn(orderId: number, userId: number, payload: Omit<CreateOrderReturnDTO, 'orderId' | 'requestedBy'>) {
    const aggregate = await this.orderRepository.findOwnedDetail(orderId, userId);
    if (!aggregate) return null;

    if (!canRequestReturn(aggregate.order.status)) {
      throw new Error('Chỉ có thể yêu cầu trả hàng cho đơn đã giao thành công');
    }

    return this.orderRepository.createReturn({
      orderId,
      requestedBy: userId,
      reason: payload.reason.trim(),
      customerNote: payload.customerNote?.trim(),
      items: payload.items,
    });
  }

  // Các hàm duyệt và xử lý hoàn trả dành cho Admin
  async reviewReturn(orderId: number, orderReturnId: number, actorUserId: number, actorRole: OrderActorRole, decision: 'approved' | 'rejected', adminNote?: string) {
    return this.orderRepository.reviewReturn({ orderId, orderReturnId, actorUserId, actorRole, decision, adminNote });
  }

  async refundReturn(orderId: number, orderReturnId: number, actorUserId: number, actorRole: OrderActorRole, adminNote?: string) {
    return this.orderRepository.refundReturn({ orderId, orderReturnId, actorUserId, actorRole, adminNote });
  }
}