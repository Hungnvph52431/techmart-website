import { Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { AdminOrderController } from '../../controllers/AdminOrderController';
import { adminMiddleware, authMiddleware, staffMiddleware, internalMiddleware } from '../../middlewares/auth.middleware';
import pool from '../../../infrastructure/database/connection';
import { uploadReceiptImage } from '../../middlewares/upload.middleware';

export const createAdminOrderRoutes = (adminOrderController: AdminOrderController) => {
  const router = Router();

  router.use(authMiddleware);

  // Danh sách shipper available (sắp xếp theo số đơn đang giao tăng dần)
  router.get('/shippers/available', staffMiddleware, async (_req, res) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          u.user_id AS id,
          u.name    AS fullName,
          u.phone,
          COALESCE((
            SELECT COUNT(*)
            FROM orders o
            WHERE o.shipper_id = u.user_id
              AND o.delivery_status IN ('WAITING_PICKUP','PICKED_UP','IN_DELIVERY')
          ), 0) AS activeOrders
        FROM users u
        WHERE u.role = 'shipper'
          AND u.status = 'active'
        ORDER BY activeOrders ASC, u.name ASC
      `);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Tất cả role nội bộ: xem đơn hàng
  router.get('/', internalMiddleware, adminOrderController.getAll);
  router.get('/:id/timeline', internalMiddleware, adminOrderController.getTimeline);
  router.get('/:id/returns/:returnId', internalMiddleware, adminOrderController.getReturnById);
  router.get('/:id/returns', internalMiddleware, adminOrderController.getReturns);
  router.get('/:id', internalMiddleware, adminOrderController.getById);

  // Tất cả role nội bộ: cập nhật trạng thái đơn
  router.patch('/:id/status', internalMiddleware, adminOrderController.updateStatus);

  // Xác nhận + gán shipper cùng lúc (1 bước)
  router.patch('/:id/confirm', staffMiddleware, adminOrderController.confirmAndAssignShipper);

  // Admin xác nhận nhập kho sau khi shipper trả hàng về
  router.patch('/:id/confirm-warehouse-receipt', staffMiddleware, adminOrderController.confirmWarehouseReceipt);

  // Staff + Admin: gán shipper / đổi shipper
  router.patch('/:id/assign-shipper', staffMiddleware, adminOrderController.assignShipper);
  router.patch('/:id/reassign-shipper', staffMiddleware, adminOrderController.reassignShipper);

  // Staff + Admin: huỷ đơn, quản lý hoàn trả
  router.post('/:id/cancel', staffMiddleware, adminOrderController.cancel);
  router.post('/:id/returns/:returnId/review', staffMiddleware, adminOrderController.reviewReturn);
  router.post('/:id/returns/:returnId/receive', staffMiddleware, adminOrderController.receiveReturn);
  router.post(
    '/:id/returns/:returnId/refund',
    staffMiddleware,
    uploadReceiptImage.single('refundReceiptImage'),
    adminOrderController.refundReturn,
  );
  router.post('/:id/returns/:returnId/close', staffMiddleware, adminOrderController.closeReturn);

  // Admin only: cập nhật trạng thái thanh toán
  router.patch('/:id/payment-status', adminMiddleware, adminOrderController.updatePaymentStatus);

  return router;
};
