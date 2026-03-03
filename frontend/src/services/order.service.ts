import axios from 'axios';
import { Order, OrderDetail, OrderStatus, PaymentStatus } from '@/types/order';

const API_BASE = import.meta.env.VITE_API_URL;

const orderApi = axios.create({
  baseURL: `${API_BASE}/orders`,
  headers: { 'Content-Type': 'application/json' },
});

orderApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const orderService = {
  getAllOrders: async (): Promise<Order[]> => {
    const res = await orderApi.get('/');
    return res.data;
  },

  getOrderById: async (id: number): Promise<Order> => {
    const res = await orderApi.get(`/${id}`);
    return res.data;
  },

  getOrderDetails: async (orderId: number): Promise<OrderDetail[]> => {
    const res = await orderApi.get(`/${orderId}/details`); 
    return res.data;
  },

  updateOrderStatus: async (orderId: number, status: OrderStatus) => {
    const res = await orderApi.patch(`/${orderId}/status`, { status });
    return res.data;
  },

  updatePaymentStatus: async (orderId: number, status: PaymentStatus) => {
    const res = await orderApi.patch(`/${orderId}/payment-status`, { status });
    return res.data;
  },

  getMyOrders: async (): Promise<Order[]> => {
    const res = await orderApi.get('/my-orders');
    return res.data;
  },
};