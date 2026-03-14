import {
  CreateOrderFeedbackDTO,
  CreateProductReviewDTO,
  OrderFeedback,
  ProductReview,
} from '../entities/Review';

export interface IReviewRepository {
  findOrderFeedbackByOrderId(orderId: number): Promise<OrderFeedback | null>;
  findProductReviewsByOrderDetailIds(orderDetailIds: number[]): Promise<ProductReview[]>;
  createOrderFeedback(input: CreateOrderFeedbackDTO): Promise<OrderFeedback>;
  createProductReview(input: CreateProductReviewDTO): Promise<ProductReview>;
}
