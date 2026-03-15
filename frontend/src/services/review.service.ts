import api from './api';
import type {
  OrderFeedbackView,
  OrderReviewSummaryView,
  ProductReviewView,
} from '@/types/review';

export const reviewService = {
  getMyOrderReviewSummary: async (orderId: number): Promise<OrderReviewSummaryView> => {
    const response = await api.get(`/orders/my-orders/${orderId}/reviews`);
    return response.data;
  },

  createOrderFeedback: async (
    orderId: number,
    payload: { rating: number; title?: string; comment?: string }
  ): Promise<OrderFeedbackView> => {
    const response = await api.post(`/orders/my-orders/${orderId}/order-feedback`, payload);
    return response.data;
  },

  createProductReview: async (
    orderId: number,
    orderDetailId: number,
    payload: { rating: number; title?: string; comment?: string }
  ): Promise<ProductReviewView> => {
    const response = await api.post(
      `/orders/my-orders/${orderId}/items/${orderDetailId}/reviews`,
      payload
    );
    return response.data;
  },
};
