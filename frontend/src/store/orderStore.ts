import { create } from 'zustand';
import { Order, OrderDetail, OrderStatus, PaymentStatus } from '@/types/order';
import { orderService } from '../services/order.service';
import toast from 'react-hot-toast';

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  orderDetails: OrderDetail[] | null;
  loading: boolean;
  error: string | null;

  fetchAllOrders: () => Promise<void>;
  fetchOrderDetails: (orderId: number) => Promise<void>;
  updateStatus: (orderId: number, status: OrderStatus) => Promise<boolean>;
  updatePaymentStatus: (orderId: number, status: PaymentStatus) => Promise<boolean>;
  setSelectedOrder: (order: Order | null) => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  selectedOrder: null,
  orderDetails: null,
  loading: false,
  error: null,

  fetchAllOrders: async () => {
    set({ loading: true, error: null });
    try {
      const data = await orderService.getAllOrders();
      set({ orders: data, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không tải được danh sách đơn hàng';
      set({ error: msg, loading: false });
      toast.error(msg);
    }
  },

  fetchOrderDetails: async (orderId: number) => {
    try {
      const details = await orderService.getOrderDetails(orderId);
      set({ orderDetails: details });
    } catch (err: any) {
      toast.error('Không tải được chi tiết đơn hàng');
    }
  },

  updateStatus: async (orderId: number, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.orderId === orderId ? { ...o, status } : o
        ),
        selectedOrder:
          state.selectedOrder?.orderId === orderId
            ? { ...state.selectedOrder, status }
            : state.selectedOrder,
      }));
      toast.success(`Cập nhật trạng thái: ${status}`);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
      return false;
    }
  },

  updatePaymentStatus: async (orderId: number, status: PaymentStatus) => {
    try {
      await orderService.updatePaymentStatus(orderId, status);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.orderId === orderId ? { ...o, paymentStatus: status } : o
        ),
        selectedOrder:
          state.selectedOrder?.orderId === orderId
            ? { ...state.selectedOrder, paymentStatus: status }
            : state.selectedOrder,
      }));
      toast.success(`Thanh toán: ${status}`);
      return true;
    } catch (err) {
      toast.error('Cập nhật trạng thái thanh toán thất bại');
      return false;
    }
  },

  setSelectedOrder: (order) => set({ selectedOrder: order, orderDetails: null }),

  clearError: () => set({ error: null }),
}));