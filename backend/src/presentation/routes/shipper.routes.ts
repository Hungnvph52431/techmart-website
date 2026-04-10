import { Router } from 'express';
import { ShipperController } from '../controllers/ShipperController';
import { authMiddleware, shipperMiddleware } from '../middlewares/auth.middleware';

export const createShipperRoutes = (shipperController: ShipperController) => {
  const router = Router();

  // All shipper routes require valid JWT + shipper role
  router.use(authMiddleware, shipperMiddleware);

  // Danh sách & chi tiết đơn được giao
  router.get('/orders', shipperController.getOrders);
  router.get('/orders/:id', shipperController.getOrderDetail);

  // Luồng giao hàng
  router.patch('/orders/:id/pickup', shipperController.pickup);
  router.patch('/orders/:id/start-delivery', shipperController.startDelivery);
  router.patch('/orders/:id/complete', shipperController.complete);
  router.patch('/orders/:id/fail', shipperController.fail);
  router.patch('/orders/:id/retry-delivery', shipperController.retryDelivery);
  router.patch('/orders/:id/return-to-warehouse', shipperController.returnToWarehouse);

  // Thống kê (COD routes nằm ở cod.routes.ts)
  router.get('/stats', shipperController.getStats);

  return router;
};
