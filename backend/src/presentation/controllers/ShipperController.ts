import { Response } from 'express';
import { ShipperUseCase } from '../../application/use-cases/ShipperUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ShipperController {
  constructor(private shipperUseCase: ShipperUseCase) {}

  getOrders = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const { status, date, page, limit } = req.query;

      const result = await this.shipperUseCase.getAssignedOrders(shipperId, {
        status: status as string | undefined,
        date: date as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getOrderDetail = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);

      const order = await this.shipperUseCase.getOrderDetail(orderId, shipperId);
      res.json({ success: true, data: order });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  pickup = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);

      await this.shipperUseCase.pickupOrder(orderId, shipperId);
      res.json({ success: true, data: { message: 'Xác nhận lấy hàng thành công' } });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  startDelivery = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);

      await this.shipperUseCase.startDelivery(orderId, shipperId);
      res.json({ success: true, data: { message: 'Bắt đầu giao hàng' } });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  complete = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);
      const { photoUrl, codCollected, confirmedAmount } = req.body;

      const result = await this.shipperUseCase.completeDelivery(orderId, shipperId, {
        photoUrl,
        codCollected: Boolean(codCollected),
        confirmedAmount: confirmedAmount !== undefined ? Number(confirmedAmount) : undefined,
      });

      res.json({
        success: true,
        data: { message: 'Giao hàng thành công', ...(result.warning ? { warning: result.warning } : {}) },
      });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  fail = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);
      const { failReason, note } = req.body;

      const result = await this.shipperUseCase.failDelivery(orderId, shipperId, {
        failReason,
        note,
      });

      const autoReturning = result.nextStatus === 'RETURNING';
      res.json({
        success: true,
        data: {
          message: autoReturning
            ? `Đã giao thất bại ${result.attemptCount} lần. Đơn hàng tự động chuyển sang HOÀN HÀNG.`
            : 'Cập nhật giao thất bại thành công',
          nextStatus: result.nextStatus,
          attemptCount: result.attemptCount,
        },
      });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  retryDelivery = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);
      const result = await this.shipperUseCase.retryDelivery(orderId, shipperId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  returnToWarehouse = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const orderId = Number(req.params.id);
      const result = await this.shipperUseCase.returnToWarehouse(orderId, shipperId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message.includes('không tồn tại') ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  getTodayCOD = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const result = await this.shipperUseCase.getTodayCOD(shipperId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getStats = async (req: AuthRequest, res: Response) => {
    try {
      const shipperId = req.user!.userId;
      const { from, to } = req.query;

      const result = await this.shipperUseCase.getStats(
        shipperId,
        from as string,
        to as string
      );
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
