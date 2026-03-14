import api from '../api';
import type {
  OrderDetailView,
  OrderListItemView,
  OrderReturnView,
  OrderStatus,
  OrderTimelineEventView,
  PaginatedResponse,
  PaymentStatus,
} from '@/types/order';

export interface AdminOrderFilters {
  search?: string;
  status?: OrderStatus | 'all';
  paymentStatus?: PaymentStatus | 'all';
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

const toQueryString = (filters?: AdminOrderFilters) => {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const adminOrderService = {
  getAll: async (
    filters?: AdminOrderFilters
  ): Promise<PaginatedResponse<OrderListItemView>> => {
    const response = await api.get(`/admin/orders${toQueryString(filters)}`);
    return response.data;
  },

  getById: async (orderId: number): Promise<OrderDetailView> => {
    const response = await api.get(`/admin/orders/${orderId}`);
    return response.data;
  },

  getTimeline: async (orderId: number): Promise<OrderTimelineEventView[]> => {
    const response = await api.get(`/admin/orders/${orderId}/timeline`);
    return response.data;
  },

  updateStatus: async (
    orderId: number,
    status: OrderStatus,
    note?: string
  ): Promise<{ status: string }> => {
    const response = await api.patch(`/admin/orders/${orderId}/status`, { status, note });
    return response.data;
  },

  updatePaymentStatus: async (
    orderId: number,
    paymentStatus: PaymentStatus,
    note?: string
  ): Promise<{ paymentStatus: string }> => {
    const response = await api.patch(`/admin/orders/${orderId}/payment-status`, {
      paymentStatus,
      note,
    });
    return response.data;
  },

  cancel: async (
    orderId: number,
    payload: { reason: string; adminNote?: string }
  ): Promise<{ status: string }> => {
    const response = await api.post(`/admin/orders/${orderId}/cancel`, payload);
    return response.data;
  },

  getReturns: async (orderId: number): Promise<OrderReturnView[]> => {
    const response = await api.get(`/admin/orders/${orderId}/returns`);
    return response.data;
  },

  getReturnById: async (orderId: number, returnId: number): Promise<OrderReturnView> => {
    const response = await api.get(`/admin/orders/${orderId}/returns/${returnId}`);
    return response.data;
  },

  reviewReturn: async (
    orderId: number,
    returnId: number,
    payload: { decision: 'approved' | 'rejected'; adminNote?: string }
  ): Promise<OrderReturnView> => {
    const response = await api.post(`/admin/orders/${orderId}/returns/${returnId}/review`, payload);
    return response.data;
  },

  receiveReturn: async (
    orderId: number,
    returnId: number,
    payload?: { adminNote?: string }
  ): Promise<OrderReturnView> => {
    const response = await api.post(`/admin/orders/${orderId}/returns/${returnId}/receive`, payload);
    return response.data;
  },

  refundReturn: async (
    orderId: number,
    returnId: number,
    payload?: { adminNote?: string }
  ): Promise<OrderReturnView> => {
    const response = await api.post(`/admin/orders/${orderId}/returns/${returnId}/refund`, payload);
    return response.data;
  },

  closeReturn: async (
    orderId: number,
    returnId: number,
    payload?: { adminNote?: string }
  ): Promise<OrderReturnView> => {
    const response = await api.post(`/admin/orders/${orderId}/returns/${returnId}/close`, payload);
    return response.data;
  },
};
