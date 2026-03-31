import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../database/connection';
import { IOrderRepository, OrderStats } from '../../domain/repositories/IOrderRepository';import {
  AdminOrderListFilters,
  CancelOrderDTO,
  CloseOrderReturnDTO,
  CreateOrderDTO,
  CreateOrderReturnDTO,
  Order,
  OrderAggregate,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  OrderReturn,
  OrderReturnItem,
  PaginatedResult,
  PaymentStatus,
  ReceiveOrderReturnDTO,
  RefundOrderReturnDTO,
  ReviewOrderReturnDTO,
  TransitionOrderStatusDTO,
  UpdatePaymentStatusDTO,
} from '../../domain/entities/Order';

type SqlExecutor = {
  execute: <T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    values?: any[]
  ) => Promise<[T, any]>;
};

export class OrderRepository implements IOrderRepository {
  // --- HELPERS: GENERATORS ---
  private generateOrderCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  private generateReturnCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RET-${timestamp}-${random}`;
  }

  // --- FINDERS ---
  async findById(orderId: number): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  async findOwnedById(orderId: number, userId: number): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
      [orderId, userId]
    );
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  async findByOrderCode(orderCode: string): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_code = ?',
      [orderCode]
    );
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  // --- ADMIN & LISTS ---
  async findAdminList(filters?: AdminOrderListFilters): Promise<PaginatedResult<OrderListItem>> {
    const page = Math.max(Number(filters?.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters?.limit || 20), 1), 100);
    const offset = (page - 1) * limit;
    const { whereClause, params } = this.buildListWhereClause(filters);

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON u.user_id = o.user_id WHERE 1=1 ${whereClause}`,
      params
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
          (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.order_id) AS item_count,
          (SELECT COUNT(*) FROM order_returns orr WHERE orr.order_id = o.order_id AND orr.status NOT IN ('closed', 'rejected')) AS open_return_count
       FROM orders o LEFT JOIN users u ON u.user_id = o.user_id
       WHERE 1=1 ${whereClause}
       ORDER BY o.order_date DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);
    return {
      items: rows.map((row) => this.mapRowToOrderListItem(row)),
      page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findUserList(userId: number, status?: Order['status'] | 'all'): Promise<OrderListItem[]> {
    const params: any[] = [userId];
    let query = `SELECT o.*,
                 (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.order_id) AS item_count,
                 (SELECT COUNT(*) FROM order_returns orr WHERE orr.order_id = o.order_id AND orr.status NOT IN ('closed', 'rejected')) AS open_return_count,
                 CASE WHEN (SELECT COUNT(*) FROM order_details od3 WHERE od3.order_id = o.order_id) > 0
                      AND (SELECT COUNT(*) FROM order_details od3 WHERE od3.order_id = o.order_id)
                        = (SELECT COUNT(*) FROM reviews pr WHERE pr.order_id = o.order_id AND pr.user_id = o.user_id)
                      THEN 1 ELSE 0 END AS all_reviewed
                 FROM orders o WHERE o.user_id = ?`;
    if (status && status !== 'all') { query += ' AND o.status = ?'; params.push(status); }
    query += ' ORDER BY o.order_date DESC';
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map((row) => this.mapRowToOrderListItem(row));
  }

  // --- AGGREGATES & DETAILS ---
  async findAdminDetail(orderId: number): Promise<OrderAggregate | null> {
    return this.findAggregate({ orderId });
  }

  async findOwnedDetail(orderId: number, userId: number): Promise<OrderAggregate | null> {
    return this.findAggregate({ orderId, userId });
  }

  async getOrderDetails(orderId: number): Promise<OrderDetail[]> {
    return this.getOrderDetailsWithExecutor(pool, orderId);
  }

  async getOrderTimeline(orderId: number): Promise<OrderEvent[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return rows.map((row) => this.mapRowToOrderEvent(row));
  }

  // --- ORDER TRANSACTIONS (CREATE/STATUS/CANCEL) ---
  async create(orderData: CreateOrderDTO): Promise<Order> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();
      const orderCode = this.generateOrderCode();
      const subtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingFee = orderData.shippingFee || 0;

      // Xử lý coupon nếu có
      let discountAmount = 0;
      let couponId: number | null = null;
      let couponCode: string | null = null;

      if (orderData.couponCode) {
        const [couponRows] = await connection.execute<RowDataPacket[]>(
          `SELECT * FROM coupons WHERE code = ? AND is_active = 1
           AND (valid_from IS NULL OR valid_from <= ?)
           AND (valid_to IS NULL OR valid_to >= ?)
           AND (usage_limit IS NULL OR used_count < usage_limit)`,
          [orderData.couponCode, now, now]
        );
        if (couponRows.length > 0) {
          const coupon = couponRows[0];
          if (subtotal >= Number(coupon.min_order_value || 0)) {
            if (coupon.discount_type === 'percentage') {
              discountAmount = subtotal * Number(coupon.discount_value) / 100;
              if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
              }
            } else {
              discountAmount = Number(coupon.discount_value);
            }
            couponId = coupon.coupon_id;
            couponCode = coupon.code;
            // Tăng used_count
            await connection.execute('UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = ?', [couponId]);
          }
        }
      }

      const total = subtotal + shippingFee - discountAmount;

      const depositAmount = (orderData as any).depositAmount || 0;

      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders (order_code, user_id, shipping_name, shipping_phone, shipping_address, shipping_city,
         subtotal, shipping_fee, discount_amount, coupon_id, coupon_code, total, payment_method, payment_status, deposit_amount, status, order_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending', ?, ?)`,
        [orderCode, orderData.userId, orderData.shippingName, orderData.shippingPhone, orderData.shippingAddress,
         orderData.shippingCity, subtotal, shippingFee, discountAmount, couponId, couponCode, total, orderData.paymentMethod, depositAmount, now, now]
      );

      const orderId = orderResult.insertId;

      for (const item of orderData.items) {
        const product = await this.getProductSnapshot(connection, item.productId);
        await this.decrementInventory(connection, item.productId, item.variantId, item.quantity);
        await connection.execute(
          `INSERT INTO order_details (order_id, product_id, variant_id, product_name, price, quantity, subtotal, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.variantId || null, product.name, item.price, item.quantity, item.price * item.quantity, now]
        );
      }

      await this.appendEventWithConnection(connection, {
        orderId, eventType: 'order_created', actorUserId: orderData.userId, actorRole: 'customer', toStatus: 'pending', note: orderData.customerNote
      });

      // Nếu thanh toán bằng ví → trừ wallet_balance và đánh dấu paid ngay
      if (orderData.paymentMethod === 'wallet') {
        const [[walletRow]] = await connection.execute<RowDataPacket[]>(
          'SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE',
          [orderData.userId]
        );
        const walletBalance = Number(walletRow?.wallet_balance ?? 0);
        if (walletBalance < total) {
          await connection.rollback();
          throw new Error(`Số dư ví không đủ (hiện có ${walletBalance.toLocaleString('vi-VN')}đ)`);
        }
        await connection.execute(
          'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
          [total, orderData.userId]
        );
        // Ghi wallet_transaction
        const [wRows] = await connection.execute<RowDataPacket[]>('SELECT wallet_balance FROM users WHERE user_id = ?', [orderData.userId]);
        await connection.execute(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
           VALUES (?, 'payment', ?, ?, 'order', ?, ?, ?)`,
          [orderData.userId, -total, Number((wRows as RowDataPacket[])[0]?.wallet_balance), orderId, `Thanh toán đơn #${orderCode}`, now]
        );
        await connection.execute(
          "UPDATE orders SET payment_status = 'paid', payment_date = ? WHERE order_id = ?",
          [now, orderId]
        );
        await this.appendEventWithConnection(connection, {
          orderId, eventType: 'payment_status_changed', toStatus: 'paid',
          actorUserId: orderData.userId, actorRole: 'customer',
          note: `Thanh toán bằng ví TechMart (${total.toLocaleString('vi-VN')}đ)`,
        });
      }

      // Đặt cọc: trừ deposit_amount từ ví, phần còn lại COD khi nhận hàng
      if (orderData.paymentMethod === 'deposit' && depositAmount > 0) {
        const [[dWalletRow]] = await connection.execute<RowDataPacket[]>(
          'SELECT wallet_balance FROM users WHERE user_id = ? FOR UPDATE',
          [orderData.userId]
        );
        const dBalance = Number(dWalletRow?.wallet_balance ?? 0);
        if (dBalance < depositAmount) {
          await connection.rollback();
          throw new Error(`Số dư ví không đủ để đặt cọc (cần ${depositAmount.toLocaleString('vi-VN')}đ, hiện có ${dBalance.toLocaleString('vi-VN')}đ)`);
        }
        await connection.execute(
          'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
          [depositAmount, orderData.userId]
        );
        // Ghi wallet_transaction cho tiền cọc
        const [dRows] = await connection.execute<RowDataPacket[]>('SELECT wallet_balance FROM users WHERE user_id = ?', [orderData.userId]);
        await connection.execute(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
           VALUES (?, 'payment', ?, ?, 'order', ?, ?, ?)`,
          [orderData.userId, -depositAmount, Number((dRows as RowDataPacket[])[0]?.wallet_balance), orderId, `Đặt cọc đơn #${orderCode} (${depositAmount.toLocaleString('vi-VN')}đ)`, now]
        );
        await this.appendEventWithConnection(connection, {
          orderId, eventType: 'payment_status_changed', toStatus: 'pending',
          actorUserId: orderData.userId, actorRole: 'customer',
          note: `Đặt cọc ${depositAmount.toLocaleString('vi-VN')}đ từ ví, còn lại ${(total - depositAmount).toLocaleString('vi-VN')}đ COD khi nhận`,
        });
      }

      await connection.commit();
      return (await this.findById(orderId))!;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async transitionStatus(input: TransitionOrderStatusDTO): Promise<Order | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);
      if (!order || order.status !== input.currentStatus) { await connection.rollback(); return null; }

      const now = new Date();
      await connection.execute('UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?', [input.nextStatus, now, input.orderId]);
      await this.appendEventWithConnection(connection, {
        orderId: input.orderId, eventType: 'status_changed', fromStatus: input.currentStatus, toStatus: input.nextStatus, actorUserId: input.actorUserId, actorRole: input.actorRole, note: input.note
      });

      // Cập nhật sold_quantity khi đơn hoàn thành
      if (input.nextStatus === 'completed') {
        const details = await this.getOrderDetailsWithExecutor(connection, input.orderId);
        for (const d of details) {
          await connection.execute(
            'UPDATE products SET sold_quantity = sold_quantity + ? WHERE product_id = ?',
            [d.quantity, d.productId]
          );
        }
      }

      await connection.commit();
      return this.findById(input.orderId);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async cancel(input: CancelOrderDTO): Promise<Order | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);
      if (!order || order.status !== input.currentStatus) { await connection.rollback(); return null; }

      const details = await this.getOrderDetailsWithExecutor(connection, input.orderId);
      for (const detail of details) { await this.restoreInventory(connection, detail.productId, detail.variantId, detail.quantity); }

      const now = new Date();

      // Auto-refund: hoàn tiền về ví nếu đơn đã thanh toán (VNPay/Wallet/Online)
      let refundNote = '';
      if (order.paymentStatus === 'paid') {
        const totalRefund = Number(order.total);
        if (totalRefund > 0) {
          await connection.execute(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [totalRefund, order.userId]
          );
          const [userRows] = await connection.execute<RowDataPacket[]>(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [order.userId]
          );
          const newBalance = Number((userRows as RowDataPacket[])[0]?.wallet_balance ?? 0);
          await connection.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
             VALUES (?, 'refund', ?, ?, 'order', ?, ?, ?)`,
            [order.userId, totalRefund, newBalance, input.orderId, `Hoàn tiền hủy đơn #${input.orderId}`, now]
          );
          refundNote = ` | Hoàn ${totalRefund.toLocaleString('vi-VN')}đ vào ví`;
        }
        await connection.execute(
          "UPDATE orders SET status = 'cancelled', payment_status = 'refunded', cancel_reason = ?, updated_at = ? WHERE order_id = ?",
          [input.reason, now, input.orderId]
        );
      } else {
        // Hoàn tiền cọc nếu là đơn đặt cọc (deposit) chưa paid
        const depositAmt = Number((order as any).depositAmount ?? 0);
        if (order.paymentMethod === 'deposit' && depositAmt > 0) {
          await connection.execute(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [depositAmt, order.userId]
          );
          const [dUserRows] = await connection.execute<RowDataPacket[]>(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [order.userId]
          );
          const dNewBalance = Number((dUserRows as RowDataPacket[])[0]?.wallet_balance ?? 0);
          await connection.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
             VALUES (?, 'refund', ?, ?, 'order', ?, ?, ?)`,
            [order.userId, depositAmt, dNewBalance, input.orderId, `Hoàn tiền cọc hủy đơn #${input.orderId}`, now]
          );
          refundNote = ` | Hoàn cọc ${depositAmt.toLocaleString('vi-VN')}đ vào ví`;
        }
        await connection.execute(
          "UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE order_id = ?",
          [input.reason, now, input.orderId]
        );
      }

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId, eventType: 'order_cancelled', actorUserId: input.actorUserId, actorRole: input.actorRole,
        note: (input.reason + refundNote).trim()
      });
      await connection.commit();
      return this.findById(input.orderId);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  // --- STATS ---
  async getStats(startDate?: string, endDate?: string): Promise<OrderStats> {
    // 1. Tổng quan + So sánh tháng trước
    const [[summary]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW()) THEN total ELSE 0 END), 0) AS revenue_this_month,
        COALESCE(SUM(CASE WHEN MONTH(order_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH)) THEN total ELSE 0 END), 0) AS revenue_last_month,
        COALESCE(SUM(CASE WHEN DATE(order_date) = CURDATE() THEN total ELSE 0 END), 0) AS revenue_today,
        COALESCE(SUM(CASE WHEN DATE(order_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN total ELSE 0 END), 0) AS revenue_yesterday,
        SUM(CASE WHEN DATE(order_date) = CURDATE() THEN 1 ELSE 0 END) AS orders_today,
        SUM(CASE WHEN MONTH(order_date) = MONTH(NOW()) AND YEAR(order_date) = YEAR(NOW()) THEN 1 ELSE 0 END) AS orders_this_month,
        SUM(CASE WHEN MONTH(order_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(order_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH)) THEN 1 ELSE 0 END) AS orders_last_month,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders
       FROM orders WHERE deleted_at IS NULL`
    );

    // 2. Đếm theo từng status
    const [statusRows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS cnt FROM orders WHERE deleted_at IS NULL GROUP BY status`
    );
    const ordersByStatus: Record<string, number> = {
      pending: 0, confirmed: 0, shipping: 0, delivered: 0, completed: 0, cancelled: 0, returned: 0,
    };
    for (const r of statusRows) {
      ordersByStatus[r.status] = Number(r.cnt);
    }

    // 3. Đếm theo payment method + doanh thu theo phương thức
    const [pmRows] = await pool.execute<RowDataPacket[]>(
      `SELECT payment_method, COUNT(*) AS cnt, COALESCE(SUM(total), 0) AS revenue
       FROM orders WHERE deleted_at IS NULL GROUP BY payment_method`
    );
    const paymentMethodStats: Record<string, number> = {};
    const paymentMethodRevenue: Record<string, number> = {};
    for (const r of pmRows) {
      paymentMethodStats[r.payment_method] = Number(r.cnt);
      paymentMethodRevenue[r.payment_method] = parseFloat(r.revenue);
    }

    // 4. Đơn hàng mới nhất (10 đơn)
    const [recentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.order_id, o.order_code, o.total, o.status, o.payment_method, o.payment_status, o.order_date,
              o.shipping_name, o.shipping_phone
       FROM orders o WHERE o.deleted_at IS NULL
       ORDER BY o.order_date DESC LIMIT 10`
    );
    const recentOrders = recentRows.map((r: any) => ({
      orderId: r.order_id,
      orderCode: r.order_code,
      totalAmount: parseFloat(r.total),
      status: r.status,
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      shippingName: r.shipping_name,
      shippingPhone: r.shipping_phone,
      createdAt: r.order_date,
    }));

    // 5. Doanh thu theo khoảng ngày (mặc định 7 ngày gần nhất)
    const dateFilter = startDate && endDate
      ? `AND DATE(order_date) BETWEEN ? AND ?`
      : `AND order_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
    const dateParams = startDate && endDate ? [startDate, endDate] : [];

    const [dailyRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(order_date) AS date, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS order_count
       FROM orders WHERE deleted_at IS NULL ${dateFilter}
       GROUP BY DATE(order_date) ORDER BY date ASC`,
      dateParams
    );
    const revenueByDay = dailyRows.map((r: any) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      orderCount: Number(r.order_count),
    }));

    // 6. Thống kê hoàn trả
    const [[returnSummary]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_returns,
        SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) AS pending_returns,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunded_returns
       FROM order_returns`
    );

    // 7. Top khách hàng theo doanh thu tháng này
    const [topCustomerRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.name, u.email, COUNT(o.order_id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent
       FROM orders o JOIN users u ON u.user_id = o.user_id
       WHERE o.deleted_at IS NULL
         AND MONTH(o.order_date) = MONTH(NOW()) AND YEAR(o.order_date) = YEAR(NOW())
         AND o.status NOT IN ('cancelled')
       GROUP BY o.user_id, u.name, u.email
       ORDER BY total_spent DESC LIMIT 5`
    );
    const topCustomers = topCustomerRows.map((r: any) => ({
      name: r.name,
      email: r.email,
      orderCount: Number(r.order_count),
      totalSpent: parseFloat(r.total_spent),
    }));

    const totalOrders = Number(summary.total_orders) || 0;
    const completedOrders = Number(summary.completed_orders) || 0;
    const cancelledOrders = Number(summary.cancelled_orders) || 0;
    const revenueThisMonth = parseFloat(summary.revenue_this_month);
    const revenueLastMonth = parseFloat(summary.revenue_last_month);
    const ordersThisMonth = Number(summary.orders_this_month) || 0;
    const ordersLastMonth = Number(summary.orders_last_month) || 0;

    return {
      totalOrders,
      totalRevenue: parseFloat(summary.total_revenue),
      revenueThisMonth,
      revenueLastMonth,
      revenueToday: parseFloat(summary.revenue_today || 0),
      revenueYesterday: parseFloat(summary.revenue_yesterday || 0),
      ordersToday: Number(summary.orders_today || 0),
      ordersThisMonth,
      ordersLastMonth,
      avgOrderValue: totalOrders > 0 ? parseFloat(summary.total_revenue) / totalOrders : 0,
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      cancellationRate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
      ordersByStatus,
      paymentMethodStats,
      paymentMethodRevenue,
      recentOrders,
      revenueByDay,
      returnStats: {
        total: Number(returnSummary?.total_returns || 0),
        pending: Number(returnSummary?.pending_returns || 0),
        refunded: Number(returnSummary?.refunded_returns || 0),
      },
      topCustomers,
    } as any;
  }

  // --- RETURN LOGIC ---

  async listAllReturns(filters?: { status?: string }): Promise<OrderReturn[]> {
    let sql = `SELECT orr.*, o.order_code, o.total AS order_total, o.payment_method, o.payment_status,
                      u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
               FROM order_returns orr
               JOIN orders o ON o.order_id = orr.order_id
               JOIN users u ON u.user_id = orr.requested_by
               WHERE 1=1`;
    const params: any[] = [];
    if (filters?.status && filters.status !== 'all') {
      sql += ' AND orr.status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY orr.requested_at DESC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows.map((row) => {
      const base = this.mapRowToOrderReturn(row);
      return {
        ...base,
        orderCode: row.order_code,
        orderTotal: Number(row.order_total ?? 0),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
      };
    });
  }

  async listReturns(orderId: number): Promise<OrderReturn[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_returns WHERE order_id = ? ORDER BY requested_at DESC',
      [orderId]
    );
    return rows.map(this.mapRowToOrderReturn);
  }

  async getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_returns WHERE order_return_id = ? AND order_id = ?',
      [orderReturnId, orderId]
    );
    if (rows.length === 0) return null;
    const orderReturn = this.mapRowToOrderReturn(rows[0]);

    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ori.*, od.product_id, od.product_name, od.price
       FROM order_return_items ori
       JOIN order_details od ON od.order_detail_id = ori.order_detail_id
       WHERE ori.order_return_id = ?`,
      [orderReturnId]
    );
    orderReturn.items = itemRows.map(this.mapRowToOrderReturnItem);
    return orderReturn;
  }

  async createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();
      const requestCode = this.generateReturnCode();

      const evidenceJson = input.evidenceImages?.length
        ? JSON.stringify(input.evidenceImages)
        : null;

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO order_returns (order_id, request_code, requested_by, status, reason, customer_note, evidence_images, requested_at, updated_at)
         VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
        [input.orderId, requestCode, input.requestedBy, input.reason, input.customerNote || null, evidenceJson, now, now]
      );
      const orderReturnId = result.insertId;

      for (const item of input.items) {
        await connection.execute(
          `INSERT INTO order_return_items (order_return_id, order_detail_id, quantity, reason, restock_action, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderReturnId, item.orderDetailId, item.quantity, item.reason || null, item.restockAction || 'inspect', now]
        );
      }

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_requested',
        toStatus: 'requested',
        actorUserId: input.requestedBy,
        actorRole: 'customer',
        note: input.reason,
      });

      await connection.commit();
      const created = await this.getReturnById(input.orderId, orderReturnId);
      return created!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async reviewReturn(input: ReviewOrderReturnDTO): Promise<OrderReturn | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();
      const isApproved = input.decision === 'approved';

      const timestampCol = isApproved ? 'approved_at' : 'rejected_at';
      await connection.execute(
        `UPDATE order_returns SET status = ?, ${timestampCol} = ?, admin_note = ?, updated_at = ?
         WHERE order_return_id = ? AND order_id = ? AND status = 'requested'`,
        [input.decision, now, input.adminNote || null, now, input.orderReturnId, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: isApproved ? 'return_approved' : 'return_rejected',
        toStatus: input.decision,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
      });

      await connection.commit();
      return this.getReturnById(input.orderId, input.orderReturnId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async receiveReturn(input: ReceiveOrderReturnDTO): Promise<OrderReturn | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();

      await connection.execute(
        `UPDATE order_returns SET status = 'received', received_at = ?, admin_note = ?, updated_at = ?
         WHERE order_return_id = ? AND order_id = ? AND status = 'approved'`,
        [now, input.adminNote || null, now, input.orderReturnId, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_received',
        toStatus: 'received',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
      });

      await connection.commit();
      return this.getReturnById(input.orderId, input.orderReturnId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async refundReturn(input: RefundOrderReturnDTO): Promise<OrderReturn | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();

      // Tính tổng tiền hoàn dựa trên sản phẩm trong phiếu trả
      const [itemRows] = await connection.execute<RowDataPacket[]>(
        `SELECT ori.order_detail_id, ori.quantity, ori.restock_action,
                od.price, od.product_id, od.variant_id
         FROM order_return_items ori
         JOIN order_details od ON od.order_detail_id = ori.order_detail_id
         WHERE ori.order_return_id = ?`,
        [input.orderReturnId]
      );
      const refundAmount = (itemRows as RowDataPacket[]).reduce(
        (sum, row) => sum + Number(row.price) * Number(row.quantity), 0
      );

      // Lấy userId và payment_status từ phiếu trả + đơn hàng
      const [retRows] = await connection.execute<RowDataPacket[]>(
        'SELECT requested_by FROM order_returns WHERE order_return_id = ?',
        [input.orderReturnId]
      );
      const userId = retRows[0]?.requested_by;

      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT payment_status, payment_method FROM orders WHERE order_id = ?',
        [input.orderId]
      );
      const paymentStatus = orderRows[0]?.payment_status;
      const paymentMethod = orderRows[0]?.payment_method;

      // Chỉ hoàn tiền vào ví khi payment_status === 'paid'
      // COD chưa xác nhận thanh toán (pending) = khách chưa trả tiền → không hoàn
      // Admin cần bấm "Đã thanh toán" trước khi duyệt hoàn trả nếu khách COD đã trả tiền mặt
      let refundNote = '';
      if (userId && refundAmount > 0 && paymentStatus === 'paid') {
        // Cộng tiền về ví khách
        await connection.execute(
          'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
          [refundAmount, userId]
        );
        // Ghi lịch sử giao dịch ví
        const [walletRows] = await connection.execute<RowDataPacket[]>(
          'SELECT wallet_balance FROM users WHERE user_id = ?',
          [userId]
        );
        const newBalance = Number((walletRows as RowDataPacket[])[0]?.wallet_balance ?? 0);
        await connection.execute(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, note, created_at)
           VALUES (?, 'refund', ?, ?, 'order_return', ?, ?, ?)`,
          [userId, refundAmount, newBalance, input.orderReturnId, `Hoàn tiền trả hàng đơn #${input.orderId}`, now]
        );
        refundNote = `Hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví`;
      } else if (paymentStatus !== 'paid') {
        refundNote = `Đơn ${paymentMethod?.toUpperCase()} chưa thanh toán — không hoàn tiền vào ví`;
      }

      // Fix #5: Hoàn kho theo restockAction
      for (const row of itemRows as RowDataPacket[]) {
        if (row.restock_action === 'restock' || row.restock_action === 'inspect') {
          if (row.variant_id) {
            await connection.execute(
              'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE variant_id = ?',
              [row.quantity, row.variant_id]
            );
          }
          await connection.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
            [row.quantity, row.product_id]
          );
        }
        // 'discard' → không cộng lại kho
      }

      await connection.execute(
        `UPDATE order_returns SET status = 'refunded', refunded_at = ?, admin_note = ?, updated_at = ?
         WHERE order_return_id = ? AND order_id = ? AND status = 'received'`,
        [now, input.adminNote || null, now, input.orderReturnId, input.orderId]
      );

      // Cập nhật trạng thái đơn hàng → returned
      const newPaymentStatus = paymentStatus === 'paid' ? 'refunded' : paymentStatus;
      await connection.execute(
        `UPDATE orders SET status = 'returned', payment_status = ?, updated_at = ? WHERE order_id = ?`,
        [newPaymentStatus, now, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_refunded',
        toStatus: 'refunded',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote || refundNote,
      });

      await connection.commit();
      return this.getReturnById(input.orderId, input.orderReturnId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async closeReturn(input: CloseOrderReturnDTO): Promise<OrderReturn | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();

      await connection.execute(
        `UPDATE order_returns SET status = 'closed', closed_at = ?, admin_note = ?, updated_at = ?
         WHERE order_return_id = ? AND order_id = ?`,
        [now, input.adminNote || null, now, input.orderReturnId, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_closed',
        toStatus: 'closed',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
      });

      await connection.commit();
      return this.getReturnById(input.orderId, input.orderReturnId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async updatePaymentStatus(input: UpdatePaymentStatusDTO): Promise<Order | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const order = await this.findOrderForUpdate(connection, input.orderId);
      if (!order || order.paymentStatus !== input.currentStatus) {
        await connection.rollback();
        return null;
      }

      const now = new Date();
      await connection.execute(
        'UPDATE orders SET payment_status = ?, updated_at = ? WHERE order_id = ?',
        [input.nextStatus, now, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'payment_status_changed',
        toStatus: input.nextStatus,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.note,
      });

      await connection.commit();
      return this.findById(input.orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --- PRIVATE DB HELPERS ---
  private async getProductSnapshot(executor: SqlExecutor, id: number) {
    const [rows] = await executor.execute<RowDataPacket[]>('SELECT name FROM products WHERE product_id = ?', [id]);
    return rows[0];
  }

  private async decrementInventory(executor: SqlExecutor, pid: number, vid: number | undefined, qty: number) {
    await executor.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?', [qty, pid, qty]);
  }

  private async restoreInventory(executor: SqlExecutor, pid: number, vid: number | undefined, qty: number) {
    await executor.execute('UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [qty, pid]);
  }

  private async findOrderForUpdate(connection: PoolConnection, id: number) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [id]);
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  private async appendEventWithConnection(connection: PoolConnection, input: any) {
    await connection.execute('INSERT INTO order_events (order_id, event_type, to_status, actor_user_id, actor_role, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [input.orderId, input.eventType, input.toStatus || null, input.actorUserId, input.actorRole, input.note || null, new Date()]);
  }

  private async findAggregate(options: { orderId: number; userId?: number }): Promise<OrderAggregate | null> {
    let order: Order | null;
    if (options.userId) {
      order = await this.findOwnedById(options.orderId, options.userId);
    } else {
      order = await this.findById(options.orderId);
    }
    if (!order) return null;
    const [items, returns] = await Promise.all([
      this.getOrderDetails(order.orderId),
      this.listReturns(order.orderId),
    ]);
    return { order, items, timeline: [], returns };
  }

  private async getOrderDetailsWithExecutor(executor: SqlExecutor, id: number): Promise<OrderDetail[]> {
    const [rows] = await executor.execute<RowDataPacket[]>(
      `SELECT od.*, p.main_image AS product_image
       FROM order_details od
       LEFT JOIN products p ON od.product_id = p.product_id
       WHERE od.order_id = ?`,
      [id]
    );
    return rows.map(this.mapRowToOrderDetail);
  }

  private buildListWhereClause(filters?: AdminOrderListFilters) {
    let whereClause = ''; const params: any[] = [];
    if (filters?.search) {
      whereClause += ` AND (o.order_code LIKE ? OR o.shipping_name LIKE ? OR u.phone LIKE ?
        OR EXISTS (SELECT 1 FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id AND p.name LIKE ?))`;
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') { whereClause += ' AND o.status = ?'; params.push(filters.status); }
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') { whereClause += ' AND o.payment_status = ?'; params.push(filters.paymentStatus); }
    return { whereClause, params };
  }

  // --- MAPPERS ---
  private mapRowToOrder(row: any): Order {
    return {
      orderId: row.order_id, orderCode: row.order_code, userId: row.user_id,
      shippingName: row.shipping_name, shippingPhone: row.shipping_phone, shippingAddress: row.shipping_address,
      shippingCity: row.shipping_city, subtotal: Number(row.subtotal), shippingFee: Number(row.shipping_fee),
      discountAmount: Number(row.discount_amount), total: Number(row.total), paymentMethod: row.payment_method,
      paymentStatus: row.payment_status, paymentDate: row.payment_date, depositAmount: Number(row.deposit_amount ?? 0),
      status: row.status, orderDate: row.order_date, deliveredAt: row.delivered_at, updatedAt: row.updated_at
    };
  }

  private mapRowToOrderListItem(row: any): OrderListItem {
    return {
      ...this.mapRowToOrder(row),
      customerName: row.customer_name,
      itemCount: Number(row.item_count),
      openReturnCount: Number(row.open_return_count),
      allReviewed: !!row.all_reviewed,
    };
  }

  private mapRowToOrderDetail(row: any): OrderDetail {
    return {
      orderDetailId: row.order_detail_id, orderId: row.order_id, productId: row.product_id,
      productName: row.product_name, variantName: row.variant_name || '', productImage: row.product_image || '',
      price: Number(row.price), quantity: Number(row.quantity),
      subtotal: Number(row.subtotal), createdAt: row.created_at
    };
  }

  private mapRowToOrderEvent(row: any): OrderEvent {
    return { orderEventId: row.order_event_id, orderId: row.order_id, eventType: row.event_type, createdAt: row.created_at };
  }

  private mapRowToOrderReturn(row: any): OrderReturn {
    let evidenceImages: string[] | undefined;
    if (row.evidence_images) {
      try {
        evidenceImages = typeof row.evidence_images === 'string'
          ? JSON.parse(row.evidence_images)
          : row.evidence_images;
      } catch { evidenceImages = undefined; }
    }
    return {
      orderReturnId: row.order_return_id,
      orderId:       row.order_id,
      requestCode:   row.request_code,
      requestedBy:   row.requested_by,
      status:        row.status,
      reason:        row.reason,
      customerNote:  row.customer_note ?? undefined,
      adminNote:     row.admin_note ?? undefined,
      evidenceImages,
      requestedAt:   row.requested_at,
      approvedAt:    row.approved_at ?? undefined,
      rejectedAt:    row.rejected_at ?? undefined,
      receivedAt:    row.received_at ?? undefined,
      refundedAt:    row.refunded_at ?? undefined,
      closedAt:      row.closed_at ?? undefined,
      updatedAt:     row.updated_at,
    };
  }

  private mapRowToOrderReturnItem(row: any): OrderReturnItem {
    return {
      orderReturnItemId: row.order_return_item_id,
      orderReturnId:     row.order_return_id,
      orderDetailId:     row.order_detail_id,
      productId:         row.product_id,
      variantId:         row.variant_id ?? undefined,
      productName:       row.product_name ?? undefined,
      quantity:          Number(row.quantity),
      reason:            row.reason ?? undefined,
      restockAction:     row.restock_action ?? 'inspect',
      createdAt:         row.created_at,
    };
  }
}