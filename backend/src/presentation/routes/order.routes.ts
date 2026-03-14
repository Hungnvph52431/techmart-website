import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { adminMiddleware, authMiddleware } from '../middlewares/auth.middleware';

export const createOrderRoutes = (orderController: OrderController) => {
  const router = Router();

  router.get('/stats', authMiddleware, adminMiddleware, orderController.getStats);

  router.use(authMiddleware);
  router.get('/my-orders', orderController.getMine);
  router.get('/my-orders/:id', orderController.getMyById);
  router.get('/my-orders/:id/timeline', orderController.getMyTimeline);
  router.post('/', orderController.create);
  router.post('/my-orders/:id/cancel', orderController.cancelMine);
  router.post('/my-orders/:id/returns', orderController.createReturn);
  router.get('/my-orders/:id/returns', orderController.getReturns);
  router.get('/my-orders/:id/returns/:returnId', orderController.getReturnById);

  return router;
};