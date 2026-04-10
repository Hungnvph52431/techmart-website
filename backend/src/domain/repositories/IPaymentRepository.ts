import { Payment, PaymentStatus, CODTodaySummary, OrderCODData } from '../entities/Payment';

export interface IPaymentRepository {
  // Payment record operations
  findByOrderId(orderId: number): Promise<Payment | null>;
  updateStatus(
    orderId: number,
    status: PaymentStatus,
    extra?: { collectedAt?: Date; submittedAt?: Date; settledAt?: Date }
  ): Promise<void>;
  batchUpdateStatus(
    orderIds: number[],
    status: PaymentStatus,
    extra?: { submittedAt?: Date; settledAt?: Date }
  ): Promise<void>;
  syncFromOrder(orderId: number): Promise<void>;

  // Order read/write (COD-specific, to avoid coupling to OrderRepository)
  findOrderForCOD(orderId: number): Promise<OrderCODData | null>;
  markOrderCODCollected(orderId: number): Promise<void>;

  // Shipper queries
  getTodaySummary(shipperId: number): Promise<CODTodaySummary>;
  findActiveByShipper(shipperId: number): Promise<Payment[]>;

  // Admin queries
  findPendingSettlementForAdmin(date?: string, shipperId?: number): Promise<AdminSettlementRow[]>;
  settleAllPendingByShipper(shipperId: number): Promise<number>; // returns count settled
}

export interface AdminSettlementRow {
  shipperId: number;
  shipperName: string;
  totalOrders: number;
  totalAmount: number;
  submittedAt: Date | null;
}
