import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createOrderReviewRoutes = (reviewController: ReviewController) => {
  const router = Router();

  router.use(authMiddleware);
  router.get('/my-orders/:id/reviews', reviewController.getMyOrderReviewSummary);
  router.post('/my-orders/:id/order-feedback', reviewController.createOrderFeedback);
  router.post(
    '/my-orders/:id/items/:orderDetailId/reviews',
    reviewController.createProductReview
  );

  return router;
};
