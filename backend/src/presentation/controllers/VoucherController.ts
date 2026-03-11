import { Request, Response } from 'express';
import { VoucherUseCase } from '../../application/use-cases/VoucherUseCase';

export class VoucherController {
  constructor(private voucherUseCase: VoucherUseCase) {}

  async getAll(req: Request, res: Response) {
    try {
      const vouchers = await this.voucherUseCase.getAllVouchers();
      res.json(vouchers);
    } catch (error) {
      res.status(500).json({ message: "Lỗi lấy danh sách Voucher" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newVoucher = await this.voucherUseCase.createVoucher(req.body);
      res.status(201).json(newVoucher);
    } catch (error) {
      res.status(500).json({ message: "Lỗi tạo Voucher" });
    }
  }
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await this.voucherUseCase.deleteVoucher(id);
      res.json({ message: "Xóa Voucher thành công" });
    } catch (error: any) {
      console.error("Lỗi xóa Voucher:", error);
      res.status(500).json({ message: "Lỗi khi xóa Voucher" });
    }
  }
}