import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createWalletRoutes = (walletController: WalletController) => {
  const router = Router();

  // Customer routes
  router.get('/balance', authMiddleware, walletController.getBalance);
  router.get('/transactions', authMiddleware, walletController.getTransactions);
  router.post('/topup/vnpay', authMiddleware, walletController.createVNPayTopup);

  // Admin routes
  router.get('/admin/topups', authMiddleware, adminMiddleware, walletController.adminListTopups);

  return router;
};
