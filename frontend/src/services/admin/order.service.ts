import api from '../api';

export const adminOrderService = {
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getById: async (orderId: number | string) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  getTimeline: async (orderId: number | string) => {
    const response = await api.get(`/orders/${orderId}/timeline`);
    return response.data;
  },

  getReturns: async (orderId: number | string) => {
    const response = await api.get(`/orders/${orderId}/returns`);
    return response.data;
  },

  updateStatus: async (orderId: number | string, status: string, note?: string) => {
    const response = await api.patch(`/orders/${orderId}/status`, {
      status,
      actorRole: 'admin',
      note: note || '',
    });
    return response.data;
  },

  updatePaymentStatus: async (orderId: number | string, paymentStatus: string) => {
    const response = await api.patch(`/orders/${orderId}/payment-status`, { paymentStatus });
    return response.data;
  },

  reviewReturn: async (orderId: number | string, returnId: number | string, payload: { decision: string; adminNote?: string }) => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/review`, payload);
    return response.data;
  },

  receiveReturn: async (orderId: number | string, returnId: number | string, payload?: { adminNote?: string }) => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/receive`, payload || {});
    return response.data;
  },

  refundReturn: async (orderId: number | string, returnId: number | string, payload?: { adminNote?: string }) => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/refund`, payload || {});
    return response.data;
  },

  closeReturn: async (orderId: number | string, returnId: number | string, payload?: { adminNote?: string }) => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/close`, payload || {});
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/orders/stats');
    return response.data.data || response.data;
  },
};
