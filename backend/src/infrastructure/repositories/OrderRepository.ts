import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../database/connection';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import {
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

  async findAdminList(
    filters?: AdminOrderListFilters
  ): Promise<PaginatedResult<OrderListItem>> {
    const page = Math.max(Number(filters?.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters?.limit || 20), 1), 100);
    const offset = (page - 1) * limit;
    const { whereClause, params } = this.buildListWhereClause(filters);

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM orders o
       LEFT JOIN users u ON u.user_id = o.user_id
       WHERE 1=1 ${whereClause}`,
      params
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         o.*,
         u.name AS customer_name,
         u.email AS customer_email,
         u.phone AS customer_phone,
         (
           SELECT COUNT(*)
           FROM order_details od
           WHERE od.order_id = o.order_id
         ) AS item_count,
         (
           SELECT COUNT(*)
           FROM order_returns orr
           WHERE orr.order_id = o.order_id
             AND orr.status NOT IN ('closed', 'rejected')
         ) AS open_return_count
       FROM orders o
       LEFT JOIN users u ON u.user_id = o.user_id
       WHERE 1=1 ${whereClause}
       ORDER BY o.order_date DESC, o.order_id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(countRows[0]?.total || 0);

    return {
      items: rows.map((row) => this.mapRowToOrderListItem(row)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findUserList(userId: number, status?: Order['status'] | 'all'): Promise<OrderListItem[]> {
    const params: any[] = [userId];
    let query = `
      SELECT
        o.*,
        (
          SELECT COUNT(*)
          FROM order_details od
          WHERE od.order_id = o.order_id
        ) AS item_count,
        (
          SELECT COUNT(*)
          FROM order_returns orr
          WHERE orr.order_id = o.order_id
            AND orr.status NOT IN ('closed', 'rejected')
        ) AS open_return_count
      FROM orders o
      WHERE o.user_id = ?
    `;

    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.order_date DESC, o.order_id DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map((row) => this.mapRowToOrderListItem(row));
  }

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
      `SELECT *
       FROM order_events
       WHERE order_id = ?
       ORDER BY created_at ASC, order_event_id ASC`,
      [orderId]
    );

    return rows.map((row) => this.mapRowToOrderEvent(row));
  }

  async create(orderData: CreateOrderDTO): Promise<Order> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const now = new Date();
      const orderCode = this.generateOrderCode();
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const shippingFee = orderData.shippingFee || 0;
      const discountAmount = 0;
      const total = subtotal + shippingFee - discountAmount;

      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders (
          order_code, user_id,
          shipping_name, shipping_phone, shipping_address, shipping_ward, shipping_district, shipping_city,
          subtotal, shipping_fee, discount_amount, total,
          coupon_code, payment_method, payment_status, status,
          customer_note, order_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderCode,
          orderData.userId,
          orderData.shippingName,
          orderData.shippingPhone,
          orderData.shippingAddress,
          orderData.shippingWard || null,
          orderData.shippingDistrict || null,
          orderData.shippingCity,
          subtotal,
          shippingFee,
          discountAmount,
          total,
          orderData.couponCode || null,
          orderData.paymentMethod,
          'pending',
          'pending',
          orderData.customerNote || null,
          now,
          now,
        ]
      );

      const orderId = orderResult.insertId;

      for (const item of orderData.items) {
        const productData = await this.getProductSnapshot(connection, item.productId);
        if (!productData) {
          throw new Error(`Product ${item.productId} not found`);
        }

        let variantName: string | null = null;
        let sku = productData.sku;

        if (item.variantId) {
          const variant = await this.getVariantSnapshot(connection, item.variantId);
          if (!variant || variant.product_id !== item.productId || !variant.is_active) {
            throw new Error(`Variant ${item.variantId} not found`);
          }

          variantName = variant.variant_name;
          sku = variant.sku;
        }

        await this.decrementInventory(connection, item.productId, item.variantId, item.quantity);

        await connection.execute(
          `INSERT INTO order_details (
            order_id, product_id, variant_id, product_name, variant_name, sku,
            price, quantity, subtotal, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.variantId || null,
            productData.name,
            variantName,
            sku,
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
        actorUserId: orderData.userId,
        actorRole: 'customer',
        toStatus: 'pending',
        note: orderData.customerNote,
        metadata: {
          itemCount: orderData.items.length,
          paymentMethod: orderData.paymentMethod,
        },
      });

      await connection.commit();
      return (await this.findById(orderId))!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async transitionStatus(input: TransitionOrderStatusDTO): Promise<Order | null> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);

      if (!order || order.status !== input.currentStatus) {
        await connection.rollback();
        return null;
      }

      const now = new Date();
      const updates = ['status = ?', 'updated_at = ?'];
      const params: any[] = [input.nextStatus, now];

      if (input.nextStatus === 'confirmed') {
        updates.push('confirmed_at = ?');
        params.push(now);
      }

      if (input.nextStatus === 'shipping') {
        updates.push('shipped_at = ?');
        params.push(now);
      }

      if (input.nextStatus === 'delivered') {
        updates.push('delivered_at = ?');
        params.push(now);
      }

      await connection.execute(
        `UPDATE orders
         SET ${updates.join(', ')}
         WHERE order_id = ?`,
        [...params, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'status_changed',
        fromStatus: input.currentStatus,
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
      const updates = ['payment_status = ?', 'updated_at = ?'];
      const params: any[] = [input.nextStatus, now];

      if (input.nextStatus === 'paid') {
        updates.push('payment_date = ?');
        params.push(now);
      }

      await connection.execute(
        `UPDATE orders
         SET ${updates.join(', ')}
         WHERE order_id = ?`,
        [...params, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'payment_status_changed',
        fromStatus: input.currentStatus,
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

  async cancel(input: CancelOrderDTO): Promise<Order | null> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);

      if (!order || order.status !== input.currentStatus) {
        await connection.rollback();
        return null;
      }

      const details = await this.getOrderDetailsWithExecutor(connection, input.orderId);
      for (const detail of details) {
        await this.restoreInventory(connection, detail.productId, detail.variantId, detail.quantity);
      }

      const now = new Date();
      await connection.execute(
        `UPDATE orders
         SET status = 'cancelled',
             cancel_reason = ?,
             admin_note = COALESCE(?, admin_note),
             cancelled_at = ?,
             updated_at = ?
         WHERE order_id = ?`,
        [input.reason, input.adminNote || null, now, now, input.orderId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'order_cancelled',
        fromStatus: input.currentStatus,
        toStatus: 'cancelled',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.reason,
        metadata: input.adminNote ? { adminNote: input.adminNote } : undefined,
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

  async listReturns(orderId: number): Promise<OrderReturn[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM order_returns
       WHERE order_id = ?
       ORDER BY requested_at DESC, order_return_id DESC`,
      [orderId]
    );

    return this.attachReturnItems(rows.map((row) => this.mapRowToOrderReturn(row)));
  }

  async getReturnById(orderId: number, orderReturnId: number): Promise<OrderReturn | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM order_returns
       WHERE order_id = ? AND order_return_id = ?`,
      [orderId, orderReturnId]
    );

    if (rows.length === 0) {
      return null;
    }

    const [orderReturn] = await this.attachReturnItems([this.mapRowToOrderReturn(rows[0])]);
    return orderReturn || null;
  }

  async createReturn(input: CreateOrderReturnDTO): Promise<OrderReturn> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const order = await this.findOrderForUpdate(connection, input.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const details = await this.getOrderDetailsWithExecutor(connection, input.orderId);
      const detailMap = new Map(details.map((item) => [item.orderDetailId, item]));
      const existingQuantities = await this.getRequestedReturnQuantities(connection, input.orderId);
      const seenOrderDetailIds = new Set<number>();
      const now = new Date();

      for (const item of input.items) {
        const detail = detailMap.get(item.orderDetailId);
        if (!detail) {
          throw new Error(`Order detail ${item.orderDetailId} not found`);
        }

        if (seenOrderDetailIds.has(item.orderDetailId)) {
          throw new Error(`Duplicate return item for order detail ${item.orderDetailId}`);
        }
        seenOrderDetailIds.add(item.orderDetailId);

        const alreadyRequested = existingQuantities.get(item.orderDetailId) || 0;
        if (item.quantity + alreadyRequested > detail.quantity) {
          throw new Error(`Return quantity exceeds purchased quantity for ${detail.productName}`);
        }
      }

      const requestCode = this.generateReturnCode();
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO order_returns (
          order_id, request_code, requested_by, status, reason, customer_note,
          requested_at, updated_at
        ) VALUES (?, ?, ?, 'requested', ?, ?, ?, ?)`,
        [
          input.orderId,
          requestCode,
          input.requestedBy,
          input.reason,
          input.customerNote || null,
          now,
          now,
        ]
      );

      for (const item of input.items) {
        await connection.execute(
          `INSERT INTO order_return_items (
            order_return_id, order_detail_id, quantity, reason, restock_action, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            result.insertId,
            item.orderDetailId,
            item.quantity,
            item.reason || null,
            item.restockAction || 'restock',
            now,
          ]
        );
      }

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_requested',
        actorUserId: input.requestedBy,
        actorRole: 'customer',
        note: input.reason,
        metadata: {
          orderReturnId: result.insertId,
          requestCode,
          itemCount: input.items.length,
        },
      });

      await connection.commit();
      return (await this.getReturnById(input.orderId, result.insertId))!;
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
      const orderReturn = await this.findReturnForUpdate(connection, input.orderReturnId);

      if (!orderReturn || orderReturn.orderId !== input.orderId) {
        await connection.rollback();
        return null;
      }

      if (orderReturn.status !== 'requested') {
        throw new Error(`Cannot review return in status ${orderReturn.status}`);
      }

      const now = new Date();
      const nextStatus = input.decision;

      await connection.execute(
        `UPDATE order_returns
         SET status = ?,
             admin_note = COALESCE(?, admin_note),
             approved_at = ?,
             rejected_at = ?,
             updated_at = ?
         WHERE order_return_id = ?`,
        [
          nextStatus,
          input.adminNote || null,
          nextStatus === 'approved' ? now : null,
          nextStatus === 'rejected' ? now : null,
          now,
          input.orderReturnId,
        ]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: nextStatus === 'approved' ? 'return_approved' : 'return_rejected',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
        metadata: {
          orderReturnId: input.orderReturnId,
          requestCode: orderReturn.requestCode,
        },
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
      const orderReturn = await this.findReturnForUpdate(connection, input.orderReturnId);

      if (!orderReturn || orderReturn.orderId !== input.orderId) {
        await connection.rollback();
        return null;
      }

      if (orderReturn.status !== 'approved') {
        throw new Error(`Cannot receive return in status ${orderReturn.status}`);
      }

      const returnItems = await this.getReturnItemsByReturnIds(connection, [input.orderReturnId]);
      for (const item of returnItems) {
        if (item.restockAction === 'restock') {
          await this.restoreInventory(connection, item.productId, item.variantId, item.quantity);
        }
      }

      const now = new Date();
      await connection.execute(
        `UPDATE order_returns
         SET status = 'received',
             admin_note = COALESCE(?, admin_note),
             received_at = ?,
             updated_at = ?
         WHERE order_return_id = ?`,
        [input.adminNote || null, now, now, input.orderReturnId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_received',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
        metadata: {
          orderReturnId: input.orderReturnId,
          requestCode: orderReturn.requestCode,
        },
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
      const orderReturn = await this.findReturnForUpdate(connection, input.orderReturnId);

      if (!orderReturn || orderReturn.orderId !== input.orderId) {
        await connection.rollback();
        return null;
      }

      if (orderReturn.status !== 'received') {
        throw new Error(`Cannot refund return in status ${orderReturn.status}`);
      }

      const now = new Date();
      await connection.execute(
        `UPDATE order_returns
         SET status = 'refunded',
             admin_note = COALESCE(?, admin_note),
             refunded_at = ?,
             updated_at = ?
         WHERE order_return_id = ?`,
        [input.adminNote || null, now, now, input.orderReturnId]
      );

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_refunded',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
        metadata: {
          orderReturnId: input.orderReturnId,
          requestCode: orderReturn.requestCode,
        },
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
      const order = await this.findOrderForUpdate(connection, input.orderId);
      const orderReturn = await this.findReturnForUpdate(connection, input.orderReturnId);

      if (!order || !orderReturn || orderReturn.orderId !== input.orderId) {
        await connection.rollback();
        return null;
      }

      if (!['received', 'refunded', 'rejected'].includes(orderReturn.status)) {
        throw new Error(`Cannot close return in status ${orderReturn.status}`);
      }

      const now = new Date();
      await connection.execute(
        `UPDATE order_returns
         SET status = 'closed',
             admin_note = COALESCE(?, admin_note),
             closed_at = ?,
             updated_at = ?
         WHERE order_return_id = ?`,
        [input.adminNote || null, now, now, input.orderReturnId]
      );

      const isFullyReturned = await this.isOrderFullyReturned(connection, input.orderId);

      if (isFullyReturned && order.status !== 'returned') {
        await connection.execute(
          `UPDATE orders
           SET status = 'returned',
               payment_status = ?,
               updated_at = ?
           WHERE order_id = ?`,
          [
            order.paymentStatus === 'paid' && orderReturn.status === 'refunded'
              ? 'refunded'
              : order.paymentStatus,
            now,
            input.orderId,
          ]
        );

        await this.appendEventWithConnection(connection, {
          orderId: input.orderId,
          eventType: 'status_changed',
          fromStatus: order.status,
          toStatus: 'returned',
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          note: 'Order fully returned',
        });

        if (order.paymentStatus === 'paid' && orderReturn.status === 'refunded') {
          await this.appendEventWithConnection(connection, {
            orderId: input.orderId,
            eventType: 'payment_status_changed',
            fromStatus: order.paymentStatus,
            toStatus: 'refunded',
            actorUserId: input.actorUserId,
            actorRole: input.actorRole,
            note: 'Order fully refunded after return closure',
          });
        }
      }

      await this.appendEventWithConnection(connection, {
        orderId: input.orderId,
        eventType: 'return_closed',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        note: input.adminNote,
        metadata: {
          orderReturnId: input.orderReturnId,
          requestCode: orderReturn.requestCode,
        },
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

  private async findAggregate(options: {
    orderId: number;
    userId?: number;
  }): Promise<OrderAggregate | null> {
    const params: any[] = [options.orderId];
    let query = `
      SELECT
        o.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      WHERE o.order_id = ?
    `;

    if (options.userId !== undefined) {
      query += ' AND o.user_id = ?';
      params.push(options.userId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    if (rows.length === 0) {
      return null;
    }

    const order = this.mapRowToOrder(rows[0]);
    const customer =
      rows[0].customer_name || rows[0].customer_email
        ? {
            userId: order.userId,
            name: rows[0].customer_name,
            email: rows[0].customer_email,
            phone: rows[0].customer_phone || undefined,
          }
        : undefined;

    const [items, timeline, returns] = await Promise.all([
      this.getOrderDetails(order.orderId),
      this.getOrderTimeline(order.orderId),
      this.listReturns(order.orderId),
    ]);

    return { order, customer, items, timeline, returns };
  }

  private buildListWhereClause(filters?: AdminOrderListFilters) {
    const params: any[] = [];
    let whereClause = '';

    if (filters?.search) {
      whereClause +=
        ' AND (o.order_code LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR o.shipping_name LIKE ? OR o.shipping_phone LIKE ?)';
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`
      );
    }

    if (filters?.status && filters.status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(filters.status);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      whereClause += ' AND o.payment_status = ?';
      params.push(filters.paymentStatus);
    }

    if (filters?.userId) {
      whereClause += ' AND o.user_id = ?';
      params.push(filters.userId);
    }

    if (filters?.dateFrom) {
      whereClause += ' AND DATE(o.order_date) >= DATE(?)';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      whereClause += ' AND DATE(o.order_date) <= DATE(?)';
      params.push(filters.dateTo);
    }

    return { whereClause, params };
  }

  private async getOrderDetailsWithExecutor(
    executor: SqlExecutor,
    orderId: number
  ): Promise<OrderDetail[]> {
    const [rows] = await executor.execute<RowDataPacket[]>(
      `SELECT
         od.*,
         p.main_image AS product_image
       FROM order_details od
       LEFT JOIN products p ON p.product_id = od.product_id
       WHERE od.order_id = ?
       ORDER BY od.order_detail_id ASC`,
      [orderId]
    );

    return rows.map((row) => this.mapRowToOrderDetail(row));
  }

  private async attachReturnItems(orderReturns: OrderReturn[]): Promise<OrderReturn[]> {
    if (!orderReturns.length) {
      return orderReturns;
    }

    const returnIds = orderReturns.map((item) => item.orderReturnId);
    const items = await this.getReturnItemsByReturnIds(pool, returnIds);
    const itemsByReturn = items.reduce<Map<number, OrderReturnItem[]>>((map, item) => {
      const bucket = map.get(item.orderReturnId) || [];
      bucket.push(item);
      map.set(item.orderReturnId, bucket);
      return map;
    }, new Map());

    return orderReturns.map((orderReturn) => ({
      ...orderReturn,
      items: itemsByReturn.get(orderReturn.orderReturnId) || [],
    }));
  }

  private async getReturnItemsByReturnIds(
    executor: SqlExecutor,
    returnIds: number[]
  ): Promise<OrderReturnItem[]> {
    if (!returnIds.length) {
      return [];
    }

    const placeholders = returnIds.map(() => '?').join(', ');
    const [rows] = await executor.execute<RowDataPacket[]>(
      `SELECT
         ori.*,
         od.product_id,
         od.variant_id,
         od.product_name,
         od.variant_name,
         od.sku
       FROM order_return_items ori
       INNER JOIN order_details od ON od.order_detail_id = ori.order_detail_id
       WHERE ori.order_return_id IN (${placeholders})
       ORDER BY ori.order_return_item_id ASC`,
      returnIds
    );

    return rows.map((row) => this.mapRowToOrderReturnItem(row));
  }

  private async getRequestedReturnQuantities(
    connection: PoolConnection,
    orderId: number
  ): Promise<Map<number, number>> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         ori.order_detail_id,
         COALESCE(SUM(ori.quantity), 0) AS total_quantity
       FROM order_return_items ori
       INNER JOIN order_returns orr ON orr.order_return_id = ori.order_return_id
       WHERE orr.order_id = ?
         AND orr.status <> 'rejected'
       GROUP BY ori.order_detail_id`,
      [orderId]
    );

    return rows.reduce<Map<number, number>>((map, row) => {
      map.set(row.order_detail_id, Number(row.total_quantity));
      return map;
    }, new Map());
  }

  private async isOrderFullyReturned(connection: PoolConnection, orderId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         od.order_detail_id,
         od.quantity,
         COALESCE(
           SUM(
             CASE
               WHEN orr.status IN ('received', 'refunded', 'closed') THEN ori.quantity
               ELSE 0
             END
           ),
           0
         ) AS returned_quantity
       FROM order_details od
       LEFT JOIN order_return_items ori ON ori.order_detail_id = od.order_detail_id
       LEFT JOIN order_returns orr ON orr.order_return_id = ori.order_return_id
       WHERE od.order_id = ?
       GROUP BY od.order_detail_id, od.quantity`,
      [orderId]
    );

    return rows.every((row) => Number(row.returned_quantity || 0) >= Number(row.quantity || 0));
  }

  private async findOrderForUpdate(connection: PoolConnection, orderId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ? FOR UPDATE',
      [orderId]
    );

    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  private async findReturnForUpdate(connection: PoolConnection, orderReturnId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM order_returns WHERE order_return_id = ? FOR UPDATE',
      [orderReturnId]
    );

    return rows.length > 0 ? this.mapRowToOrderReturn(rows[0]) : null;
  }

  private async getProductSnapshot(connection: PoolConnection, productId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT product_id, name, sku FROM products WHERE product_id = ?',
      [productId]
    );

    return rows[0];
  }

  private async getVariantSnapshot(connection: PoolConnection, variantId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT variant_id, product_id, variant_name, sku, is_active FROM product_variants WHERE variant_id = ?',
      [variantId]
    );

    return rows[0];
  }

  private async decrementInventory(
    connection: PoolConnection,
    productId: number,
    variantId: number | undefined,
    quantity: number
  ) {
    if (variantId) {
      const [variantResult] = await connection.execute<ResultSetHeader>(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity - ?,
             updated_at = ?
         WHERE variant_id = ?
           AND stock_quantity >= ?`,
        [quantity, new Date(), variantId, quantity]
      );

      if (variantResult.affectedRows === 0) {
        throw new Error(`Insufficient stock for variant ${variantId}`);
      }
    }

    const [productResult] = await connection.execute<ResultSetHeader>(
      `UPDATE products
       SET stock_quantity = stock_quantity - ?,
           updated_at = ?
       WHERE product_id = ?
         AND stock_quantity >= ?`,
      [quantity, new Date(), productId, quantity]
    );

    if (productResult.affectedRows === 0) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }
  }

  private async restoreInventory(
    connection: PoolConnection,
    productId: number,
    variantId: number | undefined,
    quantity: number
  ) {
    if (variantId) {
      await connection.execute(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity + ?,
             updated_at = ?
         WHERE variant_id = ?`,
        [quantity, new Date(), variantId]
      );
    }

    await connection.execute(
      `UPDATE products
       SET stock_quantity = stock_quantity + ?,
           updated_at = ?
       WHERE product_id = ?`,
      [quantity, new Date(), productId]
    );
  }

  private async appendEventWithConnection(
    connection: PoolConnection,
    input: {
      orderId: number;
      eventType: OrderEvent['eventType'];
      fromStatus?: string;
      toStatus?: string;
      actorUserId?: number;
      actorRole?: OrderEvent['actorRole'];
      note?: string;
      metadata?: Record<string, any>;
    }
  ) {
    await connection.execute(
      `INSERT INTO order_events (
        order_id, event_type, from_status, to_status, actor_user_id,
        actor_role, note, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.orderId,
        input.eventType,
        input.fromStatus || null,
        input.toStatus || null,
        input.actorUserId || null,
        input.actorRole || null,
        input.note || null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        new Date(),
      ]
    );
  }

  private mapRowToOrder(row: any): Order {
    return {
      orderId: row.order_id,
      orderCode: row.order_code,
      userId: row.user_id,
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
      status: row.status,
      customerNote: row.customer_note,
      adminNote: row.admin_note,
      cancelReason: row.cancel_reason,
      orderDate: row.order_date,
      confirmedAt: row.confirmed_at,
      shippedAt: row.shipped_at,
      deliveredAt: row.delivered_at,
      cancelledAt: row.cancelled_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToOrderListItem(row: any): OrderListItem {
    return {
      ...this.mapRowToOrder(row),
      customerName: row.customer_name || undefined,
      customerEmail: row.customer_email || undefined,
      customerPhone: row.customer_phone || undefined,
      itemCount: Number(row.item_count || 0),
      openReturnCount: Number(row.open_return_count || 0),
    };
  }

  private mapRowToOrderDetail(row: any): OrderDetail {
    return {
      orderDetailId: row.order_detail_id,
      orderId: row.order_id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      productImage: row.product_image || undefined,
      price: Number(row.price),
      quantity: Number(row.quantity),
      subtotal: Number(row.subtotal),
      createdAt: row.created_at,
    };
  }

  private mapRowToOrderEvent(row: any): OrderEvent {
    return {
      orderEventId: row.order_event_id,
      orderId: row.order_id,
      eventType: row.event_type,
      fromStatus: row.from_status || undefined,
      toStatus: row.to_status || undefined,
      actorUserId: row.actor_user_id || undefined,
      actorRole: row.actor_role || undefined,
      note: row.note || undefined,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : undefined,
      createdAt: row.created_at,
    };
  }

  private mapRowToOrderReturn(row: any): OrderReturn {
    return {
      orderReturnId: row.order_return_id,
      orderId: row.order_id,
      requestCode: row.request_code,
      requestedBy: row.requested_by,
      status: row.status,
      reason: row.reason,
      customerNote: row.customer_note || undefined,
      adminNote: row.admin_note || undefined,
      requestedAt: row.requested_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      receivedAt: row.received_at,
      refundedAt: row.refunded_at,
      closedAt: row.closed_at,
      updatedAt: row.updated_at,
      items: [],
    };
  }

  private mapRowToOrderReturnItem(row: any): OrderReturnItem {
    return {
      orderReturnItemId: row.order_return_item_id,
      orderReturnId: row.order_return_id,
      orderDetailId: row.order_detail_id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name || undefined,
      variantName: row.variant_name || undefined,
      sku: row.sku || undefined,
      quantity: Number(row.quantity),
      reason: row.reason || undefined,
      restockAction: row.restock_action,
      createdAt: row.created_at,
    };
  }
}
