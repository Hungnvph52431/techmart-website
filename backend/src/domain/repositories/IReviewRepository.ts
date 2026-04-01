import {
  CreateOrderFeedbackDTO,
  CreateProductReviewDTO,
  OrderFeedback,
  ProductReview,
  UpdateProductReviewDTO,
} from '../entities/Review';

export interface IReviewRepository {
  findOrderFeedbackByOrderId(orderId: number): Promise<OrderFeedback | null>;
  findProductReviewsByOrderDetailIds(orderDetailIds: number[]): Promise<ProductReview[]>;
  findProductReviewByIdForUser(reviewId: number, userId: number): Promise<ProductReview | null>;
  findReturnLinkedOrderDetailIds(
    orderId: number,
    userId: number
  ): Promise<Map<number, number>>;
  createOrderFeedback(input: CreateOrderFeedbackDTO): Promise<OrderFeedback>;
  createProductReview(input: CreateProductReviewDTO): Promise<ProductReview>;
  updateProductReview(input: UpdateProductReviewDTO): Promise<ProductReview>;
}
