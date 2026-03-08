import { Order, OrderDetail, CreateOrderDTO, UpdateOrderDTO } from '../entities/Order';

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
    orderDate: Date;
  }>;
}

export interface IOrderRepository {
  findAll(): Promise<Order[]>;
  findById(orderId: number): Promise<Order | null>;
  findByUserId(userId: number): Promise<Order[]>;
  findByOrderCode(orderCode: string): Promise<Order | null>;
  getOrderDetails(orderId: number): Promise<OrderDetail[]>;
  create(order: CreateOrderDTO): Promise<Order>;
  update(order: UpdateOrderDTO): Promise<Order | null>;
  updateStatus(orderId: number, status: Order['status']): Promise<boolean>;
  updatePaymentStatus(orderId: number, status: Order['paymentStatus']): Promise<boolean>;
  getStats(): Promise<OrderStats>;
}
