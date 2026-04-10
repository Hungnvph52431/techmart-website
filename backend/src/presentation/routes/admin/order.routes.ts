import { Router } from 'express';
import { AdminOrderController } from '../../controllers/AdminOrderController';
import { adminMiddleware, authMiddleware, staffMiddleware, internalMiddleware } from '../../middlewares/auth.middleware';

export const createAdminOrderRoutes = (adminOrderController: AdminOrderController) => {
  const router = Router();

  router.use(authMiddleware);

  // Tất cả role nội bộ: xem đơn hàng
  router.get('/', internalMiddleware, adminOrderController.getAll);
  router.get('/:id/timeline', internalMiddleware, adminOrderController.getTimeline);
  router.get('/:id/returns/:returnId', internalMiddleware, adminOrderController.getReturnById);
  router.get('/:id/returns', internalMiddleware, adminOrderController.getReturns);
  router.get('/:id', internalMiddleware, adminOrderController.getById);

  // Tất cả role nội bộ: cập nhật trạng thái đơn (warehouse cập nhật trạng thái giao hàng)
  router.patch('/:id/status', internalMiddleware, adminOrderController.updateStatus);

  // Staff + Admin: huỷ đơn, quản lý hoàn trả
  router.post('/:id/cancel', staffMiddleware, adminOrderController.cancel);
  router.post('/:id/returns/:returnId/review', staffMiddleware, adminOrderController.reviewReturn);
  router.post('/:id/returns/:returnId/receive', staffMiddleware, adminOrderController.receiveReturn);
  router.post('/:id/returns/:returnId/refund', staffMiddleware, adminOrderController.refundReturn);
  router.post('/:id/returns/:returnId/close', staffMiddleware, adminOrderController.closeReturn);

  // Admin only: cập nhật trạng thái thanh toán
  router.patch('/:id/payment-status', adminMiddleware, adminOrderController.updatePaymentStatus);

  return router;
};
