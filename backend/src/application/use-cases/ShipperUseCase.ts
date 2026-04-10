import {
  IShipperRepository,
  ShipperOrderFilters,
} from '../../domain/repositories/IShipperRepository';

const MAX_ATTEMPTS = 3;

export class ShipperUseCase {
  constructor(private shipperRepository: IShipperRepository) {}

  async getAssignedOrders(shipperId: number, filters: ShipperOrderFilters) {
    return this.shipperRepository.getAssignedOrders(shipperId, filters);
  }

  async getOrderDetail(orderId: number, shipperId: number) {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');
    }
    return order;
  }

  async pickupOrder(orderId: number, shipperId: number) {
    // Lấy đơn không filter shipper để validate rõ ràng từng trường hợp
    const order = await this.shipperRepository.getOrderById(orderId);
    if (!order) throw new Error('Đơn hàng không tồn tại');

    // 1. Đơn phải đã được Admin assign
    if (!order.shipperId) {
      throw new Error('Đơn hàng chưa được phân công. Vui lòng liên hệ quản lý.');
    }

    // 2. Chỉ đúng shipper được assign mới pickup được
    if (order.shipperId !== shipperId) {
      throw new Error('Đơn hàng này không được phân công cho bạn.');
    }

    // 3. Đúng trạng thái mới cho pickup
    if (order.deliveryStatus !== 'WAITING_PICKUP') {
      throw new Error(`Không thể lấy hàng: trạng thái hiện tại là ${order.deliveryStatus}`);
    }

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: 'PICKED_UP',
    });
    await this.shipperRepository.appendDeliveryEvent(orderId, shipperId, 'PICKED_UP', 'Shipper xác nhận lấy hàng');
  }

  async startDelivery(orderId: number, shipperId: number) {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');

    if (order.deliveryStatus !== 'PICKED_UP') {
      throw new Error(`Không thể bắt đầu giao: trạng thái hiện tại là ${order.deliveryStatus}`);
    }

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: 'IN_DELIVERY',
    });
    await this.shipperRepository.appendDeliveryEvent(orderId, shipperId, 'IN_DELIVERY', 'Shipper bắt đầu giao hàng');
  }

  async completeDelivery(
    orderId: number,
    shipperId: number,
    data: { photoUrl: string; codCollected?: boolean; confirmedAmount?: number }
  ): Promise<{ warning?: string }> {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');

    if (order.deliveryStatus !== 'IN_DELIVERY') {
      throw new Error(`Không thể hoàn thành: trạng thái hiện tại là ${order.deliveryStatus}`);
    }

    if (!data.photoUrl) {
      throw new Error('Vui lòng upload ảnh xác nhận giao hàng');
    }

    // Validation COD: bắt buộc xác nhận thu tiền (check payment_method, không check codAmount để tránh bypass)
    const isCOD = order.paymentMethod === 'cod';
    if (isCOD) {
      if (!data.codCollected) {
        throw new Error('Vui lòng xác nhận đã thu tiền COD');
      }
      if (data.confirmedAmount !== undefined && Number(data.confirmedAmount) !== Number(order.codAmount)) {
        throw new Error(
          `Số tiền không khớp. Cần thu: ${order.codAmount.toLocaleString('vi-VN')}đ`
        );
      }
    }

    const now = new Date();
    let warning: string | undefined;

    // COD: set payment_status = 'paid' khi shipper xác nhận đã thu tiền mặt
    // non-COD (VNPay/banking/momo): giữ nguyên payment_status (đã paid từ cổng thanh toán)
    const paymentUpdate = isCOD
      ? { paymentStatus: 'paid', paymentDate: now }
      : {};

    // Cảnh báo đơn non-COD chưa được thanh toán
    if (!isCOD && order.paymentStatus !== 'paid') {
      warning = `Đơn hàng chưa được thanh toán online (${order.paymentMethod}). Đã ghi nhận và thông báo Admin kiểm tra.`;
      console.warn(`[WARN] Order ${orderId}: giao thành công nhưng payment_status=${order.paymentStatus} (${order.paymentMethod})`);
    }

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: 'DELIVERED',
      deliveredAt: now,
      codCollected: data.codCollected ?? false,
      deliveryPhotoUrl: data.photoUrl,
      failReason: null,
      ...paymentUpdate,
    });

    await this.shipperRepository.createDeliveryAttempt({
      orderId,
      shipperId,
      status: 'SUCCESS',
      photoUrl: data.photoUrl,
    });
    await this.shipperRepository.appendDeliveryEvent(orderId, shipperId, 'DELIVERED',
      isCOD ? `Giao thành công - COD thu ${order.codAmount}đ` : 'Giao thành công - đã thanh toán online'
    );

    return { warning };
  }

  async failDelivery(
    orderId: number,
    shipperId: number,
    data: { failReason: string; note?: string }
  ) {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');

    if (order.deliveryStatus !== 'IN_DELIVERY') {
      throw new Error(`Không thể báo thất bại: trạng thái hiện tại là ${order.deliveryStatus}`);
    }

    if (!data.failReason) {
      throw new Error('Vui lòng chọn lý do giao thất bại');
    }

    const validReasons = ['VACANT', 'WRONG_ADDRESS', 'CUSTOMER_REFUSED', 'OTHER'];
    if (!validReasons.includes(data.failReason)) {
      throw new Error('Lý do thất bại không hợp lệ');
    }

    const newAttemptCount = order.attemptCount + 1;
    // Auto-escalate to RETURNING after MAX_ATTEMPTS failures
    const nextStatus = newAttemptCount >= MAX_ATTEMPTS ? 'RETURNING' : 'FAILED';

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: nextStatus,
      failReason: data.failReason,
      attemptCount: newAttemptCount,
    });

    await this.shipperRepository.createDeliveryAttempt({
      orderId,
      shipperId,
      status: 'FAILED',
      failReason: data.failReason as any,
      note: data.note,
    });

    await this.shipperRepository.appendDeliveryEvent(orderId, shipperId, nextStatus,
      `Giao thất bại lần ${newAttemptCount}: ${data.failReason}${data.note ? ' - ' + data.note : ''}`
    );

    // Đơn RETURNING + đã thanh toán online → hoàn tiền vào ví
    if (nextStatus === 'RETURNING') {
      await this.shipperRepository.triggerReturningRefund(orderId, {
        userId: order.userId ?? null,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus ?? 'pending',
        subtotal: order.subtotal,
        orderCode: order.orderCode,
      });
    }

    return { nextStatus, attemptCount: newAttemptCount };
  }

  // FIX 1: FAILED → IN_DELIVERY (giao lại)
  async retryDelivery(orderId: number, shipperId: number) {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');

    if (order.deliveryStatus !== 'FAILED') {
      throw new Error('Chỉ có thể giao lại đơn hàng đang ở trạng thái thất bại');
    }

    if (order.attemptCount >= MAX_ATTEMPTS) {
      throw new Error('Đơn hàng đã thất bại 3 lần, không thể giao lại. Vui lòng trả về kho.');
    }

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: 'IN_DELIVERY',
      // giữ nguyên attempt_count — không reset
    });
    await this.shipperRepository.appendDeliveryEvent(
      orderId, shipperId, 'IN_DELIVERY',
      `Giao lại lần ${order.attemptCount + 1}`
    );

    return { success: true, message: 'Bắt đầu giao lại hàng' };
  }

  // FIX 2: RETURNING → RETURNED (trả về kho)
  async returnToWarehouse(orderId: number, shipperId: number) {
    const order = await this.shipperRepository.getOrderDetail(orderId, shipperId);
    if (!order) throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền của bạn');

    if (order.deliveryStatus !== 'RETURNING') {
      throw new Error('Chỉ có thể xác nhận trả kho với đơn đang hoàn hàng');
    }

    await this.shipperRepository.updateDeliveryStatus(orderId, {
      deliveryStatus: 'RETURNED',
    });
    await this.shipperRepository.appendDeliveryEvent(
      orderId, shipperId, 'RETURNED',
      'Shipper đã trả hàng về kho'
    );

    return { success: true, message: 'Đã xác nhận trả hàng về kho. Admin sẽ xác nhận nhập kho.' };
  }

  async getTodayCOD(shipperId: number) {
    return this.shipperRepository.getTodayCOD(shipperId);
  }

  async getStats(shipperId: number, from: string, to: string) {
    if (!from || !to) {
      throw new Error('Vui lòng cung cấp khoảng thời gian (from, to)');
    }
    return this.shipperRepository.getStats(shipperId, from, to);
  }
}
