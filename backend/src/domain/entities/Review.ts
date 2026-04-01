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
  editCount: number;
  editedAfterReturnAt?: Date;
  editedAfterReturnOrderReturnId?: number;
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
  canCreateReview: boolean;
  canEditReview: boolean;
  hasUsedReturnEdit: boolean;
  remainingEditCount: number;
  reviewEditLimit: number;
  linkedReturnId?: number;
  review?: ProductReview;
}

export interface OrderReviewSummary {
  orderId: number;
  orderStatus: OrderStatus;
  canReviewOrder: boolean;
  orderFeedback?: OrderFeedback;
  hasPendingReviewActions: boolean;
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

export interface UpdateProductReviewDTO {
  reviewId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  editedAfterReturnOrderReturnId: number;
}
