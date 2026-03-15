import type { OrderStatus } from './order';

export type ProductReviewStatus = 'pending' | 'approved' | 'rejected';

export interface OrderFeedbackView {
  orderFeedbackId: number;
  orderId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewView {
  reviewId: number;
  productId: number;
  userId: number;
  orderId?: number;
  orderDetailId?: number;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  status: ProductReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderReviewItemView {
  orderDetailId: number;
  productId: number;
  productName: string;
  variantName?: string;
  sku?: string;
  productImage?: string;
  quantity: number;
  canReview: boolean;
  review?: ProductReviewView;
}

export interface OrderReviewSummaryView {
  orderId: number;
  orderStatus: OrderStatus;
  canReviewOrder: boolean;
  orderFeedback?: OrderFeedbackView;
  items: OrderReviewItemView[];
}
