import { Request, Response } from 'express';
import { OrderUseCase } from '../../application/use-cases/OrderUseCase';
import { toOrderDetail, toOrderListItem, toOrderTimeline } from '../../application/mappers/OrderPresenter';

export class AdminOrderController {
  constructor(private orderUseCase: OrderUseCase) {}

  getAll = async (req: any, res: Response) => {
    try {
      const orders = await this.orderUseCase.getAdminOrders({
        search: req.query.search as string | undefined,
        status: (req.query.status as any) || 'all',
        paymentStatus: (req.query.paymentStatus as any) || 'all',
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        shipperId: req.user?.role === 'shipper' ? req.user.userId : undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({
        ...orders,
        items: orders.items.map((order) => toOrderListItem(order, 'admin')),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: any, res: Response) => {
    try {
      const aggregate = await this.orderUseCase.getAdminOrderDetail(Number(req.params.id));
      if (!aggregate) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Shipper chỉ xem được đơn của mình
      if (req.user?.role === 'shipper' && aggregate.order.shipperId !== req.user.userId) {
        return res.status(403).json({ message: 'Bạn không có quyền xem đơn này' });
      }

      res.json(toOrderDetail(aggregate, 'admin'));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getTimeline = async (req: Request, res: Response) => {
    try {
      const timeline = await this.orderUseCase.getAdminOrderTimeline(Number(req.params.id));
      if (!timeline) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(toOrderTimeline(timeline, 'admin'));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  updateStatus = async (req: any, res: Response) => {
    try {
      if (req.body.status === 'cancelled') {
        return res.status(400).json({ message: 'Vui lòng dùng chức năng hủy đơn và nhập lý do hủy' });
      }

      const order = await this.orderUseCase.transitionOrderStatus(
        Number(req.params.id),
        req.body.status,
        req.user.userId,
        req.user.role,
        req.body.note,
        req.body.shipperId !== undefined ? (req.body.shipperId === null ? null : Number(req.body.shipperId)) : undefined
      );

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  assignShipper = async (req: any, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const shipperId = req.body.shipperId !== undefined
        ? (req.body.shipperId === null ? null : Number(req.body.shipperId))
        : undefined;

      if (shipperId === undefined) {
        return res.status(400).json({ message: 'Thiếu shipperId (truyền null để bỏ gán)' });
      }

      const order = await this.orderUseCase.assignShipper(orderId, shipperId);
      if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  };

  reassignShipper = async (req: any, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const { newShipperId } = req.body;
      if (!newShipperId) return res.status(400).json({ message: 'Thiếu newShipperId' });

      const order = await this.orderUseCase.reassignShipper(orderId, Number(newShipperId));
      if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  };

  confirmWarehouseReceipt = async (req: any, res: Response) => {
    try {
      const result = await this.orderUseCase.confirmWarehouseReceipt(Number(req.params.id), req.user.userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  };

  confirmAndAssignShipper = async (req: any, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const shipperId = Number(req.body.shipperId);
      if (!shipperId) return res.status(400).json({ message: 'Vui lòng chọn shipper' });

      const order = await this.orderUseCase.confirmAndAssignShipper(orderId, shipperId, req.user.userId);
      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  };

  updatePaymentStatus = async (req: any, res: Response) => {
    try {
      const order = await this.orderUseCase.updateOrderPaymentStatus(
        Number(req.params.id),
        req.body.paymentStatus,
        req.user.userId,
        req.user.role,
        req.body.note
      );

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  cancel = async (req: any, res: Response) => {
    try {
      const order = await this.orderUseCase.cancelOrder(
        Number(req.params.id),
        req.user.userId,
        req.user.role,
        req.body.reason || '',
        req.body.adminNote
      );

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getReturns = async (req: Request, res: Response) => {
    try {
      const returns = await this.orderUseCase.getOrderReturns(Number(req.params.id));
      if (!returns) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(returns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getReturnById = async (req: Request, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.getOrderReturn(
        Number(req.params.id),
        Number(req.params.returnId)
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  reviewReturn = async (req: any, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.reviewReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.decision,
        req.body.adminNote
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  receiveReturn = async (req: any, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.receiveReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.adminNote
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  refundReturn = async (req: any, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.refundReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.adminNote
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  closeReturn = async (req: any, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.closeReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId,
        req.user.role,
        req.body.adminNote
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
