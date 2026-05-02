import { IVoucherRepository } from '../../domain/repositories/IVoucherRepository';

export class VoucherUseCase {
  constructor(private voucherRepo: IVoucherRepository) {}

  async getAllVouchers() {
    return this.voucherRepo.findAll();
  }

  async createVoucher(data: any) {
    return this.voucherRepo.create(data);
  }

  async validateVoucher(code: string, orderSubtotal?: number) {
    const voucher: any = await this.voucherRepo.findByCode(code);
    const now = new Date();

    if (!voucher) throw new Error("Mã không tồn tại!");

    // 1. Trạng thái kích hoạt
    if (voucher.is_active === 0 || voucher.is_active === false) {
      throw new Error("Mã giảm giá này đã bị vô hiệu hoá!");
    }

    // 2. Hết hạn / chưa đến hạn
    if (voucher.valid_to && new Date(voucher.valid_to) < now) {
      throw new Error("Mã giảm giá này đã hết hạn sử dụng!");
    }
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      throw new Error("Mã giảm giá này chưa đến thời gian hiệu lực!");
    }

    // 3. Hết lượt dùng
    if (
      voucher.usage_limit != null &&
      Number(voucher.used_count ?? 0) >= Number(voucher.usage_limit)
    ) {
      throw new Error("Mã giảm giá này đã hết lượt sử dụng!");
    }

    // 4. Chưa đạt giá trị đơn tối thiểu (chỉ check khi có truyền subtotal)
    if (
      orderSubtotal != null &&
      voucher.min_order_value != null &&
      orderSubtotal < Number(voucher.min_order_value)
    ) {
      throw new Error(
        `Đơn hàng cần tối thiểu ${Number(voucher.min_order_value).toLocaleString("vi-VN")}đ để áp dụng mã này`,
      );
    }

    return voucher;
  }

  async deleteVoucher(id: number) {
    return this.voucherRepo.delete(id);
  }
}