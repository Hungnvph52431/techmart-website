export type PaymentStatus = 'pending' | 'collected' | 'pending_settlement' | 'settled';

export interface Payment {
  id: number;
  orderId: number;
  method: string;
  amount: number;
  status: PaymentStatus;
  shipperId: number | null;
  collectedAt: Date | null;
  submittedAt: Date | null;
  settledAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CODOrderItem {
  orderId: number;
  orderCode: string;
  customerName: string;
  deliveryAddress: string;
  codAmount: number;
  paymentStatus: PaymentStatus;
  collectedAt: Date | null;
}

export interface CODTodaySummary {
  totalOrders: number;
  totalCodAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  orders: CODOrderItem[];
}

export interface OrderCODData {
  orderId: number;
  shipperId: number | null;
  codAmount: number;
  codCollected: boolean;
  paymentMethod: string;
}
