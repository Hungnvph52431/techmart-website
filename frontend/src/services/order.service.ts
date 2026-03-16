import api from './api';
import { 
  Order, 
  OrderStats, 
  OrderItem,  
} from '@/types';

// Các type bổ trợ cho tính năng Đơn hàng nâng cao
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';

export interface CreateOrderPayload {
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'cod' | 'online';
  note?: string;
}

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

  getById: async (id: number | string): Promise<Order> => {
    // Tự động nhận diện endpoint dựa trên quyền hoặc ID
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getTimeline: async (id: number): Promise<any[]> => {
    const response = await api.get(`/orders/${id}/timeline`);
    return response.data;
  },

  create: async (orderData: CreateOrderPayload): Promise<{ orderId: number; orderCode: string }> => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  cancel: async (orderId: number, payload: { reason: string }): Promise<{ status: string }> => {
    const response = await api.post(`/orders/${orderId}/cancel`, payload);
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
    actorUserId: null,   // Admin action, không cần userId cụ thể
    actorRole: 'admin',
    note: '',
  });
  return response.data;
},

  updatePaymentStatus: async (orderId: number, paymentStatus: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/payment-status`, { paymentStatus });
    return response.data;
  },

  // Hàm quan trọng để fix lỗi AdminDashboard
  getStats: async (): Promise<OrderStats> => {
    const response = await api.get('/orders/stats');
    // Bóc tách data từ envelope nếu Backend trả về dạng { success: true, data: {...} }
    return response.data.data || response.data;
  },

  // 3. QUẢN LÝ ĐỔI TRẢ (Returns)
  createReturn: async (orderId: number, payload: any): Promise<any> => {
    const response = await api.post(`/orders/${orderId}/returns`, payload);
    return response.data;
  },

  getReturns: async (orderId: number): Promise<any[]> => {
    const response = await api.get(`/orders/${orderId}/returns`);
    return response.data;
  }
};