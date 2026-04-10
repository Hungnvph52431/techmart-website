import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createWalletRoutes = (walletController: WalletController) => {
  const router = Router();

  // Customer routes
  router.get('/balance', authMiddleware, walletController.getBalance);
  router.get('/transactions', authMiddleware, walletController.getTransactions);
  router.get('/banks', authMiddleware, walletController.getSupportedBanks);
  router.get('/withdrawal-profile', authMiddleware, walletController.getWithdrawalProfile);
  router.post('/withdrawal-profile/setup', authMiddleware, walletController.setupWithdrawalProfile);
  router.get('/withdrawals', authMiddleware, walletController.getWithdrawals);
  router.post('/withdrawals', authMiddleware, walletController.createWithdrawal);
  router.post('/topup/vnpay', authMiddleware, walletController.createVNPayTopup);

  // Admin routes
  router.get('/admin/topups', authMiddleware, adminMiddleware, walletController.adminListTopups);
  router.get('/admin/withdrawal-notifications', authMiddleware, adminMiddleware, walletController.adminListWithdrawalNotifications);
  router.patch('/admin/withdrawal-notifications/:id/read', authMiddleware, adminMiddleware, walletController.adminMarkWithdrawalNotificationRead);
  router.get('/admin/withdrawals', authMiddleware, adminMiddleware, walletController.adminListWithdrawals);
  router.patch('/admin/withdrawals/:id/status', authMiddleware, adminMiddleware, walletController.adminUpdateWithdrawalStatus);

  return router;
};
