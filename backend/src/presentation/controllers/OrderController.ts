import { Request, Response } from 'express';
import { OrderUseCase } from '../../application/use-cases/OrderUseCase';

export class OrderController {
  constructor(private orderUseCase: OrderUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const orders = await this.orderUseCase.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const order = await this.orderUseCase.getOrderById(Number(req.params.id));
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getByUser = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const orders = await this.orderUseCase.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const order = await this.orderUseCase.createOrder({
        ...req.body,
        userId,
      });
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await this.orderUseCase.updateOrderStatus(Number(req.params.id), status);

      if (!success) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json({ message: 'Order status updated' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updatePaymentStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await this.orderUseCase.updatePaymentStatus(Number(req.params.id), status);

      if (!success) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json({ message: 'Payment status updated' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.orderUseCase.getOrderStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
