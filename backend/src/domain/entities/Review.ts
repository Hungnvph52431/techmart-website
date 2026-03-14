import { OrderStatus } from './Order';

export type ProductReviewStatus = 'pending' | 'approved' | 'rejected';

export interface OrderFeedback {
  orderFeedbackId: number;
  orderId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductReview {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderReviewItem {
  orderDetailId: number;
  productId: number;
  productName: string;
  variantName?: string;
  sku?: string;
  productImage?: string;
  quantity: number;
  canReview: boolean;
  review?: ProductReview;
}

export interface OrderReviewSummary {
  orderId: number;
  orderStatus: OrderStatus;
  canReviewOrder: boolean;
  orderFeedback?: OrderFeedback;
  items: OrderReviewItem[];
}

export interface CreateOrderFeedbackDTO {
  orderId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
}

export interface CreateProductReviewDTO {
  orderId: number;
  orderDetailId: number;
  productId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
}
