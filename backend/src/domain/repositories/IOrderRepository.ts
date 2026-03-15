import {
  AdminOrderListFilters,
  CancelOrderDTO,
  CloseOrderReturnDTO,
  CreateOrderDTO,
  CreateOrderReturnDTO,
  Order,
  OrderAggregate,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  OrderReturn,
  PaginatedResult,
  ReceiveOrderReturnDTO,
  RefundOrderReturnDTO,
  ReviewOrderReturnDTO,
  TransitionOrderStatusDTO,
  UpdatePaymentStatusDTO,
} from '../entities/Order';

// --- ĐỊNH NGHĨA THỐNG KÊ ĐƠN HÀNG ---
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

// --- INTERFACE REPOSITORY CHÍNH ---
export interface IOrderRepository {
  // 1. Tìm kiếm cơ bản
  findById(orderId: number): Promise<Order | null>;
  findOwnedById(orderId: number, userId: number): Promise<Order | null>;
  findByOrderCode(orderCode: string): Promise<Order | null>;
  
  // 2. Danh sách & Phân trang
  findAdminList(filters?: AdminOrderListFilters): Promise<PaginatedResult<OrderListItem>>;
  findUserList(userId: number, status?: Order['status'] | 'all'): Promise<OrderListItem[]>;
  
  // 3. Chi tiết đơn hàng (kèm thông tin khách hàng & sản phẩm)
  findAdminDetail(orderId: number): Promise<OrderAggregate | null>;
  findOwnedDetail(orderId: number, userId: number): Promise<OrderAggregate | null>;
  getOrderDetails(orderId: number): Promise<OrderDetail[]>;
  
  // 4. Lịch sử & Thống kê
  getOrderTimeline(orderId: number): Promise<OrderEvent[]>;
  getStats(): Promise<OrderStats>; // Phục vụ AdminDashboard
  
  // 5. Thao tác đơn hàng
  create(order: CreateOrderDTO): Promise<Order>;
  transitionStatus(input: TransitionOrderStatusDTO): Promise<Order | null>;
  updatePaymentStatus(input: UpdatePaymentStatusDTO): Promise<Order | null>;
  cancel(input: CancelOrderDTO): Promise<Order | null>;
  
  // 6. Quản lý Đổi/Trả (Returns)
  listReturns(orderId: number): Promise<OrderReturn[]>;
  getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null>;
  createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn>;
  reviewReturn(input: ReviewOrderReturnDTO): Promise<OrderReturn | null>;
  receiveReturn(input: ReceiveOrderReturnDTO): Promise<OrderReturn | null>;
  refundReturn(input: RefundOrderReturnDTO): Promise<OrderReturn | null>;
  closeReturn(input: CloseOrderReturnDTO): Promise<OrderReturn | null>;
}