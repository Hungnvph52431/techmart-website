import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createAuthRoutes = (authController: AuthController) => {
  const router = Router();

  router.post('/login', authController.login);
  router.post('/register', authController.register);
  router.get('/profile', authMiddleware, authController.getProfile);

  router.post('/forgot-password', authController.forgotPassword);
  router.post('/verify-otp', authController.verifyOtp);
  router.post('/reset-password', authController.resetPassword);

  return router;
};
