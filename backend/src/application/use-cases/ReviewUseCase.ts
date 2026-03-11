import { OrderStatus } from '../../domain/entities/Order';
import {
  CreateOrderFeedbackDTO,
  CreateProductReviewDTO,
  OrderReviewSummary,
} from '../../domain/entities/Review';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';

const REVIEWABLE_ORDER_STATUSES: OrderStatus[] = ['delivered', 'returned'];

const isReviewableOrderStatus = (status: OrderStatus) =>
  REVIEWABLE_ORDER_STATUSES.includes(status);

export class ReviewUseCase {
  constructor(
    private reviewRepository: IReviewRepository,
    private orderRepository: IOrderRepository
  ) {}

  async getMyOrderReviewSummary(
    orderId: number,
    userId: number
  ): Promise<OrderReviewSummary | null> {
    const aggregate = await this.orderRepository.findOwnedDetail(orderId, userId);
    if (!aggregate) {
      return null;
    }

    const [orderFeedback, productReviews] = await Promise.all([
      this.reviewRepository.findOrderFeedbackByOrderId(orderId),
      this.reviewRepository.findProductReviewsByOrderDetailIds(
        aggregate.items.map((item) => item.orderDetailId)
      ),
    ]);

    const reviewable = isReviewableOrderStatus(aggregate.order.status);
    const reviewMap = new Map(
      productReviews
        .filter((review) => review.orderDetailId)
        .map((review) => [review.orderDetailId as number, review])
    );

    return {
      orderId,
      orderStatus: aggregate.order.status,
      canReviewOrder: reviewable && !orderFeedback,
      orderFeedback: orderFeedback || undefined,
      items: aggregate.items.map((item) => ({
        orderDetailId: item.orderDetailId,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        productImage: item.productImage,
        quantity: item.quantity,
        canReview: reviewable && !reviewMap.has(item.orderDetailId),
        review: reviewMap.get(item.orderDetailId),
      })),
    };
  }

  async submitOrderFeedback(
    orderId: number,
    userId: number,
    payload: Omit<CreateOrderFeedbackDTO, 'orderId' | 'userId'>
  ) {
    const aggregate = await this.orderRepository.findOwnedDetail(orderId, userId);
    if (!aggregate) {
      return null;
    }

    if (!isReviewableOrderStatus(aggregate.order.status)) {
      throw new Error(`Cannot review order in status ${aggregate.order.status}`);
    }

    if (!Number.isFinite(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const existingFeedback = await this.reviewRepository.findOrderFeedbackByOrderId(orderId);
    if (existingFeedback) {
      throw new Error('Order feedback already submitted');
    }

    return this.reviewRepository.createOrderFeedback({
      orderId,
      userId,
      rating: payload.rating,
      title: payload.title?.trim() || undefined,
      comment: payload.comment?.trim() || undefined,
    });
  }

  async submitProductReview(
    orderId: number,
    orderDetailId: number,
    userId: number,
    payload: Omit<CreateProductReviewDTO, 'orderId' | 'orderDetailId' | 'productId' | 'userId'>
  ) {
    const aggregate = await this.orderRepository.findOwnedDetail(orderId, userId);
    if (!aggregate) {
      return null;
    }

    if (!isReviewableOrderStatus(aggregate.order.status)) {
      throw new Error(`Cannot review order in status ${aggregate.order.status}`);
    }

    const orderItem = aggregate.items.find((item) => item.orderDetailId === orderDetailId);
    if (!orderItem) {
      throw new Error('Order item not found');
    }

    if (!Number.isFinite(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const existingReviews = await this.reviewRepository.findProductReviewsByOrderDetailIds([
      orderDetailId,
    ]);
    if (existingReviews.length > 0) {
      throw new Error('Product review already submitted');
    }

    return this.reviewRepository.createProductReview({
      orderId,
      orderDetailId,
      productId: orderItem.productId,
      userId,
      rating: payload.rating,
      title: payload.title?.trim() || undefined,
      comment: payload.comment?.trim() || undefined,
    });
  }
}
