import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { guestOrderAccessMiddleware } from '../middlewares/guest-order.middleware';

export const createPaymentRoutes = (paymentController: PaymentController) => {
  const router = Router();

  // Tạo URL thanh toán — cần đăng nhập
  router.post('/vnpay/create', authMiddleware, paymentController.createVNPayUrl);
  router.post(
    '/vnpay/guest/create',
    guestOrderAccessMiddleware,
    paymentController.createGuestVNPayUrl,
  );

  // VNPay redirect về đây sau thanh toán → verify + redirect sang frontend
  // ✅ Không cần auth vì VNPay gọi, không có token
  router.get('/vnpay/return', paymentController.vnpayReturn);

  // Frontend gọi để lấy thông tin đơn hàng sau khi được redirect về
  // ✅ Cần auth để bảo vệ thông tin đơn hàng
  router.get('/vnpay/callback', authMiddleware, paymentController.vnpayCallback);

  // IPN — VNPay gọi server to server để xác nhận thanh toán
  // ✅ Không cần auth
  router.get('/vnpay/ipn', paymentController.vnpayIpn);

  //Route thanh toán lại
  router.post('/vnpay/repay', authMiddleware, paymentController.repay);
  router.post(
    '/vnpay/guest/repay',
    guestOrderAccessMiddleware,
    paymentController.repayGuest,
  );

  return router;
};
