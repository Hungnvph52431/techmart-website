// backend/src/domain/entities/Notification.ts

export type NotificationType =
  | 'order_created'
  | 'order_status'
  | 'order_cancelled'
  | 'return_created'
  | 'return_approved'
  | 'return_rejected'
  | 'payment'
  | 'system';

export interface Notification {
  notificationId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationDTO {
  userId: number;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}
