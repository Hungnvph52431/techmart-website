import { Response } from 'express';
import { ReviewUseCase } from '../../application/use-cases/ReviewUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ReviewController {
  constructor(private reviewUseCase: ReviewUseCase) {}

  getMyOrderReviewSummary = async (req: AuthRequest, res: Response) => {
    try {
      const summary = await this.reviewUseCase.getMyOrderReviewSummary(
        Number(req.params.id),
        req.user.userId
      );

      if (!summary) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  createOrderFeedback = async (req: AuthRequest, res: Response) => {
    try {
      const feedback = await this.reviewUseCase.submitOrderFeedback(
        Number(req.params.id),
        req.user.userId,
        req.body
      );

      if (!feedback) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  createProductReview = async (req: AuthRequest, res: Response) => {
    try {
      const review = await this.reviewUseCase.submitProductReview(
        Number(req.params.id),
        Number(req.params.orderDetailId),
        req.user.userId,
        req.body
      );

      if (!review) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
