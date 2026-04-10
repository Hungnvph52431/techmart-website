// backend/src/presentation/routes/review.routes.ts
// THAY THẾ HOÀN TOÀN file order-review.routes.ts

import { Router } from 'express';
import { ReviewController } from '../controllers/Reviewcontroller ';
import { authMiddleware, adminMiddleware, staffMiddleware } from '../middlewares/auth.middleware';
import { guestOrderAccessMiddleware } from '../middlewares/guest-order.middleware';

export const createReviewRoutes = (reviewController: ReviewController) => {
  const router = Router();

  // ── PUBLIC: Lấy reviews theo sản phẩm ────────────────────────────────────
  // Frontend gọi: GET /api/reviews/product/:productId
  router.get('/product/:productId', reviewController.getByProduct);
  router.get(
    '/guest/orders/:orderCode/summary',
    guestOrderAccessMiddleware,
    reviewController.getGuestOrderSummary,
  );
  router.post('/guest', guestOrderAccessMiddleware, reviewController.createGuest);
  router.patch(
    '/guest/:reviewId',
    guestOrderAccessMiddleware,
    reviewController.updateGuest,
  );

  // ── PUBLIC: Đánh dấu hữu ích ─────────────────────────────────────────────
  router.post('/:reviewId/helpful', reviewController.markHelpful);

  // ── AUTH: Kiểm tra quyền review ──────────────────────────────────────────
  // Frontend gọi: GET /api/reviews/can-review/:productId
  router.get('/can-review/:productId', authMiddleware, reviewController.checkCanReview);
  router.get('/orders/:orderId/summary', authMiddleware, reviewController.getMyOrderSummary);

  // ── AUTH: Tạo review mới ─────────────────────────────────────────────────
  router.post('/', authMiddleware, reviewController.create);
  router.patch('/:reviewId', authMiddleware, reviewController.updateMine);

  return router;
};

export const createAdminReviewRoutes = (reviewController: ReviewController) => {
  const router = Router();
  // Admin + Staff: quản lý đánh giá
  router.use(authMiddleware, staffMiddleware);
  router.get('/', reviewController.adminGetAll);
  router.patch('/:reviewId/status', reviewController.updateStatus);
  return router;
};

// ============================================================
