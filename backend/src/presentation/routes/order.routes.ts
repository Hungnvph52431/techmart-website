import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createOrderRoutes = (orderController: OrderController) => {
  const router = Router();

  router.get('/', authMiddleware, adminMiddleware, orderController.getAll);
  router.get('/my-orders', authMiddleware, orderController.getByUser);
  router.get('/:id', authMiddleware, orderController.getById);
  router.post('/', authMiddleware, orderController.create);
  router.patch('/:id/status', authMiddleware, adminMiddleware, orderController.updateStatus);
  router.patch('/:id/payment-status', authMiddleware, adminMiddleware, orderController.updatePaymentStatus);
  router.get('/:id/details', authMiddleware, adminMiddleware, orderController.getOrderDetails);  
  return router;
};
