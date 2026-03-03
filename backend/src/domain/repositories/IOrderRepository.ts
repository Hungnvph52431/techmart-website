import { Order, OrderDetail, CreateOrderDTO, UpdateOrderDTO } from '../entities/Order';

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
}
