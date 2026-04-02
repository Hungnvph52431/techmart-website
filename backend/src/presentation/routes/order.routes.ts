import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware, adminMiddleware, staffMiddleware } from '../middlewares/auth.middleware';
import { uploadReturnEvidence } from '../middlewares/upload.middleware';

export const createOrderRoutes = (orderController: OrderController) => {
  const router = Router();

  // --- 1. ROUTES DÀNH CHO ADMIN (Quản trị & Thống kê) ---
  // Route thống kê phải đặt trên cùng để tránh nhầm lẫn với tham số :id
  // Staff + Warehouse + Admin: xem thống kê
  router.get('/stats', authMiddleware, orderController.getStats);

  // Staff + Admin: xem tất cả đơn hàng
  router.get('/', authMiddleware, staffMiddleware, orderController.getAll);

  // Staff + Admin: cập nhật trạng thái đơn hàng
  router.patch('/:id/status', authMiddleware, staffMiddleware, orderController.updateStatus);

  // Quản lý Hoàn/Trả hàng (Admin + Staff)
  router.get('/admin/returns', authMiddleware, staffMiddleware, orderController.adminListAllReturns);
  router.patch('/:id/returns/:returnId/review', authMiddleware, staffMiddleware, orderController.adminReviewReturn);
  router.patch('/:id/returns/:returnId/receive', authMiddleware, staffMiddleware, orderController.adminReceiveReturn);
  router.patch('/:id/returns/:returnId/refund', authMiddleware, staffMiddleware, orderController.adminRefundReturn);

  // --- 2. ROUTES DÀNH CHO KHÁCH HÀNG (Yêu cầu Đăng nhập) ---
  router.use(authMiddleware);

  // Quản lý đơn hàng cá nhân (My Orders)
  router.get('/my-orders', orderController.getMine);
  router.get('/my-orders/:id', orderController.getMyById);
  router.get('/my-orders/:id/timeline', orderController.getMyTimeline);
  
  // Tạo mới & Hủy đơn
  router.post('/', orderController.create);
  router.post('/my-orders/:id/cancel', orderController.cancelMine);
  router.post('/my-orders/:id/confirm-delivered', orderController.confirmDeliveredMine);

  // Quản lý Hoàn/Trả hàng (Returns) — tối đa 5 ảnh bằng chứng
  router.post('/my-orders/:id/returns', uploadReturnEvidence.array('evidenceImages', 5), orderController.createReturn);
  router.get('/my-orders/:id/returns', orderController.getReturns);
  router.get('/my-orders/:id/returns/:returnId', orderController.getReturnById);

  return router;
};