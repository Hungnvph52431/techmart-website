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
  RETURN_DEADLINE_DAYS,
} from '../policies/OrderLifecycle';
import { sendPaymentSuccessEmail, sendOrderCreatedEmail } from '../services/EmailService';
import pool from '../../infrastructure/database/connection';
import { RowDataPacket } from 'mysql2';

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

  async getOrderStats(startDate?: string, endDate?: string) {
    return this.orderRepository.getStats(startDate, endDate);
  }

  async updateOrderPaymentStatus(
  orderId: number,
  paymentStatus: PaymentStatus,
  actorUserId: number | null,  // cho phép null
  actorRole: OrderActorRole,
  note?: string
) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;

    // Kiểm tra chính sách chuyển đổi trạng thái thanh toán
    if (!getAllowedNextPaymentStatuses(order.paymentStatus).includes(paymentStatus)) {
      throw new Error(`Không thể chuyển trạng thái thanh toán từ ${order.paymentStatus} sang ${paymentStatus}`);
    }

    const updated = await this.orderRepository.updatePaymentStatus({
      orderId,
      currentStatus: order.paymentStatus,
      nextStatus: paymentStatus,
      actorUserId,
      actorRole,
      note,
    });

    // Gửi email thông báo thanh toán thành công (không chặn flow chính)
    if (updated && paymentStatus === 'paid') {
      this.sendPaymentEmail(orderId).catch(() => {});
    }

    return updated;
  }

  async getAdminAllReturns(filters?: { status?: string }) {
    return this.orderRepository.listAllReturns(filters);
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
  async getOrderById(orderId: number) {
  return this.orderRepository.findById(orderId);
}
 async getOrderByCode(orderCode: string) {
  return this.orderRepository.findByOrderCode(orderCode);
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

  // Fix #4: Validate status trước khi close
  async closeReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) return null;
    if (!['refunded', 'rejected'].includes(orderReturn.status)) {
      throw new Error('Chỉ có thể đóng yêu cầu đã hoàn tiền hoặc đã từ chối');
    }

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
    const newOrder = await this.orderRepository.create(orderData);

    // Gửi email thông báo đặt hàng thành công (fire-and-forget, mọi phương thức)
    if (newOrder) {
      this.sendOrderCreatedEmailNotification(newOrder.orderId).catch(() => {});
    }

    // Wallet payment → đã paid ngay → không gửi thêm email thanh toán vì email đặt hàng đã đủ thông tin

    return newOrder;
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

    // Kiểm tra chính sách chuyển đổi trạng thái (phân biệt admin/customer/system)
    if (!getAllowedNextOrderStatuses(order.status, actorRole).includes(status)) {
      if (actorRole === 'admin' && order.status === 'delivered' && status === 'completed') {
        throw new Error('Admin không được chuyển sang Hoàn thành. Chỉ khách hàng mới có thể xác nhận đã nhận hàng.');
      }
      throw new Error(`Không thể chuyển trạng thái đơn hàng từ ${order.status} sang ${status}`);
    }

    const result = await this.orderRepository.transitionStatus({
      orderId,
      currentStatus: order.status,
      nextStatus: status,
      actorUserId,
      actorRole,
      note,
    });

    // Khi chuyển sang completed, tự động cập nhật payment_status → paid nếu chưa paid
    if (status === 'completed' && order.paymentStatus === 'pending') {
      try {
        await this.orderRepository.updatePaymentStatus({
          orderId, currentStatus: 'pending', nextStatus: 'paid',
          actorUserId, actorRole,
          note: 'Tự động xác nhận thanh toán khi đơn hàng hoàn thành',
        });
      } catch (err) {
        console.error('[OrderUseCase] Auto-pay on complete failed:', err);
      }
    }

    return result;
  }

  async confirmDeliveredByCustomer(orderId: number, userId: number) {
    const order = await this.orderRepository.findOwnedById(orderId, userId);
    if (!order) return null;

    let result: any;

    // Đơn đang giao → chuyển shipping → delivered → completed (2 bước)
    if (order.status === 'shipping') {
      await this.orderRepository.transitionStatus({
        orderId,
        currentStatus: 'shipping',
        nextStatus: 'delivered',
        actorUserId: userId,
        actorRole: 'customer',
        note: 'Khách hàng xác nhận đã nhận hàng',
      });
      result = await this.orderRepository.transitionStatus({
        orderId,
        currentStatus: 'delivered',
        nextStatus: 'completed',
        actorUserId: userId,
        actorRole: 'customer',
        note: 'Tự động hoàn thành sau khi khách xác nhận nhận hàng',
      });
    } else if (order.status === 'delivered') {
      // Đơn đã giao → chuyển thẳng sang completed
      result = await this.orderRepository.transitionStatus({
        orderId,
        currentStatus: 'delivered',
        nextStatus: 'completed',
        actorUserId: userId,
        actorRole: 'customer',
        note: 'Khách hàng xác nhận đã nhận hàng',
      });
    } else if (order.status === 'completed') {
      return order;
    } else {
      throw new Error(
        `Chỉ có thể xác nhận đã nhận hàng khi đơn đang giao hoặc đã giao (hiện tại: ${order.status})`
      );
    }

    // Tự động chuyển payment_status → paid khi khách xác nhận nhận hàng (COD)
    if (order.paymentStatus === 'pending') {
      try {
        await this.orderRepository.updatePaymentStatus({
          orderId,
          currentStatus: 'pending',
          nextStatus: 'paid',
          actorUserId: userId,
          actorRole: 'customer',
          note: 'Tự động xác nhận thanh toán khi khách nhận hàng (COD)',
        });
        // Gửi email thanh toán thành công
        this.sendPaymentEmail(orderId).catch(() => {});
      } catch (err) {
        console.error('[OrderUseCase] Auto-pay on confirm failed:', err);
      }
    }

    return result;
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

    // Fix #8: Kiểm tra thời hạn hoàn trả (N ngày kể từ ngày giao)
    const deliveredAt = aggregate.order.deliveredAt;
    if (deliveredAt) {
      const deadline = new Date(deliveredAt);
      deadline.setDate(deadline.getDate() + RETURN_DEADLINE_DAYS);
      if (new Date() > deadline) {
        throw new Error(`Đã quá thời hạn ${RETURN_DEADLINE_DAYS} ngày để yêu cầu hoàn trả`);
      }
    }

    // Fix #2: Không cho tạo yêu cầu hoàn trả nếu đã có yêu cầu đang xử lý
    const existingReturns = await this.orderRepository.listReturns(orderId);
    const hasActiveReturn = existingReturns.some(
      (r) => !['closed', 'rejected'].includes(r.status)
    );
    if (hasActiveReturn) {
      throw new Error('Đơn hàng này đã có yêu cầu hoàn trả đang xử lý');
    }

    return this.orderRepository.createReturn({
      orderId,
      requestedBy: userId,
      reason: payload.reason.trim(),
      customerNote: payload.customerNote?.trim(),
      items: payload.items,
      evidenceImages: payload.evidenceImages,
    });
  }

  // Các hàm duyệt và xử lý hoàn trả dành cho Admin
  async reviewReturn(orderId: number, orderReturnId: number, actorUserId: number, actorRole: OrderActorRole, decision: 'approved' | 'rejected', adminNote?: string) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) return null;
    if (orderReturn.status !== 'requested') {
      throw new Error('Chỉ có thể duyệt/từ chối yêu cầu đang ở trạng thái "Chờ duyệt"');
    }
    return this.orderRepository.reviewReturn({ orderId, orderReturnId, actorUserId, actorRole, decision, adminNote });
  }

  // Fix #3: Validate status trước khi refund
  async refundReturn(orderId: number, orderReturnId: number, actorUserId: number, actorRole: OrderActorRole, adminNote?: string) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) return null;
    if (orderReturn.status !== 'received') {
      throw new Error('Chỉ có thể hoàn tiền khi đã nhận lại hàng (received)');
    }
    return this.orderRepository.refundReturn({ orderId, orderReturnId, actorUserId, actorRole, adminNote });
  }

  // --- EMAIL THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG ---
  private async sendOrderCreatedEmailNotification(orderId: number): Promise<void> {
    try {
      const aggregate = await this.orderRepository.findAdminDetail(orderId);
      if (!aggregate) return;

      const order = aggregate.order;

      const [userRows] = await pool.execute<RowDataPacket[]>(
        'SELECT name, email FROM users WHERE user_id = ?',
        [order.userId]
      );
      const user = userRows[0];
      if (!user?.email) return;

      await sendOrderCreatedEmail({
        customerName: user.name,
        customerEmail: user.email,
        orderCode: order.orderCode,
        orderId: order.orderId,
        total: order.total,
        paymentMethod: order.paymentMethod,
        items: aggregate.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendOrderCreatedEmail failed:', error);
    }
  }

  // --- EMAIL THÔNG BÁO THANH TOÁN ---
  // Chỉ gửi cho COD/VNPay khi payment chuyển sang paid SAU khi tạo đơn
  // Wallet đã gửi email đặt hàng (có ghi "Đã thanh toán") nên không cần email này
  private async sendPaymentEmail(orderId: number): Promise<void> {
    try {
      const aggregate = await this.orderRepository.findAdminDetail(orderId);
      if (!aggregate) return;

      const order = aggregate.order;

      // Wallet: email đặt hàng đã đủ thông tin, không gửi thêm
      if (order.paymentMethod === 'wallet') return;

      // Lấy thông tin user (email, name)
      const [userRows] = await pool.execute<RowDataPacket[]>(
        'SELECT name, email FROM users WHERE user_id = ?',
        [order.userId]
      );
      const user = userRows[0];
      if (!user?.email) return;

      await sendPaymentSuccessEmail({
        customerName: user.name,
        customerEmail: user.email,
        orderCode: order.orderCode,
        orderId: order.orderId,
        total: order.total,
        paymentMethod: order.paymentMethod,
        items: aggregate.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendPaymentEmail failed:', error);
    }
  }
}