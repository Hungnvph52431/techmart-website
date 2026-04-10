import { IPaymentRepository } from '../../../domain/repositories/IPaymentRepository';

interface SubmitSettlementInput {
  shipperId: number;
  totalAmount: number;
}

export class SubmitCODSettlementUseCase {
  constructor(private paymentRepo: IPaymentRepository) {}

  async execute({ shipperId, totalAmount }: SubmitSettlementInput): Promise<void> {
    // 1. Lấy tất cả COD đang hoạt động (pending + collected) của shipper
    const payments = await this.paymentRepo.findActiveByShipper(shipperId);

    if (payments.length === 0) {
      throw new Error('Không có đơn COD nào để nộp tiền');
    }

    // 2. Kiểm tra còn đơn nào chưa thu tiền không
    const uncollected = payments.filter(p => p.status === 'pending');
    if (uncollected.length > 0) {
      const ids = uncollected.map(p => `#${p.orderId}`).join(', ');
      throw new Error(
        `Còn ${uncollected.length} đơn chưa thu tiền: ${ids}. Vui lòng thu đủ trước khi nộp.`
      );
    }

    // 3. Tính tổng tiền đã thu
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Number(confirmedTotal(totalAmount)) !== Number(confirmedTotal(totalCollected))) {
      throw new Error(
        `Số tiền nộp không khớp với tổng đã thu. Tổng đã thu: ${totalCollected.toLocaleString('vi-VN')}đ`
      );
    }

    // 4. Batch update → pending_settlement
    const orderIds = payments.map(p => p.orderId);
    await this.paymentRepo.batchUpdateStatus(orderIds, 'pending_settlement', {
      submittedAt: new Date(),
    });
  }
}

// Làm tròn để tránh lỗi floating point
function confirmedTotal(n: number): number {
  return Math.round(n * 100) / 100;
}
