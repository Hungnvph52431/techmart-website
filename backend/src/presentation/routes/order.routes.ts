import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createOrderRoutes = (orderController: OrderController) => {
  const router = Router();

  // --- 1. ROUTES DÀNH CHO ADMIN (Quản trị & Thống kê) ---
  // Route thống kê phải đặt trên cùng để tránh nhầm lẫn với tham số :id
  router.get(
    '/stats', 
    authMiddleware, 
    adminMiddleware, 
    orderController.getStats
  );

  // Lấy danh sách toàn bộ đơn hàng (Admin)
  router.get(
    '/', 
    authMiddleware, 
    adminMiddleware, 
    orderController.getAll
  );

  // Cập nhật trạng thái đơn hàng & thanh toán
  router.patch(
    '/:id/status', 
    authMiddleware, 
    adminMiddleware, 
    orderController.updateStatus
  );

  // --- 2. ROUTES DÀNH CHO KHÁCH HÀNG (Yêu cầu Đăng nhập) ---
  router.use(authMiddleware);

  // Quản lý đơn hàng cá nhân (My Orders)
  router.get('/my-orders', orderController.getMine);
  router.get('/my-orders/:id', orderController.getMyById);
  router.get('/my-orders/:id/timeline', orderController.getMyTimeline);
  
  // Tạo mới & Hủy đơn
  router.post('/', orderController.create);
  router.post('/my-orders/:id/cancel', orderController.cancelMine);

  // Quản lý Hoàn/Trả hàng (Returns)
  router.post('/my-orders/:id/returns', orderController.createReturn);
  router.get('/my-orders/:id/returns', orderController.getReturns);
  router.get('/my-orders/:id/returns/:returnId', orderController.getReturnById);

  return router;
};