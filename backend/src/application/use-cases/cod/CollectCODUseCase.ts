import { IPaymentRepository } from '../../../domain/repositories/IPaymentRepository';

interface CollectCODInput {
  orderId: number;
  shipperId: number;
  confirmedAmount: number;
}

export class CollectCODUseCase {
  constructor(private paymentRepo: IPaymentRepository) {}

  async execute({ orderId, shipperId, confirmedAmount }: CollectCODInput): Promise<void> {
    // 1. Tìm đơn hàng
    const order = await this.paymentRepo.findOrderForCOD(orderId);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    // 2. Validate shipper sở hữu đơn
    if (order.shipperId !== shipperId) {
      throw new Error('Bạn không có quyền thao tác đơn này');
    }

    // 3. Validate chưa thu tiền
    if (order.codCollected) {
      throw new Error('Đơn hàng này đã được thu tiền trước đó');
    }

    // 4. Validate đây là đơn COD
    if (order.paymentMethod !== 'cod' || order.codAmount <= 0) {
      throw new Error('Đơn hàng này không phải đơn COD');
    }

    // 5. Validate số tiền khớp
    if (Number(confirmedAmount) !== Number(order.codAmount)) {
      throw new Error(
        `Số tiền không khớp. Cần thu: ${order.codAmount.toLocaleString('vi-VN')}đ`
      );
    }

    // 6. Sync payment record nếu chưa có
    await this.paymentRepo.syncFromOrder(orderId);

    // 7. Cập nhật orders table
    await this.paymentRepo.markOrderCODCollected(orderId);

    // 8. Cập nhật payments table
    await this.paymentRepo.updateStatus(orderId, 'collected', {
      collectedAt: new Date(),
    });
  }
}
