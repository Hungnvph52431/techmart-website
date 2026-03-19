// backend/src/presentation/routes/review.routes.ts
// THAY THẾ HOÀN TOÀN file order-review.routes.ts

import { Router } from 'express';
import { ReviewController } from '../controllers/Reviewcontroller ';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createReviewRoutes = (reviewController: ReviewController) => {
  const router = Router();

  // ── PUBLIC: Lấy reviews theo sản phẩm ────────────────────────────────────
  // Frontend gọi: GET /api/reviews/product/:productId
  router.get('/product/:productId', reviewController.getByProduct);

  // ── PUBLIC: Đánh dấu hữu ích ─────────────────────────────────────────────
  router.post('/:reviewId/helpful', reviewController.markHelpful);

  // ── AUTH: Kiểm tra quyền review ──────────────────────────────────────────
  // Frontend gọi: GET /api/reviews/can-review/:productId
  router.get('/can-review/:productId', authMiddleware, reviewController.checkCanReview);

  // ── AUTH: Tạo review mới ─────────────────────────────────────────────────
  router.post('/', authMiddleware, reviewController.create);

  return router;
};

export const createAdminReviewRoutes = (reviewController: ReviewController) => {
  const router = Router();
  router.use(authMiddleware, adminMiddleware);
  router.get('/', reviewController.adminGetAll);
  router.patch('/:reviewId/status', reviewController.updateStatus);
  return router;
};

// ============================================================
