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

export interface IOrderRepository {
  findById(orderId: number): Promise<Order | null>;
  findOwnedById(orderId: number, userId: number): Promise<Order | null>;
  findByOrderCode(orderCode: string): Promise<Order | null>;
  findAdminList(filters?: AdminOrderListFilters): Promise<PaginatedResult<OrderListItem>>;
  findUserList(userId: number, status?: Order['status'] | 'all'): Promise<OrderListItem[]>;
  findAdminDetail(orderId: number): Promise<OrderAggregate | null>;
  findOwnedDetail(orderId: number, userId: number): Promise<OrderAggregate | null>;
  getOrderDetails(orderId: number): Promise<OrderDetail[]>;
  getOrderTimeline(orderId: number): Promise<OrderEvent[]>;
  create(order: CreateOrderDTO): Promise<Order>;
  transitionStatus(input: TransitionOrderStatusDTO): Promise<Order | null>;
  updatePaymentStatus(input: UpdatePaymentStatusDTO): Promise<Order | null>;
  cancel(input: CancelOrderDTO): Promise<Order | null>;
  listReturns(orderId: number): Promise<OrderReturn[]>;
  getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null>;
  createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn>;
  reviewReturn(input: ReviewOrderReturnDTO): Promise<OrderReturn | null>;
  receiveReturn(input: ReceiveOrderReturnDTO): Promise<OrderReturn | null>;
  refundReturn(input: RefundOrderReturnDTO): Promise<OrderReturn | null>;
  closeReturn(input: CloseOrderReturnDTO): Promise<OrderReturn | null>;
}
