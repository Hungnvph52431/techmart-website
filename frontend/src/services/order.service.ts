import api from './api';
import { Order, ShippingAddress, OrderItem } from '@/types';

export const orderService = {
  getMyOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },

  getAll: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (orderData: {
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: ShippingAddress;
    paymentMethod: 'cod' | 'online';
    note?: string;
  }): Promise<Order> => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  updateStatus: async (orderId: number, status: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  updatePaymentStatus: async (orderId: number, paymentStatus: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/payment-status`, { paymentStatus });
    return response.data;
  },
};
