import { Request, Response } from 'express';
import { OrderUseCase } from '../../application/use-cases/OrderUseCase';
import { toOrderDetail, toOrderListItem } from '../../application/mappers/OrderPresenter';

export class AdminOrderController {
  constructor(private orderUseCase: OrderUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const orders = await this.orderUseCase.getAdminOrders({
        search: req.query.search as string | undefined,
        status: (req.query.status as any) || 'all',
        paymentStatus: (req.query.paymentStatus as any) || 'all',
        userId: req.query.userId ? Number(req.query.userId) : undefined,
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

  getById = async (req: Request, res: Response) => {
    try {
      const aggregate = await this.orderUseCase.getAdminOrderDetail(Number(req.params.id));
      if (!aggregate) {
        return res.status(404).json({ message: 'Order not found' });
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

      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  updateStatus = async (req: any, res: Response) => {
    try {
      const order = await this.orderUseCase.transitionOrderStatus(
        Number(req.params.id),
        req.body.status,
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
