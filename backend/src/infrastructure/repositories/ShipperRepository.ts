import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';
import {
  CODSummary,
  IShipperRepository,
  ShipperOrderFilters,
  ShipperStats,
} from '../../domain/repositories/IShipperRepository';
import { Order } from '../../domain/entities/Order';
import { CreateDeliveryAttemptDTO, DeliveryAttempt } from '../../domain/entities/DeliveryAttempt';

export class ShipperRepository implements IShipperRepository {
  async getAssignedOrders(
    shipperId: number,
    filters: ShipperOrderFilters
  ): Promise<{ items: Order[]; total: number; page: number; limit: number }> {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['o.shipper_id = ?'];
    const params: any[] = [shipperId];

    if (filters.status) {
      conditions.push('o.delivery_status = ?');
      params.push(filters.status);
    }

    if (filters.date) {
      conditions.push('DATE(o.order_date) = ?');
      params.push(filters.date);
    }

    const where = conditions.join(' AND ');

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM orders o WHERE ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*
       FROM orders o
       WHERE ${where}
       ORDER BY o.order_date DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      items: rows.map(this.mapRow),
      total,
      page,
      limit,
    };
  }

  async getOrderById(orderId: number): Promise<Order | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );
    if (!rows.length) return null;
    return this.mapRow(rows[0]);
  }

  async getOrderDetail(
    orderId: number,
    shipperId: number
  ): Promise<(Order & { items: any[]; deliveryAttempts: DeliveryAttempt[] }) | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ? AND shipper_id = ?',
      [orderId, shipperId]
    );

    if (!rows.length) return null;
    const order = this.mapRow(rows[0]);

    const [detailRows] = await pool.query<RowDataPacket[]>(
      `SELECT od.*, pi.main_image AS product_image
       FROM order_details od
       LEFT JOIN products pi ON pi.product_id = od.product_id
       WHERE od.order_id = ?`,
      [orderId]
    );

    const [attemptRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM delivery_attempts WHERE order_id = ? ORDER BY attempted_at DESC',
      [orderId]
    );

    return {
      ...order,
      items: detailRows,
      deliveryAttempts: attemptRows.map((r: any) => ({
        id: r.id,
        orderId: r.order_id,
        shipperId: r.shipper_id,
        status: r.status,
        failReason: r.fail_reason ?? undefined,
        photoUrl: r.photo_url ?? undefined,
        note: r.note ?? undefined,
        attemptedAt: r.attempted_at,
      })),
    };
  }

  async updateDeliveryStatus(
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
  ): Promise<void> {
    // Đồng bộ orders.status với delivery_status để Admin luôn thấy đúng trạng thái
    const DELIVERY_TO_ORDER_STATUS: Record<string, string> = {
      WAITING_PICKUP: 'shipping',
      PICKED_UP:      'shipping',
      IN_DELIVERY:    'shipping',
      DELIVERED:      'delivered',
      FAILED:         'shipping',
      RETURNING:      'returned',
      RETURNED:       'returned',
    };

    const sets: string[] = ['delivery_status = ?'];
    const params: any[] = [data.deliveryStatus];

    // Tự động sync orders.status
    const syncedOrderStatus = DELIVERY_TO_ORDER_STATUS[data.deliveryStatus];
    if (syncedOrderStatus) {
      sets.push('status = ?');
      params.push(syncedOrderStatus);
    }

    if (data.deliveredAt !== undefined) {
      sets.push('delivered_at = ?');
      params.push(data.deliveredAt);
    }
    if (data.codCollected !== undefined) {
      sets.push('cod_collected = ?');
      params.push(data.codCollected ? 1 : 0);
    }
    if (data.deliveryPhotoUrl !== undefined) {
      sets.push('delivery_photo_url = ?');
      params.push(data.deliveryPhotoUrl);
    }
    if (data.failReason !== undefined) {
      sets.push('fail_reason = ?');
      params.push(data.failReason);
    }
    if (data.attemptCount !== undefined) {
      sets.push('attempt_count = ?');
      params.push(data.attemptCount);
    }
    if (data.paymentStatus !== undefined) {
      sets.push('payment_status = ?');
      params.push(data.paymentStatus);
    }
    if (data.paymentDate !== undefined) {
      sets.push('payment_date = ?');
      params.push(data.paymentDate);
    }

    await pool.execute(
      `UPDATE orders SET ${sets.join(', ')} WHERE order_id = ?`,
      [...params, orderId]
    );
  }

  async triggerReturningRefund(
    orderId: number,
    order: {
      userId: number | null;
      paymentMethod: string;
      paymentStatus: string;
      subtotal: number;
      orderCode: string;
    }
  ): Promise<void> {
    // Chỉ hoàn tiền nếu đơn đã thanh toán online (non-COD) và có userId
    if (order.paymentMethod === 'cod' || order.paymentStatus !== 'paid' || !order.userId) return;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [walletRows] = await connection.execute<RowDataPacket[]>(
        'SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE',
        [order.userId]
      );
      const currentBalance = Number(walletRows[0]?.wallet_balance ?? 0);
      const refundAmount = order.subtotal;
      const newBalance = currentBalance + refundAmount;

      await connection.execute(
        'UPDATE users SET wallet_balance = ? WHERE user_id = ?',
        [newBalance, order.userId]
      );

      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
         VALUES (?, 'refund', ?, ?, 'order', ?, ?, NOW())`,
        [
          order.userId,
          refundAmount,
          newBalance,
          orderId,
          `Hoàn tiền đơn #${order.orderCode} — giao hàng thất bại 3 lần`,
        ]
      );

      // Cập nhật payment_status = 'refunded' trên đơn hàng
      await connection.execute(
        "UPDATE orders SET payment_status = 'refunded' WHERE order_id = ?",
        [orderId]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async createDeliveryAttempt(data: CreateDeliveryAttemptDTO): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO delivery_attempts (order_id, shipper_id, status, fail_reason, photo_url, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.orderId,
        data.shipperId,
        data.status,
        data.failReason ?? null,
        data.photoUrl ?? null,
        data.note ?? null,
      ]
    );
  }

  async getTodayCOD(shipperId: number): Promise<CODSummary> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS totalOrders,
         COALESCE(SUM(cod_amount), 0) AS totalCodAmount,
         COALESCE(SUM(CASE WHEN cod_collected = 1 THEN cod_amount ELSE 0 END), 0) AS collectedAmount
       FROM orders
       WHERE shipper_id = ?
         AND cod_amount > 0
         AND DATE(order_date) = CURDATE()`,
      [shipperId]
    );

    const row = rows[0] as any;
    const totalCodAmount = Number(row.totalCodAmount);
    const collectedAmount = Number(row.collectedAmount);

    return {
      totalOrders: Number(row.totalOrders),
      totalCodAmount,
      collectedAmount,
      pendingAmount: totalCodAmount - collectedAmount,
    };
  }

  async getStats(shipperId: number, from: string, to: string): Promise<ShipperStats> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(CASE WHEN delivery_status = 'DELIVERED' THEN 1 END) AS totalDelivered,
         COUNT(CASE WHEN delivery_status = 'FAILED' THEN 1 END)    AS totalFailed,
         COALESCE(SUM(CASE WHEN cod_collected = 1 THEN cod_amount ELSE 0 END), 0) AS totalCodCollected
       FROM orders
       WHERE shipper_id = ?
         AND DATE(order_date) BETWEEN ? AND ?`,
      [shipperId, from, to]
    );

    const row = rows[0] as any;
    const totalDelivered = Number(row.totalDelivered);
    const totalFailed = Number(row.totalFailed);
    const total = totalDelivered + totalFailed;

    return {
      totalDelivered,
      totalFailed,
      successRate: total > 0 ? Math.round((totalDelivered / total) * 100) : 0,
      totalCodCollected: Number(row.totalCodCollected),
    };
  }

  async appendDeliveryEvent(orderId: number, shipperId: number, deliveryStatus: string, note?: string): Promise<void> {
    try {
      await pool.execute(
        `INSERT INTO order_events (order_id, event_type, to_status, actor_user_id, actor_role, note, created_at)
         VALUES (?, 'delivery_status_changed', ?, ?, 'shipper', ?, NOW())`,
        [orderId, deliveryStatus, shipperId, note ?? null]
      );
    } catch {
      // Log thất bại không được chặn nghiệp vụ chính
    }
  }

  private mapRow(row: any): Order {
    return {
      orderId: row.order_id,
      orderCode: row.order_code,
      userId: row.user_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      shippingName: row.shipping_name,
      shippingPhone: row.shipping_phone,
      shippingAddress: row.shipping_address,
      shippingWard: row.shipping_ward,
      shippingDistrict: row.shipping_district,
      shippingCity: row.shipping_city,
      subtotal: Number(row.subtotal),
      shippingFee: Number(row.shipping_fee),
      discountAmount: Number(row.discount_amount),
      total: Number(row.total),
      couponId: row.coupon_id,
      couponCode: row.coupon_code,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: row.payment_date,
      depositAmount: row.deposit_amount ? Number(row.deposit_amount) : undefined,
      status: row.status,
      customerNote: row.customer_note,
      adminNote: row.admin_note,
      cancelReason: row.cancel_reason,
      // Shipper fields
      shipperId: row.shipper_id,
      deliveryStatus: row.delivery_status ?? 'WAITING_PICKUP',
      codAmount: Number(row.cod_amount ?? 0),
      codCollected: Boolean(row.cod_collected),
      failReason: row.fail_reason ?? null,
      deliveryPhotoUrl: row.delivery_photo_url ?? null,
      attemptCount: Number(row.attempt_count ?? 0),
      orderDate: row.order_date,
      confirmedAt: row.confirmed_at,
      shippedAt: row.shipped_at,
      deliveredAt: row.delivered_at,
      cancelledAt: row.cancelled_at,
      updatedAt: row.updated_at,
    };
  }
}
