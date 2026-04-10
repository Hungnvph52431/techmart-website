import { Router } from 'express';
import { CODController } from '../controllers/CODController';
import { authMiddleware, shipperMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createCODRoutes = (codController: CODController) => {
  const router = Router();

  // --- Shipper routes ---
  router.get('/shipper/cod/today',             authMiddleware, shipperMiddleware, codController.getTodayCOD);
  router.post('/shipper/cod/collect',           authMiddleware, shipperMiddleware, codController.collectCOD);
  router.post('/shipper/cod/submit-settlement', authMiddleware, shipperMiddleware, codController.submitSettlement);

  // --- Admin routes ---
  router.get('/admin/cod/pending',             authMiddleware, adminMiddleware, codController.adminGetPending);
  router.post('/admin/cod/confirm-settlement', authMiddleware, adminMiddleware, codController.adminConfirmSettlement);

  return router;
};
