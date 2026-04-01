import { OrderStatus } from '../../domain/entities/Order';
import {
  CreateOrderFeedbackDTO,
  CreateProductReviewDTO,
  OrderReviewSummary,
  UpdateProductReviewDTO,
} from '../../domain/entities/Review';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';

const REVIEWABLE_ORDER_STATUSES: OrderStatus[] = ['delivered', 'completed'];

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

    const [orderFeedback, productReviews, returnLinkMap] = await Promise.all([
      this.reviewRepository.findOrderFeedbackByOrderId(orderId),
      this.reviewRepository.findProductReviewsByOrderDetailIds(
        aggregate.items.map((item) => item.orderDetailId)
      ),
      this.reviewRepository.findReturnLinkedOrderDetailIds(orderId, userId),
    ]);
    const reviewable = isReviewableOrderStatus(aggregate.order.status);
    const reviewMap = new Map(
      productReviews
        .filter((review) => review.orderDetailId)
        .map((review) => [review.orderDetailId as number, review])
    );
    const items = aggregate.items.map((item) => {
      const review = reviewMap.get(item.orderDetailId);
      const linkedReturnId = returnLinkMap.get(item.orderDetailId);
      const canCreateReview = reviewable && !review;
      const remainingEditCount = review ? Math.max(0, 1 - (review.editCount || 0)) : 0;
      const canEditReview =
        Boolean(review) && Boolean(linkedReturnId) && remainingEditCount > 0;

      return {
        orderDetailId: item.orderDetailId,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        productImage: item.productImage,
        quantity: item.quantity,
        canReview: canCreateReview,
        canCreateReview,
        canEditReview,
        hasUsedReturnEdit: Boolean(review) && remainingEditCount === 0,
        remainingEditCount,
        reviewEditLimit: 1,
        linkedReturnId: linkedReturnId || undefined,
        review,
      };
    });

    return {
      orderId,
      orderStatus: aggregate.order.status,
      canReviewOrder: reviewable && !orderFeedback,
      orderFeedback: orderFeedback || undefined,
      hasPendingReviewActions: items.some(
        (item) => item.canCreateReview || item.canEditReview
      ),
      items,
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

  async updateProductReviewAfterReturn(
    reviewId: number,
    userId: number,
    payload: Omit<UpdateProductReviewDTO, 'reviewId' | 'userId' | 'editedAfterReturnOrderReturnId'>
  ) {
    const review = await this.reviewRepository.findProductReviewByIdForUser(reviewId, userId);
    if (!review) {
      return null;
    }

    if (!review.orderId || !review.orderDetailId) {
      throw new Error('Chỉ có thể sửa đánh giá gắn với đơn hàng');
    }

    if (!Number.isFinite(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if ((review.editCount || 0) >= 1) {
      throw new Error('Bạn chỉ có thể sửa đánh giá 1 lần sau khi yêu cầu hoàn hàng');
    }

    const linkedReturnMap = await this.reviewRepository.findReturnLinkedOrderDetailIds(
      review.orderId,
      userId
    );
    const linkedReturnId = linkedReturnMap.get(review.orderDetailId);

    if (!linkedReturnId) {
      throw new Error(
        'Chỉ có thể sửa đánh giá sau khi đã gửi yêu cầu hoàn hàng cho sản phẩm này'
      );
    }

    return this.reviewRepository.updateProductReview({
      reviewId,
      userId,
      rating: payload.rating,
      title: payload.title?.trim() || undefined,
      comment: payload.comment?.trim() || undefined,
      editedAfterReturnOrderReturnId: linkedReturnId,
    });
  }
}
