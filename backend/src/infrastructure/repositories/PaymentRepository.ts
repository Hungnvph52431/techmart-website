import pool from '../database/connection';
import { Payment, PaymentStatus, CODTodaySummary, CODOrderItem, OrderCODData } from '../../domain/entities/Payment';
import { IPaymentRepository, AdminSettlementRow } from '../../domain/repositories/IPaymentRepository';

export class PaymentRepository implements IPaymentRepository {

  // ──────────────────────────────────────────────
  // Payment record operations
  // ──────────────────────────────────────────────

  async findByOrderId(orderId: number): Promise<Payment | null> {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );
    const row = (rows as any[])[0];
    return row ? this.mapRow(row) : null;
  }

  async updateStatus(
    orderId: number,
    status: PaymentStatus,
    extra?: { collectedAt?: Date; submittedAt?: Date; settledAt?: Date }
  ): Promise<void> {
    let sql = 'UPDATE payments SET status = ?';
    const params: any[] = [status];

    if (extra?.collectedAt) { sql += ', collected_at = ?'; params.push(extra.collectedAt); }
    if (extra?.submittedAt) { sql += ', submitted_at = ?'; params.push(extra.submittedAt); }
    if (extra?.settledAt)   { sql += ', settled_at = ?';   params.push(extra.settledAt); }

    sql += ' WHERE order_id = ?';
    params.push(orderId);
    await pool.query(sql, params);
  }

  async batchUpdateStatus(
    orderIds: number[],
    status: PaymentStatus,
    extra?: { submittedAt?: Date; settledAt?: Date }
  ): Promise<void> {
    if (orderIds.length === 0) return;

    const placeholders = orderIds.map(() => '?').join(',');
    let sql = 'UPDATE payments SET status = ?';
    const params: any[] = [status];

    if (extra?.submittedAt) { sql += ', submitted_at = ?'; params.push(extra.submittedAt); }
    if (extra?.settledAt)   { sql += ', settled_at = ?';   params.push(extra.settledAt); }

    sql += ` WHERE order_id IN (${placeholders})`;
    params.push(...orderIds);
    await pool.query(sql, params);
  }

  async syncFromOrder(orderId: number): Promise<void> {
    await pool.query(`
      INSERT INTO payments (order_id, method, amount, status, shipper_id)
      SELECT order_id, 'cod', cod_amount, 'pending', shipper_id
      FROM orders
      WHERE order_id = ? AND payment_method = 'cod' AND cod_amount > 0
      ON DUPLICATE KEY UPDATE
        amount     = VALUES(amount),
        shipper_id = VALUES(shipper_id)
    `, [orderId]);
  }

  // ──────────────────────────────────────────────
  // Order read/write for COD operations
  // ──────────────────────────────────────────────

  async findOrderForCOD(orderId: number): Promise<OrderCODData | null> {
    const [rows] = await pool.query(
      `SELECT order_id, shipper_id, cod_amount, cod_collected, payment_method
       FROM orders WHERE order_id = ?`,
      [orderId]
    );
    const row = (rows as any[])[0];
    if (!row) return null;
    return {
      orderId:       row.order_id,
      shipperId:     row.shipper_id,
      codAmount:     Number(row.cod_amount),
      codCollected:  Boolean(row.cod_collected),
      paymentMethod: row.payment_method,
    };
  }

  async markOrderCODCollected(orderId: number): Promise<void> {
    await pool.query(
      `UPDATE orders
       SET cod_collected = 1, payment_status = 'paid', payment_date = NOW()
       WHERE order_id = ?`,
      [orderId]
    );
  }

  // ──────────────────────────────────────────────
  // Shipper queries
  // ──────────────────────────────────────────────

  async getTodaySummary(shipperId: number): Promise<CODTodaySummary> {
    // Aggregate totals
    const [totals] = await pool.query(`
      SELECT
        COUNT(*)                                                                              AS totalOrders,
        COALESCE(SUM(p.amount), 0)                                                           AS totalCodAmount,
        COALESCE(SUM(CASE WHEN p.status IN ('collected','pending_settlement','settled')
                          THEN p.amount ELSE 0 END), 0)                                      AS collectedAmount,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0)           AS pendingAmount
      FROM payments p
      WHERE p.shipper_id = ?
        AND p.method = 'cod'
        AND p.status != 'settled'
    `, [shipperId]);

    // Order-level detail
    const [orderRows] = await pool.query(`
      SELECT
        p.order_id,
        o.order_code,
        o.shipping_name                                                         AS customerName,
        CONCAT(o.shipping_address, ', ', o.shipping_district, ', ', o.shipping_city) AS deliveryAddress,
        p.amount                                                                AS codAmount,
        p.status,
        p.collected_at
      FROM payments p
      JOIN orders o ON o.order_id = p.order_id
      WHERE p.shipper_id = ?
        AND p.method = 'cod'
        AND p.status != 'settled'
    `, [shipperId]);

    const t = (totals as any[])[0];
    return {
      totalOrders:     Number(t.totalOrders),
      totalCodAmount:  Number(t.totalCodAmount),
      collectedAmount: Number(t.collectedAmount),
      pendingAmount:   Number(t.pendingAmount),
      orders: (orderRows as any[]).map((r): CODOrderItem => ({
        orderId:         r.order_id,
        orderCode:       r.order_code,
        customerName:    r.customerName,
        deliveryAddress: r.deliveryAddress,
        codAmount:       Number(r.codAmount),
        paymentStatus:   r.status as PaymentStatus,
        collectedAt:     r.collected_at,
      })),
    };
  }

  async findActiveByShipper(shipperId: number): Promise<Payment[]> {
    const [rows] = await pool.query(`
      SELECT p.*
      FROM payments p
      WHERE p.shipper_id = ?
        AND p.method = 'cod'
        AND p.status IN ('pending', 'collected')
    `, [shipperId]);
    return (rows as any[]).map(r => this.mapRow(r));
  }

  // ──────────────────────────────────────────────
  // Admin queries
  // ──────────────────────────────────────────────

  async findPendingSettlementForAdmin(date?: string, shipperId?: number): Promise<AdminSettlementRow[]> {
    let sql = `
      SELECT
        p.shipper_id,
        u.name          AS shipper_name,
        COUNT(*)        AS total_orders,
        SUM(p.amount)   AS total_amount,
        MIN(p.submitted_at) AS submitted_at
      FROM payments p
      JOIN users u ON u.user_id = p.shipper_id
      WHERE p.status = 'pending_settlement'
    `;
    const params: any[] = [];

    if (date) {
      sql += ' AND DATE(p.submitted_at) = ?';
      params.push(date);
    }
    if (shipperId) {
      sql += ' AND p.shipper_id = ?';
      params.push(shipperId);
    }
    sql += ' GROUP BY p.shipper_id, u.name ORDER BY MIN(p.submitted_at) DESC';

    const [rows] = await pool.query(sql, params);
    return (rows as any[]).map(r => ({
      shipperId:   r.shipper_id,
      shipperName: r.shipper_name,
      totalOrders: Number(r.total_orders),
      totalAmount: Number(r.total_amount),
      submittedAt: r.submitted_at,
    }));
  }

  async settleAllPendingByShipper(shipperId: number): Promise<number> {
    const [result] = await pool.query(`
      UPDATE payments
      SET status = 'settled', settled_at = NOW()
      WHERE shipper_id = ? AND status = 'pending_settlement'
    `, [shipperId]);
    return (result as any).affectedRows ?? 0;
  }

  // ──────────────────────────────────────────────
  // Mapper
  // ──────────────────────────────────────────────

  private mapRow(row: any): Payment {
    return {
      id:          row.id,
      orderId:     row.order_id,
      method:      row.method,
      amount:      Number(row.amount),
      status:      row.status as PaymentStatus,
      shipperId:   row.shipper_id ?? null,
      collectedAt: row.collected_at ?? null,
      submittedAt: row.submitted_at ?? null,
      settledAt:   row.settled_at   ?? null,
      note:        row.note         ?? null,
      createdAt:   row.created_at,
      updatedAt:   row.updated_at,
    };
  }
}
