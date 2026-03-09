import api from './api';
import type {
  CreateOrderPayload,
  CreateOrderReturnPayload,
  OrderDetailView,
  OrderListItemView,
  OrderReturnView,
  OrderStatus,
  OrderTimelineEventView,
} from '@/types/order';

export const orderService = {
  getMyOrders: async (status?: OrderStatus | 'all'): Promise<OrderListItemView[]> => {
    const params = new URLSearchParams();

    if (status && status !== 'all') {
      params.append('status', status);
    }

    const query = params.toString();
    const response = await api.get(`/orders/my-orders${query ? `?${query}` : ''}`);
    return response.data;
  },

  getById: async (id: number): Promise<OrderDetailView> => {
    const response = await api.get(`/orders/my-orders/${id}`);
    return response.data;
  },

  getTimeline: async (id: number): Promise<OrderTimelineEventView[]> => {
    const response = await api.get(`/orders/my-orders/${id}/timeline`);
    return response.data;
  },

  create: async (orderData: CreateOrderPayload): Promise<{ orderId: number; orderCode: string }> => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  cancel: async (
    orderId: number,
    payload: { reason: string; adminNote?: string }
  ): Promise<{ status: string }> => {
    const response = await api.post(`/orders/my-orders/${orderId}/cancel`, payload);
    return response.data;
  },

  createReturn: async (
    orderId: number,
    payload: CreateOrderReturnPayload
  ): Promise<OrderReturnView> => {
    const response = await api.post(`/orders/my-orders/${orderId}/returns`, payload);
    return response.data;
  },

  getReturns: async (orderId: number): Promise<OrderReturnView[]> => {
    const response = await api.get(`/orders/my-orders/${orderId}/returns`);
    return response.data;
  },

  getReturnById: async (orderId: number, returnId: number): Promise<OrderReturnView> => {
    const response = await api.get(`/orders/my-orders/${orderId}/returns/${returnId}`);
    return response.data;
  },
};
