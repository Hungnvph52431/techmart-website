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
    let query = `SELECT o.*, (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.order_id) AS item_count,
                 (SELECT COUNT(*) FROM order_returns orr WHERE orr.order_id = o.order_id AND orr.status NOT IN ('closed', 'rejected')) AS open_return_count
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
      const total = subtotal + shippingFee;

      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders (order_code, user_id, shipping_name, shipping_phone, shipping_address, shipping_city, 
         subtotal, shipping_fee, total, payment_method, payment_status, status, order_date, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)`,
        [orderCode, orderData.userId, orderData.shippingName, orderData.shippingPhone, orderData.shippingAddress, 
         orderData.shippingCity, subtotal, shippingFee, total, orderData.paymentMethod, now, now]
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
      await connection.execute("UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE order_id = ?", [input.reason, now, input.orderId]);
      await this.appendEventWithConnection(connection, {
        orderId: input.orderId, eventType: 'order_cancelled', actorUserId: input.actorUserId, actorRole: input.actorRole, note: input.reason
      });
      await connection.commit();
      return this.findById(input.orderId);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  // --- STATS ---
  async getStats(): Promise<OrderStats> {
    const [[summary]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count
       FROM orders`
    );
    const totalOrders = Number(summary.total_orders) || 0;
    return {
      totalOrders, totalRevenue: parseFloat(summary.total_revenue), revenueThisMonth: 0, avgOrderValue: totalOrders > 0 ? parseFloat(summary.total_revenue) / totalOrders : 0,
      ordersByStatus: { pending: Number(summary.pending_count), confirmed: 0, processing: 0, shipping: 0, delivered: Number(summary.delivered_count), cancelled: 0, returned: 0 },
      paymentMethodStats: { cod: 0, bank_transfer: 0, momo: 0, vnpay: 0, zalopay: 0 },
      recentOrders: []
    };
  }

  // --- RETURN LOGIC (STUBS FOR INTERFACE) ---
  async listReturns(orderId: number): Promise<OrderReturn[]> { return []; }
  async getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null> { return null; }
  async createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn> { throw new Error('Not implemented'); }
  async reviewReturn(input: ReviewOrderReturnDTO): Promise<OrderReturn | null> { return null; }
  async receiveReturn(input: ReceiveOrderReturnDTO): Promise<OrderReturn | null> { return null; }
  async refundReturn(input: RefundOrderReturnDTO): Promise<OrderReturn | null> { return null; }
  async closeReturn(input: CloseOrderReturnDTO): Promise<OrderReturn | null> { return null; }
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
    const order = await this.findById(options.orderId);
    if (!order) return null;
    return { order, items: await this.getOrderDetails(order.orderId), timeline: [], returns: [] };
  }

  private async getOrderDetailsWithExecutor(executor: SqlExecutor, id: number): Promise<OrderDetail[]> {
    const [rows] = await executor.execute<RowDataPacket[]>('SELECT * FROM order_details WHERE order_id = ?', [id]);
    return rows.map(this.mapRowToOrderDetail);
  }

  private buildListWhereClause(filters?: AdminOrderListFilters) {
    let whereClause = ''; const params: any[] = [];
    if (filters?.search) { whereClause += ' AND (order_code LIKE ? OR shipping_name LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
    if (filters?.status && filters.status !== 'all') { whereClause += ' AND status = ?'; params.push(filters.status); }
    return { whereClause, params };
  }

  // --- MAPPERS ---
  private mapRowToOrder(row: any): Order {
    return {
      orderId: row.order_id, orderCode: row.order_code, userId: row.user_id,
      shippingName: row.shipping_name, shippingPhone: row.shipping_phone, shippingAddress: row.shipping_address,
      shippingCity: row.shipping_city, subtotal: Number(row.subtotal), shippingFee: Number(row.shipping_fee),
      discountAmount: Number(row.discount_amount), total: Number(row.total), paymentMethod: row.payment_method,
      paymentStatus: row.payment_status, status: row.status, orderDate: row.order_date, updatedAt: row.updated_at
    };
  }

  private mapRowToOrderListItem(row: any): OrderListItem {
    return { ...this.mapRowToOrder(row), customerName: row.customer_name, itemCount: Number(row.item_count), openReturnCount: Number(row.open_return_count) };
  }

  private mapRowToOrderDetail(row: any): OrderDetail {
    return {
      orderDetailId: row.order_detail_id, orderId: row.order_id, productId: row.product_id,
      productName: row.product_name, price: Number(row.price), quantity: Number(row.quantity),
      subtotal: Number(row.subtotal), createdAt: row.created_at
    };
  }

  private mapRowToOrderEvent(row: any): OrderEvent {
    return { orderEventId: row.order_event_id, orderId: row.order_id, eventType: row.event_type, createdAt: row.created_at };
  }
}