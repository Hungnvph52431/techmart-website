import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GetCODTodayUseCase } from '../../application/use-cases/cod/GetCODTodayUseCase';
import { CollectCODUseCase } from '../../application/use-cases/cod/CollectCODUseCase';
import { SubmitCODSettlementUseCase } from '../../application/use-cases/cod/SubmitCODSettlementUseCase';
import { AdminConfirmSettlementUseCase } from '../../application/use-cases/cod/AdminConfirmSettlementUseCase';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';

export class CODController {
  private paymentRepo: IPaymentRepository;
  private getTodayUC: GetCODTodayUseCase;
  private collectUC: CollectCODUseCase;
  private submitUC: SubmitCODSettlementUseCase;
  private adminConfirmUC: AdminConfirmSettlementUseCase;

  constructor(paymentRepo: IPaymentRepository) {
    this.paymentRepo    = paymentRepo;
    this.getTodayUC     = new GetCODTodayUseCase(paymentRepo);
    this.collectUC      = new CollectCODUseCase(paymentRepo);
    this.submitUC       = new SubmitCODSettlementUseCase(paymentRepo);
    this.adminConfirmUC = new AdminConfirmSettlementUseCase(paymentRepo);
  }

  getTodayCOD = async (req: AuthRequest, res: Response) => {
    try {
      const data = await this.getTodayUC.execute(req.user!.userId);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  collectCOD = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const { orderId, confirmedAmount } = req.body;

      if (!orderId || confirmedAmount === undefined) {
        return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc confirmedAmount' });
      }

      await this.collectUC.execute({
        orderId: Number(orderId),
        shipperId,
        confirmedAmount: Number(confirmedAmount),
      });

      res.json({
        success: true,
        message: `Đã xác nhận thu ${Number(confirmedAmount).toLocaleString('vi-VN')}đ`,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  submitSettlement = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const { totalAmount } = req.body;

      if (totalAmount === undefined) {
        return res.status(400).json({ success: false, message: 'Thiếu totalAmount' });
      }

      await this.submitUC.execute({ shipperId, totalAmount: Number(totalAmount) });
      res.json({ success: true, message: 'Đã gửi yêu cầu nộp tiền, chờ admin xác nhận' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  adminGetPending = async (req: AuthRequest, res: Response) => {
    try {
      const { date, shipperId } = req.query;
      const data = await this.paymentRepo.findPendingSettlementForAdmin(
        date as string | undefined,
        shipperId ? Number(shipperId) : undefined
      );
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  adminConfirmSettlement = async (req: AuthRequest, res: Response) => {
    try {
      const adminId = req.user!.userId;
      const { shipperId } = req.body;

      if (!shipperId) {
        return res.status(400).json({ success: false, message: 'Thiếu shipperId' });
      }

      const result = await this.adminConfirmUC.execute({
        shipperId: Number(shipperId),
        adminId,
      });

      res.json({
        success: true,
        message: `Đã đối soát ${result.settledOrders} đơn, tổng ${result.totalAmount.toLocaleString('vi-VN')}đ`,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
}
