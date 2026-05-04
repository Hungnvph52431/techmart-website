// backend/src/domain/repositories/INotificationRepository.ts

import { Notification, CreateNotificationDTO } from '../entities/Notification';

export interface INotificationRepository {
  create(data: CreateNotificationDTO): Promise<Notification>;
  createBulk(items: CreateNotificationDTO[]): Promise<void>;
  findByUser(userId: number, limit?: number): Promise<Notification[]>;
  countUnread(userId: number): Promise<number>;
  markRead(notificationId: number, userId: number): Promise<boolean>;
  markAllRead(userId: number): Promise<void>;
  delete(notificationId: number, userId: number): Promise<boolean>;
  findAdminUserIds(): Promise<number[]>;
}
