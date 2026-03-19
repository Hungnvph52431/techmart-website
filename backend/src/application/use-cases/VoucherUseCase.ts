import { IVoucherRepository } from '../../domain/repositories/IVoucherRepository';

export class VoucherUseCase {
  constructor(private voucherRepo: IVoucherRepository) {}

  async getAllVouchers() {
    return this.voucherRepo.findAll();
  }

  async createVoucher(data: any) {
    return this.voucherRepo.create(data);
  }

  async validateVoucher(code: string) {
    const voucher = await this.voucherRepo.findByCode(code);
    const now = new Date();

    if (!voucher) throw new Error("Mã không tồn tại!");
    
    // TỰ ĐỘNG CHẶN NẾU QUÁ HẠN
    if (voucher.valid_to && new Date(voucher.valid_to) < now) {
      throw new Error("Mã giảm giá này đã hết hạn sử dụng!");
    }

    // TỰ ĐỘNG CHẶN NẾU CHƯA ĐẾN NGÀY DÙNG
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      throw new Error("Mã giảm giá này chưa đến thời gian hiệu lực!");
    }

    return voucher;
  }

  async deleteVoucher(id: number) {
    return this.voucherRepo.delete(id);
  }
}