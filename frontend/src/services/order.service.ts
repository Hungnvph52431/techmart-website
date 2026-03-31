import api from './api';
import type {
  CreateOrderPayload,
  CreateOrderReturnPayload,
  OrderDetailView,
  OrderReturnView,
} from '@/types/order';
import {
  Order,
  OrderStats,
} from '@/types';

// Các type bổ trợ cho tính năng Đơn hàng nâng cao
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';

export const orderService = {
  // 1. DÀNH CHO KHÁCH HÀNG (Customer)
  getMyOrders: async (status?: OrderStatus | 'all'): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }
    const query = params.toString();
    const response = await api.get(`/orders/my-orders${query ? `?${query}` : ''}`);
    return response.data;
  },

  // ✅ Fix: đổi return type thành OrderDetailView
  getById: async (id: number | string): Promise<OrderDetailView> => {
    const response = await api.get(`/orders/my-orders/${id}`);
    return response.data;
  },

  getTimeline: async (id: number): Promise<any[]> => {
    const response = await api.get(`/orders/my-orders/${id}/timeline`);
    return response.data;
  },

  confirmDelivered: async (orderId: number): Promise<any> => {
    const response = await api.post(`/orders/my-orders/${orderId}/confirm-delivered`);
    return response.data;
  },

  create: async (orderData: CreateOrderPayload): Promise<{ orderId: number; orderCode: string }> => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  cancel: async (orderId: number, payload: { reason: string }): Promise<{ status: string }> => {
    const response = await api.post(`/orders/my-orders/${orderId}/cancel`, payload);
    return response.data;
  },

  // 2. DÀNH CHO QUẢN TRỊ (Admin)
  getAll: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  updateStatus: async (orderId: number, status: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/status`, {
      status,
      actorUserId: null,
      actorRole: 'admin',
      note: '',
    });
    return response.data;
  },

  updatePaymentStatus: async (orderId: number, paymentStatus: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/payment-status`, { paymentStatus });
    return response.data;
  },

  getStats: async (): Promise<OrderStats> => {
    const response = await api.get('/orders/stats');
    return response.data.data || response.data;
  },

  // 3. QUẢN LÝ ĐỔI TRẢ (Returns) — gửi FormData để hỗ trợ upload ảnh bằng chứng
  createReturn: async (orderId: number, payload: CreateOrderReturnPayload & { evidenceImages?: File[] }): Promise<OrderReturnView> => {
    const formData = new FormData();
    formData.append('reason', payload.reason);
    if (payload.customerNote) formData.append('customerNote', payload.customerNote);
    formData.append('items', JSON.stringify(payload.items));
    if (payload.evidenceImages) {
      for (const file of payload.evidenceImages) {
        formData.append('evidenceImages', file);
      }
    }
    const response = await api.post(`/orders/my-orders/${orderId}/returns`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  // 4. ADMIN — QUẢN LÝ HOÀN TRẢ
  adminGetAllReturns: async (filters?: { status?: string }): Promise<OrderReturnView[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    const q = params.toString();
    const response = await api.get(`/orders/admin/returns${q ? `?${q}` : ''}`);
    return response.data;
  },

  adminReviewReturn: async (orderId: number, returnId: number, decision: 'approved' | 'rejected', adminNote?: string): Promise<OrderReturnView> => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/review`, { decision, adminNote });
    return response.data;
  },

  adminReceiveReturn: async (orderId: number, returnId: number, adminNote?: string): Promise<OrderReturnView> => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/receive`, { adminNote });
    return response.data;
  },

  adminRefundReturn: async (orderId: number, returnId: number, adminNote?: string): Promise<OrderReturnView> => {
    const response = await api.patch(`/orders/${orderId}/returns/${returnId}/refund`, { adminNote });
    return response.data;
  },
};
