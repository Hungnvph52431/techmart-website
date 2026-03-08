import api from './api';
import { Order, ShippingAddress, OrderItem } from '@/types';

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgOrderValue: number;
  ordersByStatus: {
    pending: number;
    confirmed: number;
    processing: number;
    shipping: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
  paymentMethodStats: {
    cod: number;
    bank_transfer: number;
    momo: number;
    vnpay: number;
    zalopay: number;
  };
  recentOrders: Array<{
    orderId: number;
    orderCode: string;
    shippingName: string;
    total: number;
    status: string;
    paymentMethod: string;
    orderDate: string;
  }>;
}

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

  getStats: async (): Promise<OrderStats> => {
    const response = await api.get('/orders/stats');
    return response.data.data;
  },
};
