export type DeliveryAttemptStatus = 'SUCCESS' | 'FAILED';

export type DeliveryFailReason = 'VACANT' | 'WRONG_ADDRESS' | 'CUSTOMER_REFUSED' | 'OTHER';

export type DeliveryStatus =
  | 'WAITING_PICKUP'
  | 'PICKED_UP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNING'
  | 'RETURNED';

export interface DeliveryAttempt {
  id: number;
  orderId: number;
  shipperId: number;
  status: DeliveryAttemptStatus;
  failReason?: DeliveryFailReason;
  photoUrl?: string;
  note?: string;
  attemptedAt: Date;
}

export interface CreateDeliveryAttemptDTO {
  orderId: number;
  shipperId: number;
  status: DeliveryAttemptStatus;
  failReason?: DeliveryFailReason;
  photoUrl?: string;
  note?: string;
}
