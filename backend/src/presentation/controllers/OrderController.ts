import { Response } from 'express';
import { OrderUseCase } from '../../application/use-cases/OrderUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';
import { toOrderDetail, toOrderListItem } from '../../application/mappers/OrderPresenter';

export class OrderController {
  constructor(private orderUseCase: OrderUseCase) {}

  getMine = async (req: AuthRequest, res: Response) => {
    try {
      const orders = await this.orderUseCase.getMyOrders(
        req.user.userId,
        req.query.status as any
      );
      res.json(orders.map((order) => toOrderListItem(order, 'customer')));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getMyById = async (req: AuthRequest, res: Response) => {
    try {
      const aggregate = await this.orderUseCase.getMyOrderDetail(
        Number(req.params.id),
        req.user.userId
      );

      if (!aggregate) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(toOrderDetail(aggregate, 'customer'));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getMyTimeline = async (req: AuthRequest, res: Response) => {
    try {
      const timeline = await this.orderUseCase.getMyOrderTimeline(
        Number(req.params.id),
        req.user.userId
      );

      if (!timeline) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const order = await this.orderUseCase.createOrder({
        ...req.body,
        userId: req.user.userId,
      });
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  cancelMine = async (req: AuthRequest, res: Response) => {
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

  createReturn = async (req: AuthRequest, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.requestReturn(
        Number(req.params.id),
        req.user.userId,
        req.body
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(201).json(orderReturn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getReturns = async (req: AuthRequest, res: Response) => {
    try {
      const returns = await this.orderUseCase.getOrderReturns(
        Number(req.params.id),
        req.user.userId
      );

      if (!returns) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(returns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getReturnById = async (req: AuthRequest, res: Response) => {
    try {
      const orderReturn = await this.orderUseCase.getOrderReturn(
        Number(req.params.id),
        Number(req.params.returnId),
        req.user.userId
      );

      if (!orderReturn) {
        return res.status(404).json({ message: 'Return request not found' });
      }

      res.json(orderReturn);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
