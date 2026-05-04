// backend/src/infrastructure/repositories/NotificationRepository.ts

import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Notification, CreateNotificationDTO } from '../../domain/entities/Notification';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';

export class NotificationRepository implements INotificationRepository {
  private pool = pool;

  private mapRow(row: any): Notification {
    return {
      notificationId: row.notification_id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message ?? undefined,
      link: row.link ?? undefined,
      isRead: Boolean(row.is_read),
      createdAt: new Date(row.created_at),
    };
  }

  async create(data: CreateNotificationDTO): Promise<Notification> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, ?, ?, ?, ?)`,
      [data.userId, data.type, data.title, data.message ?? null, data.link ?? null]
    );
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM notifications WHERE notification_id = ?',
      [result.insertId]
    );
    return this.mapRow(rows[0]);
  }

  async createBulk(items: CreateNotificationDTO[]): Promise<void> {
    if (items.length === 0) return;
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values: any[] = [];
    for (const it of items) {
      values.push(it.userId, it.type, it.title, it.message ?? null, it.link ?? null);
    }
    await this.pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link) VALUES ${placeholders}`,
      values
    );
  }

  async findByUser(userId: number, limit = 50): Promise<Notification[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(Number(limit) || 50)));
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ${safeLimit}`,
      [userId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async countUnread(userId: number): Promise<number> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return Number((rows[0] as any).cnt) || 0;
  }

  async markRead(notificationId: number, userId: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  async markAllRead(userId: number): Promise<void> {
    await this.pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );
  }

  async delete(notificationId: number, userId: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  async findAdminUserIds(): Promise<number[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT user_id FROM users WHERE role IN ('admin', 'staff')`
    );
    return rows.map(r => (r as any).user_id);
  }
}
