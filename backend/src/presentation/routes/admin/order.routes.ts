import { Router } from 'express';
import { AdminOrderController } from '../../controllers/AdminOrderController';
import { adminMiddleware, authMiddleware } from '../../middlewares/auth.middleware';

export const createAdminOrderRoutes = (adminOrderController: AdminOrderController) => {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);
  router.get('/', adminOrderController.getAll);
  router.get('/:id/timeline', adminOrderController.getTimeline);
  router.get('/:id/returns/:returnId', adminOrderController.getReturnById);
  router.get('/:id/returns', adminOrderController.getReturns);
  router.get('/:id', adminOrderController.getById);
  router.patch('/:id/status', adminOrderController.updateStatus);
  router.patch('/:id/payment-status', adminOrderController.updatePaymentStatus);
  router.post('/:id/cancel', adminOrderController.cancel);
  router.post('/:id/returns/:returnId/review', adminOrderController.reviewReturn);
  router.post('/:id/returns/:returnId/receive', adminOrderController.receiveReturn);
  router.post('/:id/returns/:returnId/refund', adminOrderController.refundReturn);
  router.post('/:id/returns/:returnId/close', adminOrderController.closeReturn);

  return router;
};
