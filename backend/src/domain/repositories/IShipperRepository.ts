import { Order } from '../entities/Order';
import { CreateDeliveryAttemptDTO, DeliveryAttempt } from '../entities/DeliveryAttempt';

export interface ShipperOrderFilters {
  status?: string;   // delivery_status value
  date?: string;     // YYYY-MM-DD, defaults to today
  page?: number;
  limit?: number;
}

export interface CODSummary {
  totalOrders: number;
  totalCodAmount: number;
  collectedAmount: number;
  pendingAmount: number;
}

export interface ShipperStats {
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
  totalCodCollected: number;
}

export interface IShipperRepository {
  getAssignedOrders(shipperId: number, filters: ShipperOrderFilters): Promise<{
    items: Order[];
    total: number;
    page: number;
    limit: number;
  }>;

  getOrderDetail(orderId: number, shipperId: number): Promise<(Order & {
    items: any[];
    deliveryAttempts: DeliveryAttempt[];
  }) | null>;

  /** Lấy đơn hàng theo ID (không filter shipper) — dùng để validate phân công */
  getOrderById(orderId: number): Promise<Order | null>;

  updateDeliveryStatus(
    orderId: number,
    data: {
      deliveryStatus: string;
      shipperId?: number;
      deliveredAt?: Date;
      codCollected?: boolean;
      deliveryPhotoUrl?: string;
      failReason?: string | null;
      attemptCount?: number;
      paymentStatus?: string;
      paymentDate?: Date;
    }
  ): Promise<void>;

  createDeliveryAttempt(data: CreateDeliveryAttemptDTO): Promise<void>;

  /** Ghi audit log vào order_events cho mọi thay đổi delivery_status của shipper. */
  appendDeliveryEvent(orderId: number, shipperId: number, deliveryStatus: string, note?: string): Promise<void>;

  /**
   * Hoàn tiền vào ví khi đơn non-COD bị RETURNING (thất bại 3 lần).
   * Chỉ thực hiện nếu payment_method != 'cod' VÀ payment_status = 'paid'.
   */
  triggerReturningRefund(orderId: number, order: {
    userId: number | null;
    paymentMethod: string;
    paymentStatus: string;
    subtotal: number;
    orderCode: string;
  }): Promise<void>;

  getTodayCOD(shipperId: number): Promise<CODSummary>;

  getStats(shipperId: number, from: string, to: string): Promise<ShipperStats>;
}
