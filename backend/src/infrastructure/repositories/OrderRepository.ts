import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../database/connection';
import { IOrderRepository, OrderStats } from '../../domain/repositories/IOrderRepository';
import {
  AdminOrderListFilters,
  CancelOrderDTO,
  CloseOrderReturnDTO,
  CreateOrderDTO,
  CreateOrderReturnDTO,
  Order,
  OrderAggregate,
  OrderCustomerSnapshot,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  OrderReturn,
  OrderReturnItem,
  PaginatedResult,
  ReceiveOrderReturnDTO,
  RefundOrderReturnDTO,
  ReviewOrderReturnDTO,
  TransitionOrderStatusDTO,
  UpdatePaymentStatusDTO,
} from '../../domain/entities/Order';

type SqlExecutor = {
  execute: <T = any>(...args: any[]) => Promise<[T, any]>;
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

  private maskAccountNumber(accountNumber?: string | null): string | undefined {
    if (!accountNumber) return undefined;
    const normalized = String(accountNumber);
    if (normalized.length <= 4) return normalized;
    return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
  }

  private buildCancellationNotificationMessage(orderCode: string, reason: string, refundMessage?: string) {
    return [
      `Đơn hàng #${orderCode} đã bị hủy.`,
      `Lý do: ${reason}.`,
      refundMessage,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private async createNotificationWithConnection(
    connection: PoolConnection,
    input: {
      userId: number;
      title: string;
      message: string;
      type: 'order' | 'promotion' | 'system' | 'review';
      referenceId?: number;
      createdAt: Date;
    }
  ) {
    await connection.execute(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.title,
        input.message,
        input.type,
        input.referenceId ?? null,
        input.createdAt,
      ]
    );
  }

  private async getLinkedBankSnapshot(
    executor: SqlExecutor,
    userId: number
  ): Promise<{
    refundBankAccountId: number;
    refundBankCode: string;
    refundBankName: string;
    refundAccountNumber: string;
    refundAccountHolderName: string;
    refundBranchName: string;
  } | null> {
    const [rows] = await executor.execute(
      `SELECT bank_account_id, bank_code, bank_name, account_number, account_holder_name, branch_name
       FROM user_bank_accounts
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const bankRows = rows as RowDataPacket[];
    if (!bankRows.length) return null;

    const row = bankRows[0];
    return {
      refundBankAccountId: Number(row.bank_account_id),
      refundBankCode: row.bank_code,
      refundBankName: row.bank_name,
      refundAccountNumber: row.account_number,
      refundAccountHolderName: row.account_holder_name,
      refundBranchName: row.branch_name,
    };
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

  async findGuestDetailByCode(orderCode: string, email: string): Promise<OrderAggregate | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM orders
       WHERE order_code = ?
         AND user_id IS NULL
         AND LOWER(TRIM(customer_email)) = LOWER(TRIM(?))
       LIMIT 1`,
      [orderCode, email]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.findAggregate({ orderId: Number(rows[0].order_id) });
  }

  async findGuestByCode(orderCode: string, email: string): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM orders
       WHERE order_code = ?
         AND user_id IS NULL
         AND LOWER(TRIM(customer_email)) = LOWER(TRIM(?))
       LIMIT 1`,
      [orderCode, email]
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
      `SELECT o.*,
          COALESCE(o.customer_name, u.name, o.shipping_name) AS customer_name,
          COALESCE(o.customer_email, u.email) AS customer_email,
          COALESCE(o.customer_phone, u.phone, o.shipping_phone) AS customer_phone,
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
      `SELECT oe.*, u.name AS actor_name, u.email AS actor_email
       FROM order_events oe
       LEFT JOIN users u ON u.user_id = oe.actor_user_id
       WHERE oe.order_id = ?
       ORDER BY oe.created_at ASC`,
      [orderId]
    );
    return rows.map((row) => this.mapRowToOrderEvent(row));
  }

  // --- ORDER TRANSACTIONS (CREATE/STATUS/CANCEL) ---
  async create(orderData: CreateOrderDTO): Promise<Order> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // ── Atomic stock check: FOR UPDATE lock chặn race condition ──
      for (const item of orderData.items) {
        const [productRows] = await connection.execute<RowDataPacket[]>(
          `SELECT p.name, p.stock_quantity,
                  COALESCE((
                    SELECT SUM(od.quantity) FROM order_details od
                    JOIN orders o ON o.order_id = od.order_id
                    WHERE od.product_id = p.product_id
                      AND o.deleted_at IS NULL
                      AND o.status IN ('pending','confirmed','processing','shipping')
                  ), 0) AS reserved
           FROM products p
           WHERE p.product_id = ? AND p.deleted_at IS NULL
           FOR UPDATE`,
          [item.productId]
        );
        if (!productRows[0]) throw new Error(`Sản phẩm mã ${item.productId} không tồn tại`);
        const availableProduct = Number(productRows[0].stock_quantity) - Number(productRows[0].reserved);
        if (availableProduct < item.quantity) {
          throw new Error(`Sản phẩm ${productRows[0].name} đã hết hàng hoặc không đủ số lượng (còn ${availableProduct})`);
        }

        if (item.variantId) {
          const [variantRows] = await connection.execute<RowDataPacket[]>(
            `SELECT pv.variant_name, pv.stock_quantity,
                    COALESCE((
                      SELECT SUM(od.quantity) FROM order_details od
                      JOIN orders o ON o.order_id = od.order_id
                      WHERE od.variant_id = pv.variant_id
                        AND o.deleted_at IS NULL
                        AND o.status IN ('pending','confirmed','processing','shipping')
                    ), 0) AS reserved
             FROM product_variants pv
             WHERE pv.variant_id = ? AND pv.product_id = ?
             FOR UPDATE`,
            [item.variantId, item.productId]
          );
          if (!variantRows[0]) throw new Error(`Phiên bản sản phẩm ${item.variantId} không khả dụng`);
          const availableVariant = Number(variantRows[0].stock_quantity) - Number(variantRows[0].reserved);
          if (availableVariant < item.quantity) {
            throw new Error(`Kho không đủ máy ${variantRows[0].variant_name} (Còn ${availableVariant})`);
          }
        }
      }

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

      const codAmount = orderData.paymentMethod === 'cod' ? total : 0;

      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders (
          order_code, user_id, customer_name, customer_email, customer_phone,
          shipping_name, shipping_phone, shipping_address, shipping_city,
          subtotal, shipping_fee, discount_amount, coupon_id, coupon_code, total,
          payment_method, payment_status, deposit_amount, cod_amount, status, order_date, updated_at
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'pending', ?, ?)`,
        [
          orderCode,
          orderData.userId ?? null,
          orderData.customerName ?? orderData.shippingName,
          orderData.customerEmail,
          orderData.customerPhone ?? orderData.shippingPhone,
          orderData.shippingName,
          orderData.shippingPhone,
          orderData.shippingAddress,
          orderData.shippingCity,
          subtotal,
          shippingFee,
          discountAmount,
          couponId,
          couponCode,
          total,
          orderData.paymentMethod,
          depositAmount,
          codAmount,
          now,
          now,
        ]
      );

      const orderId = orderResult.insertId;

      for (const item of orderData.items) {
        const product = await this.getProductSnapshot(
          connection,
          item.productId,
          item.variantId
        );
        await connection.execute(
          `INSERT INTO order_details (
            order_id, product_id, variant_id, product_name, variant_name, sku,
            price, quantity, subtotal, created_at
          )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.variantId || null,
            product.name,
            product.variantName || null,
            product.sku || null,
            item.price,
            item.quantity,
            item.price * item.quantity,
            now,
          ]
        );
      }

      await this.appendEventWithConnection(connection, {
        orderId,
        eventType: 'order_created',
        actorUserId: orderData.userId ?? null,
        actorRole: 'customer',
        toStatus: 'pending',
        note: orderData.customerNote
      });

      // Nếu thanh toán bằng ví → trừ wallet_balance và đánh dấu paid ngay
      if (orderData.paymentMethod === 'wallet' && orderData.userId) {
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
      if (orderData.paymentMethod === 'deposit' && depositAmount > 0 && orderData.userId) {
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
      if (input.nextStatus === 'delivered') {
        await connection.execute(
          'UPDATE orders SET status = ?, delivered_at = ?, updated_at = ? WHERE order_id = ?',
          [input.nextStatus, now, now, input.orderId]
        );
      } else if (input.nextStatus === 'shipping' && input.shipperId !== undefined) {
        await connection.execute(
          'UPDATE orders SET status = ?, shipper_id = ?, updated_at = ? WHERE order_id = ?',
          [input.nextStatus, input.shipperId, now, input.orderId]
        );
        // Auto-sync payment record cho đơn COD
        if (input.shipperId !== null) {
          await connection.execute(`
            INSERT INTO payments (order_id, method, amount, status, shipper_id)
            SELECT order_id, 'cod', cod_amount, 'pending', ?
            FROM orders WHERE order_id = ? AND payment_method = 'cod' AND cod_amount > 0
            ON DUPLICATE KEY UPDATE shipper_id = VALUES(shipper_id)
          `, [input.shipperId, input.orderId]);
        }
      } else {
        await connection.execute(
          'UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?',
          [input.nextStatus, now, input.orderId]
        );
      }
      await this.appendEventWithConnection(connection, {
        orderId: input.orderId, eventType: 'status_changed', fromStatus: input.currentStatus, toStatus: input.nextStatus, actorUserId: input.actorUserId, actorRole: input.actorRole, note: input.note
      });

      if (input.nextStatus === 'delivered') {
        const details = await this.getOrderDetailsWithExecutor(connection, input.orderId);
        for (const detail of details) {
          await this.exportInventory(
            connection,
            detail.productId,
            detail.variantId,
            detail.quantity,
            input.orderId,
            input.actorUserId,
            input.note || 'Xuất kho khi đơn hàng giao thành công'
          );
        }
      }

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

  async assignShipper(orderId: number, shipperId: number | null): Promise<Order | null> {
    await pool.query(
      'UPDATE orders SET shipper_id = ?, updated_at = NOW() WHERE order_id = ?',
      [shipperId, orderId]
    );
    // Nếu gán shipper cho đơn COD → tạo payment record nếu chưa có
    if (shipperId !== null) {
      await pool.query(`
        INSERT INTO payments (order_id, method, amount, status, shipper_id)
        SELECT order_id, 'cod', cod_amount, 'pending', ?
        FROM orders
        WHERE order_id = ? AND payment_method = 'cod' AND cod_amount > 0
        ON DUPLICATE KEY UPDATE shipper_id = VALUES(shipper_id)
      `, [shipperId, orderId]);
    }
    return this.findById(orderId);
  }

  async reassignShipper(orderId: number, newShipperId: number): Promise<Order | null> {
    await pool.query(
      `UPDATE orders
       SET shipper_id = ?,
           delivery_status = 'WAITING_PICKUP',
           status = 'shipping',
           attempt_count = 0,
           updated_at = NOW()
       WHERE order_id = ?
         AND delivery_status NOT IN ('PICKED_UP', 'IN_DELIVERY')`,
      [newShipperId, orderId]
    );
    return this.findById(orderId);
  }

  async confirmAndAssignShipper(orderId: number, shipperId: number, actorUserId: number): Promise<Order | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock row để tránh race condition
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT order_id, status, payment_method, cod_amount FROM orders WHERE order_id = ? FOR UPDATE`,
        [orderId]
      );
      const order = rows[0];
      if (!order || order.status !== 'pending') {
        await connection.rollback();
        return null;
      }

      // Confirm + assign shipper + set delivery_status trong 1 câu
      await connection.execute(
        `UPDATE orders SET
           status          = 'shipping',
           delivery_status = 'WAITING_PICKUP',
           shipper_id      = ?,
           updated_at      = NOW()
         WHERE order_id = ?`,
        [shipperId, orderId]
      );

      // Tạo payment record COD nếu chưa có
      if (order.payment_method === 'cod' && order.cod_amount > 0) {
        await connection.execute(`
          INSERT INTO payments (order_id, method, amount, status, shipper_id)
          VALUES (?, 'cod', ?, 'pending', ?)
          ON DUPLICATE KEY UPDATE shipper_id = VALUES(shipper_id)
        `, [orderId, order.cod_amount, shipperId]);
      }

      // Log sự kiện vào order_events
      await connection.execute(`
        INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_user_id, actor_role, note)
        VALUES (?, 'status_changed', 'pending', 'shipping', ?, 'admin', 'Admin xác nhận và phân công shipper')
      `, [orderId, actorUserId]);

      await connection.commit();
      return this.findById(orderId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async logEvent(orderId: number, actorUserId: number, actorRole: string, eventType: string, fromStatus: string, toStatus: string, note: string): Promise<void> {
    await pool.query(
      `INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_user_id, actor_role, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, eventType, fromStatus, toStatus, actorUserId, actorRole, note]
    );
  }

  async updateWarehouseReceivedAt(orderId: number, condition: 'good' | 'defective'): Promise<void> {
    await pool.query(
      `UPDATE orders SET warehouse_received_at = NOW(), warehouse_condition = ? WHERE order_id = ? AND warehouse_received_at IS NULL`,
      [condition, orderId]
    );
  }

  async restockForWarehouseReceipt(orderId: number, adminId: number): Promise<void> {
    const details = await this.getOrderDetails(orderId);
    for (const detail of details) {
      if (detail.variantId) {
        await pool.execute(
          'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE variant_id = ?',
          [detail.quantity, detail.variantId]
        );
      }
      await pool.execute(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
        [detail.quantity, detail.productId]
      );
      await this.appendInventoryTransaction(pool, {
        productId: detail.productId,
        variantId: detail.variantId,
        transactionType: 'return',
        quantity: detail.quantity,
        referenceType: 'order',
        referenceId: orderId,
        notes: 'Nhập kho hàng hoàn - tình trạng tốt',
        createdBy: adminId,
      });
    }
  }

  async cancel(input: CancelOrderDTO): Promise<Order | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);
      if (!order || order.status !== input.currentStatus) { await connection.rollback(); return null; }

      const now = new Date();

      // Auto-refund: hoàn tiền về ví nếu đơn đã thanh toán (VNPay/Wallet/Online)
      let refundNote = '';
      let refundNotificationMessage: string | undefined;
      if (order.paymentStatus === 'paid') {
        const totalRefund = Number(order.total);
        if (totalRefund > 0 && order.userId) {
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
          refundNotificationMessage = `Số tiền ${totalRefund.toLocaleString('vi-VN')}đ đã được hoàn vào ví TechMart của bạn.`;
        }
        await connection.execute(
          "UPDATE orders SET status = 'cancelled', payment_status = 'refunded', cancel_reason = ?, cancelled_at = ?, updated_at = ? WHERE order_id = ?",
          [input.reason, now, now, input.orderId]
        );
      } else {
        // Hoàn tiền cọc nếu là đơn đặt cọc (deposit) chưa paid
        const depositAmt = Number((order as any).depositAmount ?? 0);
        if (order.paymentMethod === 'deposit' && depositAmt > 0 && order.userId) {
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
          refundNotificationMessage = `Tiền cọc ${depositAmt.toLocaleString('vi-VN')}đ đã được hoàn vào ví TechMart của bạn.`;
        }
        await connection.execute(
          "UPDATE orders SET status = 'cancelled', cancel_reason = ?, cancelled_at = ?, updated_at = ? WHERE order_id = ?",
          [input.reason, now, now, input.orderId]
        );
      }

      if (input.actorRole !== 'customer' && order.userId) {
        await this.createNotificationWithConnection(connection, {
          userId: order.userId,
          title: `Đơn hàng #${order.orderCode} đã bị hủy`,
          message: this.buildCancellationNotificationMessage(
            order.orderCode,
            input.reason,
            refundNotificationMessage
          ),
          type: 'order',
          referenceId: input.orderId,
          createdAt: now,
        });
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
                      COALESCE(u.name, o.customer_name, o.shipping_name) AS customer_name,
                      COALESCE(u.email, o.customer_email) AS customer_email,
                      COALESCE(u.phone, o.customer_phone, o.shipping_phone) AS customer_phone
               FROM order_returns orr
               JOIN orders o ON o.order_id = orr.order_id
               LEFT JOIN users u ON u.user_id = orr.requested_by
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
    const returns = rows.map((row) => this.mapRowToOrderReturn(row));

    if (returns.length === 0) return returns;

    const returnIds = returns.map((r) => r.orderReturnId);
    const placeholders = returnIds.map(() => '?').join(', ');
    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ori.order_return_id, ori.order_return_item_id, ori.order_detail_id,
              ori.quantity, ori.reason, ori.restock_action, ori.created_at,
              od.product_id, od.variant_id, od.product_name,
              COALESCE(od.variant_name, pv.variant_name) AS resolved_variant_name,
              COALESCE(od.sku, pv.sku, p.sku) AS resolved_sku
       FROM order_return_items ori
       JOIN order_details od ON od.order_detail_id = ori.order_detail_id
       LEFT JOIN product_variants pv ON od.variant_id = pv.variant_id
       LEFT JOIN products p ON od.product_id = p.product_id
       WHERE ori.order_return_id IN (${placeholders})`,
      returnIds
    );

    const itemsByReturnId = new Map<number, any[]>();
    for (const row of itemRows as any[]) {
      const rid = Number(row.order_return_id);
      if (!itemsByReturnId.has(rid)) itemsByReturnId.set(rid, []);
      itemsByReturnId.get(rid)!.push(row);
    }

    for (const ret of returns) {
      ret.items = (itemsByReturnId.get(ret.orderReturnId) ?? []).map((row) =>
        this.mapRowToOrderReturnItem(row)
      );
    }

    return returns;
  }

  async getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_returns WHERE order_return_id = ? AND order_id = ?',
      [orderReturnId, orderId]
    );
    if (rows.length === 0) return null;
    const orderReturn = this.mapRowToOrderReturn(rows[0]);

    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
          ori.*,
          od.product_id,
          od.variant_id,
          od.product_name,
          od.price,
          COALESCE(od.variant_name, pv.variant_name) AS resolved_variant_name,
          COALESCE(od.sku, pv.sku, p.sku) AS resolved_sku
       FROM order_return_items ori
       JOIN order_details od ON od.order_detail_id = ori.order_detail_id
       LEFT JOIN product_variants pv ON od.variant_id = pv.variant_id
       LEFT JOIN products p ON od.product_id = p.product_id
       WHERE ori.order_return_id = ?`,
      [orderReturnId]
    );
    orderReturn.items = itemRows.map((row) => this.mapRowToOrderReturnItem(row));
    return orderReturn;
  }

  async createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();
      const requestCode = this.generateReturnCode();
      const refundDestination = input.refundDestination === 'bank_account' ? 'bank_account' : 'wallet';

      const evidenceJson = input.evidenceImages?.length
        ? JSON.stringify(input.evidenceImages)
        : null;

      let refundBankSnapshot: Awaited<ReturnType<OrderRepository['getLinkedBankSnapshot']>> = null;
      if (refundDestination === 'bank_account') {
        if (!input.requestedBy) {
          throw new Error('Chỉ tài khoản đã đăng nhập mới có thể chọn hoàn tiền về ngân hàng');
        }

        refundBankSnapshot = await this.getLinkedBankSnapshot(connection, input.requestedBy);
        if (!refundBankSnapshot) {
          throw new Error('Bạn chưa liên kết tài khoản ngân hàng với ví TechMart');
        }
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO order_returns (
            order_id, request_code, requested_by, refund_destination,
            refund_bank_account_id, refund_bank_code, refund_bank_name, refund_account_number,
            refund_account_holder_name, refund_branch_name,
            status, reason, customer_note, evidence_images, requested_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
        [
          input.orderId,
          requestCode,
          input.requestedBy,
          refundDestination,
          refundBankSnapshot?.refundBankAccountId ?? null,
          refundBankSnapshot?.refundBankCode ?? null,
          refundBankSnapshot?.refundBankName ?? null,
          refundBankSnapshot?.refundAccountNumber ?? null,
          refundBankSnapshot?.refundAccountHolderName ?? null,
          refundBankSnapshot?.refundBranchName ?? null,
          input.reason,
          input.customerNote || null,
          evidenceJson,
          now,
          now,
        ]
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
        note:
          refundDestination === 'bank_account'
            ? `${input.reason} | Hoàn tiền về tài khoản ngân hàng liên kết`
            : `${input.reason} | Hoàn tiền về ví TechMart`,
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
      const [updateResult] = await connection.execute<ResultSetHeader>(
        `UPDATE order_returns SET status = 'received', received_at = ?, admin_note = ?, updated_at = ?
         WHERE order_return_id = ? AND order_id = ? AND status = 'approved'`,
        [now, input.adminNote || null, now, input.orderReturnId, input.orderId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return null;
      }

      const [itemRows] = await connection.execute<RowDataPacket[]>(
        `SELECT ori.quantity, ori.restock_action, od.product_id, od.variant_id
         FROM order_return_items ori
         JOIN order_details od ON od.order_detail_id = ori.order_detail_id
         WHERE ori.order_return_id = ?`,
        [input.orderReturnId]
      );

      for (const row of itemRows) {
        if (!['restock', 'inspect'].includes(String(row.restock_action))) {
          continue;
        }

        await this.restockInventory(
          connection,
          Number(row.product_id),
          row.variant_id != null ? Number(row.variant_id) : undefined,
          Number(row.quantity),
          input.orderReturnId,
          input.actorUserId,
          input.adminNote || 'Nhập kho khi nhận lại hàng hoàn'
        );
      }

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
        `SELECT requested_by, request_code, refund_destination, refund_bank_name,
                refund_account_number, refund_account_holder_name, refund_branch_name
         FROM order_returns
         WHERE order_return_id = ?`,
        [input.orderReturnId]
      );
      const userId = retRows[0]?.requested_by;
      const requestCode = retRows[0]?.request_code ?? `RET-${input.orderReturnId}`;
      const refundDestination = retRows[0]?.refund_destination === 'bank_account' ? 'bank_account' : 'wallet';
      const refundBankName = retRows[0]?.refund_bank_name ?? null;
      const refundAccountNumber = retRows[0]?.refund_account_number ?? null;
      const refundAccountHolderName = retRows[0]?.refund_account_holder_name ?? null;
      const refundBranchName = retRows[0]?.refund_branch_name ?? null;

      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT payment_status, payment_method FROM orders WHERE order_id = ?',
        [input.orderId]
      );
      const paymentStatus = orderRows[0]?.payment_status;
      const paymentMethod = orderRows[0]?.payment_method;
      const shouldRequireReceipt =
        refundDestination === 'bank_account' &&
        refundAmount > 0 &&
        paymentStatus === 'paid';

      if (shouldRequireReceipt && !input.receiptImageUrl) {
        throw new Error('Vui lòng tải lên ảnh biên lai chuyển khoản trước khi xác nhận hoàn tiền');
      }

      // Chỉ hoàn tiền vào ví khi payment_status === 'paid'
      // COD chưa xác nhận thanh toán (pending) = khách chưa trả tiền → không hoàn
      // Admin cần bấm "Đã thanh toán" trước khi duyệt hoàn trả nếu khách COD đã trả tiền mặt
      let refundNote = '';
      if (refundDestination === 'wallet' && userId && refundAmount > 0 && paymentStatus === 'paid') {
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
      } else if (refundDestination === 'bank_account' && refundAmount > 0 && paymentStatus === 'paid') {
        const bankSummaryParts = [
          refundBankName,
          refundAccountHolderName,
          refundBranchName,
        ].filter(Boolean);
        refundNote = bankSummaryParts.length > 0
          ? `Đã chuyển khoản ${refundAmount.toLocaleString('vi-VN')}đ về tài khoản ngân hàng liên kết (${bankSummaryParts.join(' • ')})`
          : `Đã chuyển khoản ${refundAmount.toLocaleString('vi-VN')}đ về tài khoản ngân hàng liên kết`;
      } else if (paymentStatus !== 'paid') {
        refundNote = `Đơn ${paymentMethod?.toUpperCase()} chưa thanh toán — chưa phát sinh hoàn tiền`;
      }

      const [updateResult] = await connection.execute<ResultSetHeader>(
        `UPDATE order_returns
         SET status = 'refunded',
             refunded_at = ?,
             admin_note = ?,
             refund_receipt_image_url = ?,
             refund_receipt_uploaded_at = ?,
             refund_receipt_uploaded_by = ?,
             updated_at = ?
         WHERE order_return_id = ? AND order_id = ? AND status = 'received'`,
        [
          now,
          input.adminNote || null,
          input.receiptImageUrl || null,
          input.receiptImageUrl ? now : null,
          input.receiptImageUrl ? input.actorUserId : null,
          now,
          input.orderReturnId,
          input.orderId,
        ]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return null;
      }

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
        note:
          input.adminNote ||
          (refundDestination === 'bank_account'
            ? `Đã hoàn tiền về tài khoản ngân hàng liên kết${input.receiptImageUrl ? ' và đính kèm biên lai chuyển khoản' : ''}`
            : refundNote),
      });

      if (userId) {
        const bankSummaryParts = [
          refundBankName,
          this.maskAccountNumber(refundAccountNumber),
          refundAccountHolderName,
          refundBranchName,
        ].filter(Boolean);

        const notificationMessage =
          refundDestination === 'bank_account' && paymentStatus === 'paid'
            ? [
                `Yêu cầu hoàn trả ${requestCode} đã được chuyển khoản hoàn tiền ${refundAmount.toLocaleString('vi-VN')}đ.`,
                bankSummaryParts.length ? `Tài khoản nhận: ${bankSummaryParts.join(' • ')}.` : undefined,
                input.receiptImageUrl ? 'Biên lai chuyển khoản đã được cập nhật trong chi tiết đơn hàng.' : undefined,
              ]
                .filter(Boolean)
                .join(' ')
            : refundDestination === 'wallet' && paymentStatus === 'paid'
              ? `Yêu cầu hoàn trả ${requestCode} đã được hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví TechMart của bạn.`
              : `Yêu cầu hoàn trả ${requestCode} đã được xử lý hoàn tiền.`;

        await this.createNotificationWithConnection(connection, {
          userId: Number(userId),
          title:
            refundDestination === 'bank_account' && paymentStatus === 'paid'
              ? 'Hoàn tiền trả hàng đã chuyển khoản'
              : 'Yêu cầu hoàn trả đã được hoàn tiền',
          message: notificationMessage,
          type: 'order',
          referenceId: input.orderId,
          createdAt: now,
        });
      }

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
  private async getProductSnapshot(
    executor: SqlExecutor,
    id: number,
    variantId?: number
  ) {
    const [rows] = await executor.execute<RowDataPacket[]>(
      `SELECT
          p.name,
          p.sku AS product_sku,
          pv.variant_name,
          pv.sku AS variant_sku
       FROM products p
       LEFT JOIN product_variants pv
         ON pv.variant_id = ? AND pv.product_id = p.product_id
       WHERE p.product_id = ?`,
      [variantId ?? null, id]
    );
    const row = rows[0] || {};
    return {
      name: row.name,
      variantName: row.variant_name ?? null,
      sku: row.variant_sku ?? row.product_sku ?? null,
    };
  }

  private async exportInventory(
    executor: SqlExecutor,
    productId: number,
    variantId: number | undefined,
    quantity: number,
    orderId: number,
    actorUserId: number | null,
    notes?: string
  ) {
    if (variantId) {
      const [variantResult] = await executor.execute<ResultSetHeader>(
        'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE variant_id = ? AND stock_quantity >= ?',
        [quantity, variantId, quantity]
      );

      if (variantResult.affectedRows === 0) {
        throw new Error(`Không đủ tồn kho cho biến thể ${variantId} để giao hàng`);
      }
    }

    const [productResult] = await executor.execute<ResultSetHeader>(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?',
      [quantity, productId, quantity]
    );

    if (productResult.affectedRows === 0) {
      throw new Error(`Không đủ tồn kho cho sản phẩm ${productId} để giao hàng`);
    }

    await this.appendInventoryTransaction(executor, {
      productId,
      variantId,
      transactionType: 'export',
      quantity,
      referenceType: 'order',
      referenceId: orderId,
      notes,
      createdBy: actorUserId,
    });
  }

  private async restockInventory(
    executor: SqlExecutor,
    productId: number,
    variantId: number | undefined,
    quantity: number,
    orderReturnId: number,
    actorUserId: number | null,
    notes?: string
  ) {
    if (variantId) {
      await executor.execute(
        'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE variant_id = ?',
        [quantity, variantId]
      );
    }

    await executor.execute(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
      [quantity, productId]
    );

    await this.appendInventoryTransaction(executor, {
      productId,
      variantId,
      transactionType: 'return',
      quantity,
      referenceType: 'order_return',
      referenceId: orderReturnId,
      notes,
      createdBy: actorUserId,
    });
  }

  private async appendInventoryTransaction(
    executor: SqlExecutor,
    input: {
      productId: number;
      variantId?: number;
      transactionType: 'export' | 'return';
      quantity: number;
      referenceType: string;
      referenceId: number;
      notes?: string;
      createdBy: number | null;
    }
  ) {
    await executor.execute(
      `INSERT INTO inventory_transactions (
        product_id, variant_id, transaction_type, quantity,
        reference_type, reference_id, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.productId,
        input.variantId ?? null,
        input.transactionType,
        input.quantity,
        input.referenceType,
        input.referenceId,
        input.notes || null,
        input.createdBy,
        new Date(),
      ]
    );
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
    const [customer, items, timeline, returns] = await Promise.all([
      this.getOrderCustomerSnapshot(order),
      this.getOrderDetails(order.orderId),
      this.getOrderTimeline(order.orderId),
      this.listReturns(order.orderId),
    ]);
    return { order, customer, items, timeline, returns };
  }

  private async getOrderCustomerSnapshot(
    order: Order,
  ): Promise<OrderCustomerSnapshot | undefined> {
    if (order.customerName || order.customerEmail || order.customerPhone || order.userId == null) {
      return {
        userId: order.userId ?? undefined,
        name: order.customerName || order.shippingName,
        email: order.customerEmail,
        phone: order.customerPhone || order.shippingPhone,
      };
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT user_id, name, email, phone
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [order.userId],
    );

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return {
      userId: row.user_id,
      name: row.name,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
    };
  }

  private async getOrderDetailsWithExecutor(executor: SqlExecutor, id: number): Promise<OrderDetail[]> {
    const [rows] = await executor.execute<RowDataPacket[]>(
      `SELECT
          od.*,
          p.main_image AS product_image,
          COALESCE(od.variant_name, pv.variant_name) AS resolved_variant_name,
          COALESCE(od.sku, pv.sku, p.sku) AS resolved_sku
       FROM order_details od
       LEFT JOIN products p ON od.product_id = p.product_id
       LEFT JOIN product_variants pv ON od.variant_id = pv.variant_id
       WHERE od.order_id = ?`,
      [id]
    );
    return rows.map(this.mapRowToOrderDetail);
  }

  private buildListWhereClause(filters?: AdminOrderListFilters) {
    let whereClause = ''; const params: any[] = [];
    if (filters?.search) {
      whereClause += ` AND (
        o.order_code LIKE ?
        OR o.shipping_name LIKE ?
        OR COALESCE(u.phone, o.customer_phone, o.shipping_phone) LIKE ?
        OR COALESCE(u.email, o.customer_email) LIKE ?
        OR EXISTS (SELECT 1 FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id AND p.name LIKE ?)
      )`;
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`
      );
    }
    if (filters?.status && filters.status !== 'all') { whereClause += ' AND o.status = ?'; params.push(filters.status); }
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') { whereClause += ' AND o.payment_status = ?'; params.push(filters.paymentStatus); }
    if (filters?.shipperId) { whereClause += ' AND o.shipper_id = ?'; params.push(filters.shipperId); }
    return { whereClause, params };
  }

  // --- MAPPERS ---
  private mapRowToOrder(row: any): Order {
    return {
      orderId: row.order_id,
      orderCode: row.order_code,
      userId: row.user_id ?? null,
      customerName: row.customer_name ?? undefined,
      customerEmail: row.customer_email ?? undefined,
      customerPhone: row.customer_phone ?? undefined,
      shippingName: row.shipping_name,
      shippingPhone: row.shipping_phone,
      shippingAddress: row.shipping_address,
      shippingWard: row.shipping_ward ?? undefined,
      shippingDistrict: row.shipping_district ?? undefined,
      shippingCity: row.shipping_city,
      subtotal: Number(row.subtotal),
      shippingFee: Number(row.shipping_fee),
      discountAmount: Number(row.discount_amount),
      total: Number(row.total),
      couponId: row.coupon_id ?? undefined,
      couponCode: row.coupon_code ?? undefined,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: row.payment_date ?? undefined,
      depositAmount: Number(row.deposit_amount ?? 0),
      status: row.status,
      customerNote: row.customer_note ?? undefined,
      adminNote: row.admin_note ?? undefined,
      cancelReason: row.cancel_reason ?? undefined,
      // Shipper delivery fields — default values for rows without shipper data
      shipperId: row.shipper_id ?? null,
      deliveryStatus: row.delivery_status ?? 'WAITING_PICKUP',
      codAmount: Number(row.cod_amount ?? 0),
      codCollected: Boolean(row.cod_collected),
      failReason: row.fail_reason ?? null,
      deliveryPhotoUrl: row.delivery_photo_url ?? null,
      attemptCount: Number(row.attempt_count ?? 0),
      orderDate: row.order_date,
      confirmedAt: row.confirmed_at ?? undefined,
      shippedAt: row.shipped_at ?? undefined,
      deliveredAt: row.delivered_at ?? undefined,
      cancelledAt: row.cancelled_at ?? undefined,
      warehouseReceivedAt: row.warehouse_received_at ?? undefined,
      warehouseCondition: row.warehouse_condition ?? undefined,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToOrderListItem(row: any): OrderListItem {
    return {
      ...this.mapRowToOrder(row),
      customerName: row.customer_name ?? row.shipping_name ?? undefined,
      customerEmail: row.customer_email ?? undefined,
      customerPhone: row.customer_phone ?? row.shipping_phone ?? undefined,
      itemCount: Number(row.item_count),
      openReturnCount: Number(row.open_return_count),
      allReviewed: !!row.all_reviewed,
    };
  }

  private mapRowToOrderDetail(row: any): OrderDetail {
    return {
      orderDetailId: row.order_detail_id, orderId: row.order_id, productId: row.product_id,
      variantId: row.variant_id ?? undefined,
      productName: row.product_name,
      variantName: row.resolved_variant_name || row.variant_name || '',
      sku: row.resolved_sku || row.sku || undefined,
      productImage: row.product_image || '',
      price: Number(row.price), quantity: Number(row.quantity),
      subtotal: Number(row.subtotal), createdAt: row.created_at
    };
  }

  private mapRowToOrderEvent(row: any): OrderEvent {
    let metadata: Record<string, any> | undefined;
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch {
        metadata = undefined;
      }
    }

    return {
      orderEventId: row.order_event_id,
      orderId: row.order_id,
      eventType: row.event_type,
      fromStatus: row.from_status ?? undefined,
      toStatus: row.to_status ?? undefined,
      actorUserId: row.actor_user_id ?? undefined,
      actorRole: row.actor_role ?? undefined,
      actorName: row.actor_name ?? undefined,
      actorEmail: row.actor_email ?? undefined,
      note: row.note ?? undefined,
      metadata,
      createdAt: row.created_at,
    };
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
      requestedBy:   row.requested_by ?? null,
      refundDestination: row.refund_destination === 'bank_account' ? 'bank_account' : 'wallet',
      refundBankAccountId: row.refund_bank_account_id ?? null,
      refundBankCode: row.refund_bank_code ?? undefined,
      refundBankName: row.refund_bank_name ?? undefined,
      refundAccountNumber: row.refund_account_number ?? undefined,
      refundAccountNumberMasked: this.maskAccountNumber(row.refund_account_number),
      refundAccountHolderName: row.refund_account_holder_name ?? undefined,
      refundBranchName: row.refund_branch_name ?? undefined,
      status:        row.status,
      reason:        row.reason,
      customerNote:  row.customer_note ?? undefined,
      adminNote:     row.admin_note ?? undefined,
      evidenceImages,
      refundReceiptImageUrl: row.refund_receipt_image_url ?? undefined,
      refundReceiptUploadedAt: row.refund_receipt_uploaded_at ?? undefined,
      refundReceiptUploadedBy: row.refund_receipt_uploaded_by ?? null,
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
      variantName:       row.resolved_variant_name || row.variant_name || undefined,
      sku:               row.resolved_sku || row.sku || undefined,
      quantity:          Number(row.quantity),
      reason:            row.reason ?? undefined,
      restockAction:     row.restock_action ?? 'inspect',
      createdAt:         row.created_at,
    };
  }
}
