// backend/src/application/use-cases/NotificationUseCase.ts

import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Notification, CreateNotificationDTO } from '../../domain/entities/Notification';

export class NotificationUseCase {
  constructor(private repo: INotificationRepository) {}

  async list(userId: number, limit = 50): Promise<Notification[]> {
    return this.repo.findByUser(userId, limit);
  }

  async unreadCount(userId: number): Promise<number> {
    return this.repo.countUnread(userId);
  }

  async markRead(notificationId: number, userId: number): Promise<boolean> {
    return this.repo.markRead(notificationId, userId);
  }

  async markAllRead(userId: number): Promise<void> {
    return this.repo.markAllRead(userId);
  }

  async delete(notificationId: number, userId: number): Promise<boolean> {
    return this.repo.delete(notificationId, userId);
  }

  // ── Helpers gọi từ các use-case khác để tạo notification ──

  async notifyUser(data: CreateNotificationDTO): Promise<void> {
    try {
      await this.repo.create(data);
    } catch (e) {
      // Không để lỗi notify làm fail nghiệp vụ chính
      console.error('[notify] notifyUser failed', e);
    }
  }

  async notifyAdmins(payload: Omit<CreateNotificationDTO, 'userId'>): Promise<void> {
    try {
      const admins = await this.repo.findAdminUserIds();
      if (admins.length === 0) return;
      await this.repo.createBulk(admins.map(uid => ({ ...payload, userId: uid })));
    } catch (e) {
      console.error('[notify] notifyAdmins failed', e);
    }
  }
}
