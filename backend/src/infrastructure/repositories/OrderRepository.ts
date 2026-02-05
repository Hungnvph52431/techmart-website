import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order, OrderDetail, CreateOrderDTO, UpdateOrderDTO } from '../../domain/entities/Order';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class OrderRepository implements IOrderRepository {
  private generateOrderCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  async findAll(): Promise<Order[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders ORDER BY order_date DESC'
    );
    return rows.map(this.mapRowToOrder);
  }

  async findById(orderId: number): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  async findByUserId(userId: number): Promise<Order[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [userId]
    );
    return rows.map(this.mapRowToOrder);
  }

  async findByOrderCode(orderCode: string): Promise<Order | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_code = ?',
      [orderCode]
    );
    return rows.length > 0 ? this.mapRowToOrder(rows[0]) : null;
  }

  async getOrderDetails(orderId: number): Promise<OrderDetail[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_details WHERE order_id = ?',
      [orderId]
    );
    return rows.map(this.mapRowToOrderDetail);
  }

  async create(orderData: CreateOrderDTO): Promise<Order> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const orderCode = this.generateOrderCode();
      const now = new Date();

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = orderData.shippingFee || 0;
      const discountAmount = 0; // Will be calculated if coupon is applied
      const total = subtotal + shippingFee - discountAmount;

      // Insert order
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

      // Insert order details
      for (const item of orderData.items) {
        // Get product info
        const [productRows] = await connection.execute<RowDataPacket[]>(
          'SELECT name, sku FROM products WHERE product_id = ?',
          [item.productId]
        );

        let variantName = null;
        let variantSku = null;
        if (item.variantId) {
          const [variantRows] = await connection.execute<RowDataPacket[]>(
            'SELECT variant_name, sku FROM product_variants WHERE variant_id = ?',
            [item.variantId]
          );
          if (variantRows.length > 0) {
            variantName = variantRows[0].variant_name;
            variantSku = variantRows[0].sku;
          }
        }

        const productName = productRows.length > 0 ? productRows[0].name : 'Unknown Product';
        const sku = variantSku || (productRows.length > 0 ? productRows[0].sku : null);
        const itemSubtotal = item.price * item.quantity;

        await connection.execute(
          `INSERT INTO order_details (
            order_id, product_id, variant_id, product_name, variant_name, sku,
            price, quantity, subtotal, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.variantId || null,
            productName,
            variantName,
            sku,
            item.price,
            item.quantity,
            itemSubtotal,
            now,
          ]
        );
      }

      await connection.commit();

      return {
        orderId,
        orderCode,
        userId: orderData.userId,
        shippingName: orderData.shippingName,
        shippingPhone: orderData.shippingPhone,
        shippingAddress: orderData.shippingAddress,
        shippingWard: orderData.shippingWard,
        shippingDistrict: orderData.shippingDistrict,
        shippingCity: orderData.shippingCity,
        subtotal,
        shippingFee,
        discountAmount,
        total,
        couponCode: orderData.couponCode,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        customerNote: orderData.customerNote,
        orderDate: now,
        updatedAt: now,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(orderData: UpdateOrderDTO): Promise<Order | null> {
    const existing = await this.findById(orderData.orderId);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (orderData.status) {
      updates.push('status = ?');
      params.push(orderData.status);

      // Update status timestamps
      const now = new Date();
      if (orderData.status === 'confirmed') {
        updates.push('confirmed_at = ?');
        params.push(now);
      } else if (orderData.status === 'shipping') {
        updates.push('shipped_at = ?');
        params.push(now);
      } else if (orderData.status === 'delivered') {
        updates.push('delivered_at = ?');
        params.push(now);
      } else if (orderData.status === 'cancelled') {
        updates.push('cancelled_at = ?');
        params.push(now);
      }
    }

    if (orderData.paymentStatus) {
      updates.push('payment_status = ?');
      params.push(orderData.paymentStatus);

      if (orderData.paymentStatus === 'paid') {
        updates.push('payment_date = ?');
        params.push(new Date());
      }
    }

    if (orderData.adminNote !== undefined) {
      updates.push('admin_note = ?');
      params.push(orderData.adminNote);
    }

    if (orderData.cancelReason !== undefined) {
      updates.push('cancel_reason = ?');
      params.push(orderData.cancelReason);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(orderData.orderId);

    await pool.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`,
      params
    );

    return this.findById(orderData.orderId);
  }

  async updateStatus(orderId: number, status: Order['status']): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?',
      [status, new Date(), orderId]
    );
    return result.affectedRows > 0;
  }

  async updatePaymentStatus(orderId: number, status: Order['paymentStatus']): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE orders SET payment_status = ?, updated_at = ? WHERE order_id = ?',
      [status, new Date(), orderId]
    );
    return result.affectedRows > 0;
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
      subtotal: parseFloat(row.subtotal),
      shippingFee: parseFloat(row.shipping_fee),
      discountAmount: parseFloat(row.discount_amount),
      total: parseFloat(row.total),
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

  private mapRowToOrderDetail(row: any): OrderDetail {
    return {
      orderDetailId: row.order_detail_id,
      orderId: row.order_id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      price: parseFloat(row.price),
      quantity: row.quantity,
      subtotal: parseFloat(row.subtotal),
      createdAt: row.created_at,
    };
  }
}
