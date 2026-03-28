

import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { uploadReturnEvidence } from '../middlewares/upload.middleware';

export const createOrderRoutes = (orderController: OrderController) => {
  const router = Router();

  // ============================================================
  // CUSTOMER ROUTES — Yêu cầu đăng nhập (authMiddleware)
  // ============================================================
  router.use(authMiddleware);

  // Tạo đơn hàng mới
  router.post('/', orderController.create);

  // Danh sách đơn hàng của tôi
  router.get('/my-orders', orderController.getMine);

  // Chi tiết đơn hàng của tôi
  router.get('/my-orders/:id', orderController.getMyById);

  // Timeline đơn hàng của tôi
  router.get('/my-orders/:id/timeline', orderController.getMyTimeline);

  // Hủy đơn hàng
  router.post('/my-orders/:id/cancel', orderController.cancelMine);

  // Xác nhận đã nhận hàng
  router.post('/my-orders/:id/confirm-delivered', orderController.confirmDeliveredMine);

  // Yêu cầu hoàn/trả hàng (tối đa 5 ảnh bằng chứng)
  router.post(
    '/my-orders/:id/returns',
    uploadReturnEvidence.array('evidenceImages', 5),
    orderController.createReturn
  );
  router.get('/my-orders/:id/returns', orderController.getReturns);
  router.get('/my-orders/:id/returns/:returnId', orderController.getReturnById);

  return router;
};