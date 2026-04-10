import { IPaymentRepository } from '../../../domain/repositories/IPaymentRepository';

interface AdminConfirmInput {
  shipperId: number;
  adminId: number;
}

export class AdminConfirmSettlementUseCase {
  constructor(private paymentRepo: IPaymentRepository) {}

  async execute({ shipperId }: AdminConfirmInput): Promise<{ settledOrders: number; totalAmount: number }> {
    // 1. Tìm danh sách pending_settlement của shipper
    const pending = await this.paymentRepo.findPendingSettlementForAdmin(undefined, shipperId);

    if (pending.length === 0) {
      throw new Error('Không tìm thấy lô tiền cần đối soát cho shipper này');
    }

    const { totalOrders, totalAmount } = pending[0];

    // 2. Settle tất cả
    await this.paymentRepo.settleAllPendingByShipper(shipperId);

    return { settledOrders: totalOrders, totalAmount };
  }
}
