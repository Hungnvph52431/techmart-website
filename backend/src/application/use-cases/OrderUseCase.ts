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
import {
  sendOrderCancelledEmail,
  sendOrderCreatedEmail,
  sendOrderReturnRefundedEmail,
  sendPaymentSuccessEmail,
} from '../services/EmailService';
import { VietnamAdministrativeService } from '../services/VietnamAdministrativeService';

export class OrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository,
    private vietnamAdministrativeService: VietnamAdministrativeService
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

      // VNPay/Bank Transfer: khi payment confirm → auto-transition to shipping (skip pending/confirmed)
      if (['vnpay', 'bank_transfer'].includes(order.paymentMethod)) {
        try {
          const updatedOrder = await this.orderRepository.findById(orderId);
          if (updatedOrder && updatedOrder.status === 'pending') {
            // Skip confirmed → go directly to shipping
            await this.transitionOrderStatus(orderId, 'confirmed', actorUserId || 0, 'system', 'Tự động xác nhận do thanh toán online');
            await this.transitionOrderStatus(orderId, 'shipping', actorUserId || 0, 'system', 'Tự động bắt đầu giao do thanh toán online');
          }
        } catch (err) {
          console.error('[OrderUseCase] Auto-transition for vnpay/bank_transfer failed:', err);
        }
      }
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

  async lookupGuestOrder(orderCode: string, email: string) {
    const normalizedOrderCode = orderCode.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedOrderCode) {
      throw new Error('Vui lòng nhập mã đơn hàng');
    }

    if (!normalizedEmail) {
      throw new Error('Vui lòng nhập email đặt hàng');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Email đặt hàng không hợp lệ');
    }

    return this.orderRepository.findGuestDetailByCode(
      normalizedOrderCode,
      normalizedEmail,
    );
  }

  async getGuestOrderByCode(orderCode: string, email: string) {
    const normalizedOrderCode = orderCode.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedOrderCode) {
      throw new Error('Vui lòng nhập mã đơn hàng');
    }

    if (!normalizedEmail) {
      throw new Error('Vui lòng nhập email đặt hàng');
    }

    return this.orderRepository.findGuestByCode(
      normalizedOrderCode,
      normalizedEmail,
    );
  }
  // --- LOGIC TẠO ĐƠN HÀNG ---
  async createOrder(orderData: CreateOrderDTO) {
    if (!orderData.items.length) {
      throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
    }

    orderData.shippingName = orderData.shippingName?.trim();
    orderData.shippingPhone = orderData.shippingPhone?.trim();
    orderData.shippingAddress = orderData.shippingAddress?.trim();
    orderData.customerName = orderData.customerName?.trim() || orderData.shippingName;
    orderData.customerPhone = orderData.customerPhone?.trim() || orderData.shippingPhone;
    orderData.customerEmail = orderData.customerEmail?.trim().toLowerCase();

    if (!orderData.shippingName || !orderData.shippingPhone || !orderData.shippingAddress || !orderData.shippingCity) {
      throw new Error('Vui lòng điền đầy đủ thông tin giao hàng');
    }

    if (!orderData.customerEmail) {
      throw new Error('Vui lòng nhập email đặt hàng');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.customerEmail)) {
      throw new Error('Email đặt hàng không hợp lệ');
    }

    if (!orderData.userId && orderData.paymentMethod !== 'vnpay') {
      throw new Error('Khách vãng lai hiện chỉ hỗ trợ thanh toán qua VNPay');
    }

    // Validate tỉnh/thành phố — ward chỉ validate ở frontend (backend data không đủ 11k+ phường/xã)
    const province = this.vietnamAdministrativeService.resolveProvinceByName(orderData.shippingCity ?? '');
    if (!province) {
      throw new Error('Tỉnh/thành phố giao hàng không hợp lệ');
    }
    orderData.shippingCity = province.name;
    orderData.shippingDistrict = orderData.shippingDistrict?.trim() || undefined;

    // Validate cơ bản (stock check atomic nằm trong OrderRepository.create transaction)
    for (const item of orderData.items) {
      if (item.quantity <= 0) throw new Error('Số lượng sản phẩm phải lớn hơn 0');

      const product = await this.productRepository.findById(item.productId);
      if (!product) throw new Error(`Sản phẩm mã ${item.productId} không tồn tại`);

      if (item.variantId) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        if (!variant || variant.productId !== item.productId || !variant.isActive) {
          throw new Error(`Phiên bản sản phẩm ${item.variantId} không khả dụng`);
        }
      }
    }
    const newOrder = await this.orderRepository.create(orderData);

    // Gửi email thông báo đặt hàng thành công (fire-and-forget, mọi phương thức)
    if (newOrder) {
      this.sendOrderCreatedEmailNotification(newOrder.orderId).catch(() => {});
    }

    // Wallet: thanh toán ngay → tự động chuyển sang shipping
    if (orderData.paymentMethod === 'wallet' && newOrder && orderData.userId) {
      try {
        // Mark as paid
        await this.updateOrderPaymentStatus(newOrder.orderId, 'paid', orderData.userId, 'customer', 'Thanh toán qua ví TechMart');
        // Transition to shipping (skip pending → confirmed → shipping)
        await this.transitionOrderStatus(newOrder.orderId, 'confirmed', orderData.userId, 'customer', 'Tự động xác nhận do thanh toán ví');
        await this.transitionOrderStatus(newOrder.orderId, 'shipping', orderData.userId, 'system', 'Tự động bắt đầu giao do thanh toán ví');
      } catch (err) {
        console.error('[OrderUseCase] Auto-transition for wallet failed:', err);
      }
    }

    return newOrder;
  }

  // --- XÁC NHẬN + GÁN SHIPPER (1 bước) ---
  async confirmAndAssignShipper(orderId: number, shipperId: number, actorUserId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'pending') throw new Error('Đơn hàng không ở trạng thái chờ xử lý');
    if (!shipperId) throw new Error('Vui lòng chọn shipper để giao đơn này');

    const result = await this.orderRepository.confirmAndAssignShipper(orderId, shipperId, actorUserId);
    if (!result) throw new Error('Đơn hàng vừa được xử lý bởi người khác');
    return result;
  }

  // --- XÁC NHẬN NHẬP KHO (Admin) ---
  async confirmWarehouseReceipt(orderId: number, adminId: number, condition: 'good' | 'defective') {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    const deliveryStatus = (order as any).deliveryStatus as string | undefined;
    if (deliveryStatus !== 'RETURNED') {
      throw new Error('Đơn hàng chưa được shipper xác nhận trả về kho');
    }
    if (order.warehouseReceivedAt) {
      throw new Error(`Đơn hàng đã được xác nhận nhập kho lúc ${order.warehouseReceivedAt.toLocaleString('vi-VN')}`);
    }
    await this.orderRepository.updateWarehouseReceivedAt(orderId, condition);
    if (condition === 'good') {
      await this.orderRepository.restockForWarehouseReceipt(orderId, adminId);
    }
    const note = condition === 'good'
      ? 'Admin xác nhận nhập kho - Hàng tốt, đã nhập lại kho'
      : 'Admin xác nhận nhập kho - Hàng lỗi, không nhập lại kho';
    await this.orderRepository.logEvent(orderId, adminId, 'admin', 'status_changed', 'returned', 'returned', note);
    return { success: true, orderId, condition, message: condition === 'good' ? 'Đã nhập kho hàng tốt' : 'Đã ghi nhận hàng lỗi' };
  }

  // --- QUẢN LÝ TRẠNG THÁI & HỦY ĐƠN ---
  async assignShipper(orderId: number, shipperId: number | null) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return this.orderRepository.assignShipper(orderId, shipperId);
  }

  async reassignShipper(orderId: number, newShipperId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const deliveryStatus = (order as any).deliveryStatus as string | undefined;
    const blockedStatuses = ['PICKED_UP', 'IN_DELIVERY'];
    if (deliveryStatus && blockedStatuses.includes(deliveryStatus)) {
      throw new Error(
        `Không thể đổi shipper khi đang giao hàng (delivery_status=${deliveryStatus}). Vui lòng liên hệ shipper hiện tại.`
      );
    }

    return this.orderRepository.reassignShipper(orderId, newShipperId);
  }

  async transitionOrderStatus(
    orderId: number,
    status: OrderStatus,
    actorUserId: number,
    actorRole: OrderActorRole,
    note?: string,
    shipperId?: number | null
  ) {
    if (status === 'cancelled') {
      throw new Error('Vui lòng dùng chức năng hủy đơn và nhập lý do hủy');
    }

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
      shipperId,
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

  async confirmDeliveredByGuest(orderCode: string, email: string) {
    const aggregate = await this.orderRepository.findGuestDetailByCode(
      orderCode,
      email,
    );
    if (!aggregate) return null;

    const order = aggregate.order;
    let result: any;

    if (order.status === 'shipping') {
      await this.orderRepository.transitionStatus({
        orderId: order.orderId,
        currentStatus: 'shipping',
        nextStatus: 'delivered',
        actorUserId: null,
        actorRole: 'customer',
        note: 'Khách vãng lai xác nhận đã nhận hàng',
      });
      result = await this.orderRepository.transitionStatus({
        orderId: order.orderId,
        currentStatus: 'delivered',
        nextStatus: 'completed',
        actorUserId: null,
        actorRole: 'customer',
        note: 'Tự động hoàn thành sau khi khách vãng lai xác nhận nhận hàng',
      });
    } else if (order.status === 'delivered') {
      result = await this.orderRepository.transitionStatus({
        orderId: order.orderId,
        currentStatus: 'delivered',
        nextStatus: 'completed',
        actorUserId: null,
        actorRole: 'customer',
        note: 'Khách vãng lai xác nhận đã nhận hàng',
      });
    } else if (order.status === 'completed') {
      return order;
    } else {
      throw new Error(
        `Chỉ có thể xác nhận đã nhận hàng khi đơn đang giao hoặc đã giao (hiện tại: ${order.status})`,
      );
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

    const cancelledOrder = await this.orderRepository.cancel({
      orderId,
      currentStatus: order.status,
      actorUserId,
      actorRole,
      reason: reason.trim(),
      adminNote: adminNote?.trim(),
    });

    if (cancelledOrder && actorRole !== 'customer') {
      this.sendOrderCancelledEmailNotification(orderId).catch(() => {});
    }

    return cancelledOrder;
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
      refundDestination: payload.refundDestination ?? 'wallet',
      reason: payload.reason.trim(),
      customerNote: payload.customerNote?.trim(),
      items: payload.items,
      evidenceImages: payload.evidenceImages,
    });
  }

  async requestReturnByGuest(
    orderCode: string,
    email: string,
    payload: Omit<CreateOrderReturnDTO, 'orderId' | 'requestedBy'>,
  ) {
    const aggregate = await this.orderRepository.findGuestDetailByCode(
      orderCode,
      email,
    );
    if (!aggregate) return null;

    if (!canRequestReturn(aggregate.order.status)) {
      throw new Error('Chỉ có thể yêu cầu trả hàng cho đơn đã giao thành công');
    }

    const deliveredAt = aggregate.order.deliveredAt;
    if (deliveredAt) {
      const deadline = new Date(deliveredAt);
      deadline.setDate(deadline.getDate() + RETURN_DEADLINE_DAYS);
      if (new Date() > deadline) {
        throw new Error(
          `Đã quá thời hạn ${RETURN_DEADLINE_DAYS} ngày để yêu cầu hoàn trả`,
        );
      }
    }

    const existingReturns = await this.orderRepository.listReturns(
      aggregate.order.orderId,
    );
    const hasActiveReturn = existingReturns.some(
      (item) => !['closed', 'rejected'].includes(item.status),
    );
    if (hasActiveReturn) {
      throw new Error('Đơn hàng này đã có yêu cầu hoàn trả đang xử lý');
    }

    if (payload.refundDestination === 'bank_account') {
      throw new Error('Khách vãng lai chưa hỗ trợ hoàn tiền về tài khoản ngân hàng');
    }

    return this.orderRepository.createReturn({
      orderId: aggregate.order.orderId,
      requestedBy: null,
      refundDestination: 'wallet',
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
  async refundReturn(
    orderId: number,
    orderReturnId: number,
    actorUserId: number,
    actorRole: OrderActorRole,
    adminNote?: string,
    receiptImageUrl?: string
  ) {
    const orderReturn = await this.orderRepository.getReturnById(orderId, orderReturnId);
    if (!orderReturn) return null;
    if (orderReturn.status !== 'received') {
      throw new Error('Chỉ có thể hoàn tiền khi đã nhận lại hàng (received)');
    }
    const result = await this.orderRepository.refundReturn({
      orderId,
      orderReturnId,
      actorUserId,
      actorRole,
      adminNote,
      receiptImageUrl,
    });

    if (result) {
      this.sendReturnRefundedEmailNotification(orderId, orderReturnId).catch(() => {});
    }

    return result;
  }

  // --- EMAIL THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG ---
  private async sendOrderCreatedEmailNotification(orderId: number): Promise<void> {
    try {
      const aggregate = await this.orderRepository.findAdminDetail(orderId);
      if (!aggregate) return;

      const order = aggregate.order;
      if (!order.customerEmail) return;

      await sendOrderCreatedEmail({
        customerName: order.customerName || order.shippingName,
        customerEmail: order.customerEmail,
        orderCode: order.orderCode,
        orderId: order.orderId,
        orderUrl: order.userId
          ? undefined
          : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/lookup/${encodeURIComponent(order.orderCode)}`,
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
        voucherCode: order.couponCode || undefined,
        discountAmount: order.discountAmount > 0 ? order.discountAmount : undefined,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendOrderCreatedEmail failed:', error);
    }
  }

  private async sendOrderCancelledEmailNotification(orderId: number): Promise<void> {
    try {
      const aggregate = await this.orderRepository.findAdminDetail(orderId);
      if (!aggregate) return;

      const order = aggregate.order;
      if (!order.customerEmail || !order.cancelReason) return;

      const refundMessage = order.paymentStatus === 'refunded'
        ? `Số tiền ${order.total.toLocaleString('vi-VN')}đ đã được hoàn vào ví TechMart của bạn.`
        : order.paymentMethod === 'deposit' && Number(order.depositAmount || 0) > 0
          ? `Tiền cọc ${Number(order.depositAmount || 0).toLocaleString('vi-VN')}đ đã được hoàn vào ví TechMart của bạn.`
          : undefined;

      await sendOrderCancelledEmail({
        customerName: order.customerName || order.shippingName,
        customerEmail: order.customerEmail,
        orderCode: order.orderCode,
        orderId: order.orderId,
        orderUrl: order.userId
          ? undefined
          : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/lookup/${encodeURIComponent(order.orderCode)}`,
        cancelReason: order.cancelReason,
        refundMessage,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendOrderCancelledEmail failed:', error);
    }
  }

  private async sendReturnRefundedEmailNotification(
    orderId: number,
    orderReturnId: number,
  ): Promise<void> {
    try {
      const aggregate = await this.orderRepository.findAdminDetail(orderId);
      if (!aggregate) return;

      const orderReturn = aggregate.returns.find(
        (item) => item.orderReturnId === orderReturnId,
      );
      if (!orderReturn || !aggregate.order.customerEmail) return;

      const refundAmount = (orderReturn.items || []).reduce((sum, returnItem) => {
        const matchedOrderItem = aggregate.items.find(
          (item) => item.orderDetailId === returnItem.orderDetailId,
        );
        return sum + Number(matchedOrderItem?.price ?? 0) * Number(returnItem.quantity ?? 0);
      }, 0);

      const isGuestOrder = !aggregate.order.userId;
      const orderUrl = isGuestOrder
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/lookup/${encodeURIComponent(aggregate.order.orderCode)}`
        : undefined;

      await sendOrderReturnRefundedEmail({
        customerName: aggregate.order.customerName || aggregate.order.shippingName,
        customerEmail: aggregate.order.customerEmail,
        orderCode: aggregate.order.orderCode,
        orderId: aggregate.order.orderId,
        orderUrl,
        requestCode: orderReturn.requestCode,
        refundAmount,
        refundDestination: orderReturn.refundDestination,
        paymentStatus: aggregate.order.paymentStatus,
        refundBankName: orderReturn.refundBankName,
        refundAccountNumberMasked: orderReturn.refundAccountNumberMasked,
        receiptImageUrl: orderReturn.refundReceiptImageUrl,
        adminNote: orderReturn.adminNote,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendReturnRefundedEmail failed:', error);
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
      if (!order.customerEmail) return;

      await sendPaymentSuccessEmail({
        customerName: order.customerName || order.shippingName,
        customerEmail: order.customerEmail,
        orderCode: order.orderCode,
        orderId: order.orderId,
        orderUrl: order.userId
          ? undefined
          : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/lookup/${encodeURIComponent(order.orderCode)}`,
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
        voucherCode: order.couponCode || undefined,
        discountAmount: order.discountAmount > 0 ? order.discountAmount : undefined,
      });
    } catch (error) {
      console.error('[OrderUseCase] sendPaymentEmail failed:', error);
    }
  }
}
