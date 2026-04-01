import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../database/connection';
import {
  CreateOrderFeedbackDTO,
  CreateProductReviewDTO,
  OrderFeedback,
  ProductReview,
  UpdateProductReviewDTO,
} from '../../domain/entities/Review';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';

export class ReviewRepository implements IReviewRepository {
  async findOrderFeedbackByOrderId(orderId: number): Promise<OrderFeedback | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_feedbacks WHERE order_id = ? LIMIT 1',
      [orderId]
    );

    return rows.length > 0 ? this.mapRowToOrderFeedback(rows[0]) : null;
  }

  async findProductReviewsByOrderDetailIds(orderDetailIds: number[]): Promise<ProductReview[]> {
    if (!orderDetailIds.length) {
      return [];
    }

    const placeholders = orderDetailIds.map(() => '?').join(', ');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM reviews
       WHERE order_detail_id IN (${placeholders})
       ORDER BY created_at DESC, review_id DESC`,
      orderDetailIds
    );

    return rows.map((row) => this.mapRowToProductReview(row));
  }

  async findProductReviewByIdForUser(
    reviewId: number,
    userId: number
  ): Promise<ProductReview | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM reviews WHERE review_id = ? AND user_id = ? LIMIT 1',
      [reviewId, userId]
    );

    return rows.length > 0 ? this.mapRowToProductReview(rows[0]) : null;
  }

  async findReturnLinkedOrderDetailIds(
    orderId: number,
    userId: number
  ): Promise<Map<number, number>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ori.order_detail_id, MIN(orr.order_return_id) AS order_return_id
       FROM order_return_items ori
       JOIN order_returns orr ON orr.order_return_id = ori.order_return_id
       WHERE orr.order_id = ? AND orr.requested_by = ?
       GROUP BY ori.order_detail_id`,
      [orderId, userId]
    );

    return new Map(
      rows.map((row) => [Number(row.order_detail_id), Number(row.order_return_id)])
    );
  }

  async createOrderFeedback(input: CreateOrderFeedbackDTO): Promise<OrderFeedback> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO order_feedbacks (
        order_id, user_id, rating, title, comment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.orderId,
        input.userId,
        input.rating,
        input.title || null,
        input.comment || null,
        new Date(),
        new Date(),
      ]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM order_feedbacks WHERE order_feedback_id = ?',
      [result.insertId]
    );

    return this.mapRowToOrderFeedback(rows[0]);
  }

  async createProductReview(input: CreateProductReviewDTO): Promise<ProductReview> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO reviews (
          product_id, user_id, order_id, order_detail_id, rating, title, comment, images,
          is_verified_purchase, helpful_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved', ?, ?)`,
        [
          input.productId,
          input.userId,
          input.orderId,
          input.orderDetailId,
          input.rating,
          input.title || null,
          input.comment || null,
          null,
          true,
          new Date(),
          new Date(),
        ]
      );

      await this.updateProductRatingStats(connection, input.productId);
      await connection.commit();

      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM reviews WHERE review_id = ?',
        [result.insertId]
      );

      return this.mapRowToProductReview(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateProductReview(input: UpdateProductReviewDTO): Promise<ProductReview> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE reviews
         SET rating = ?,
             title = ?,
             comment = ?,
             edit_count = edit_count + 1,
             edited_after_return_at = ?,
             edited_after_return_order_return_id = ?,
             updated_at = ?
         WHERE review_id = ? AND user_id = ?`,
        [
          input.rating,
          input.title || null,
          input.comment || null,
          new Date(),
          input.editedAfterReturnOrderReturnId,
          new Date(),
          input.reviewId,
          input.userId,
        ]
      );

      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM reviews WHERE review_id = ? LIMIT 1',
        [input.reviewId]
      );

      if (rows.length === 0) {
        throw new Error('Updated review not found');
      }

      const updatedReview = this.mapRowToProductReview(rows[0]);
      await this.updateProductRatingStats(connection, updatedReview.productId);
      await connection.commit();

      return updatedReview;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async updateProductRatingStats(connection: PoolConnection, productId: number) {
    await connection.execute(
      `UPDATE products
       SET rating_avg = (
             SELECT COALESCE(AVG(rating), 0)
             FROM reviews
             WHERE product_id = ?
               AND status = 'approved'
           ),
           review_count = (
             SELECT COUNT(*)
             FROM reviews
             WHERE product_id = ?
               AND status = 'approved'
           ),
           updated_at = ?
       WHERE product_id = ?`,
      [productId, productId, new Date(), productId]
    );
  }

  private mapRowToOrderFeedback(row: any): OrderFeedback {
    return {
      orderFeedbackId: row.order_feedback_id,
      orderId: row.order_id,
      userId: row.user_id,
      rating: Number(row.rating),
      title: row.title || undefined,
      comment: row.comment || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToProductReview(row: any): ProductReview {
    return {
      reviewId: row.review_id,
      productId: row.product_id,
      userId: row.user_id,
      orderId: row.order_id || undefined,
      orderDetailId: row.order_detail_id || undefined,
      rating: Number(row.rating),
      title: row.title || undefined,
      comment: row.comment || undefined,
      images: row.images
        ? typeof row.images === 'string'
          ? JSON.parse(row.images)
          : row.images
        : undefined,
      isVerifiedPurchase: Boolean(row.is_verified_purchase),
      helpfulCount: Number(row.helpful_count || 0),
      status: row.status,
      editCount: Number(row.edit_count || 0),
      editedAfterReturnAt: row.edited_after_return_at || undefined,
      editedAfterReturnOrderReturnId:
        row.edited_after_return_order_return_id != null
          ? Number(row.edited_after_return_order_return_id)
          : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
