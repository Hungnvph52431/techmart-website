// backend/src/presentation/controllers/ReviewController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import pool from '../../infrastructure/database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ReviewUseCase } from '../../application/use-cases/ReviewUseCase';

const REVIEWABLE_ORDER_STATUSES = ['delivered', 'completed'] as const;

const EMPTY_STATS = {
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export class ReviewController {
  constructor(private reviewUseCase?: ReviewUseCase) {}

  private getPositiveInteger(
    rawValue: unknown,
    defaultValue: number,
    options?: { max?: number }
  ) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 1) {
      return defaultValue;
    }

    const normalized = Math.trunc(value);
    if (options?.max) {
      return Math.min(normalized, options.max);
    }

    return normalized;
  }

  private getValidRatingFilter(rawValue: unknown) {
    if (rawValue == null) {
      return undefined;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return undefined;
    }

    return value;
  }

  private async productExists(productId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT product_id FROM products WHERE product_id = ? LIMIT 1',
      [productId]
    );

    return rows.length > 0;
  }

  private mapStats(row?: any) {
    if (!row) {
      return EMPTY_STATS;
    }

    return {
      average: parseFloat(row.average) || 0,
      total: Number(row.total || 0),
      distribution: {
        1: Number(row.s1 || 0),
        2: Number(row.s2 || 0),
        3: Number(row.s3 || 0),
        4: Number(row.s4 || 0),
        5: Number(row.s5 || 0),
      },
    };
  }

  private async getProductStats(productId: number) {
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, ROUND(COALESCE(AVG(rating), 0), 1) AS average,
          SUM(rating = 1) AS s1, SUM(rating = 2) AS s2, SUM(rating = 3) AS s3,
          SUM(rating = 4) AS s4, SUM(rating = 5) AS s5
       FROM reviews
       WHERE product_id = ? AND status = 'approved'`,
      [productId]
    );

    return this.mapStats(statsRows[0]);
  }

  private async getFallbackStats(excludedProductId: number) {
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, ROUND(COALESCE(AVG(rating), 0), 1) AS average,
          SUM(rating = 1) AS s1, SUM(rating = 2) AS s2, SUM(rating = 3) AS s3,
          SUM(rating = 4) AS s4, SUM(rating = 5) AS s5
       FROM reviews
       WHERE product_id <> ? AND status = 'approved' AND rating = 5`,
      [excludedProductId]
    );

    return this.mapStats(statsRows[0]);
  }

  private async getProductReviewRows(
    productId: number,
    rating: number | undefined,
    limit: number,
    offset: number
  ) {
    let query = `
      SELECT r.*, u.name AS user_name, NULL AS user_avatar, p.name AS product_name
      FROM reviews r
      LEFT JOIN users u ON u.user_id = r.user_id
      LEFT JOIN products p ON p.product_id = r.product_id
      WHERE r.product_id = ? AND r.status = 'approved'
    `;
    const params: any[] = [productId];

    if (rating) {
      query += ' AND r.rating = ?';
      params.push(rating);
    }

    query += ' ORDER BY r.is_verified_purchase DESC, r.helpful_count DESC, r.created_at DESC';
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    let countQuery =
      "SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'approved'";
    const countParams: any[] = [productId];
    if (rating) {
      countQuery += ' AND rating = ?';
      countParams.push(rating);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);

    return {
      reviews: rows.map((row) => this.mapReview(row)),
      total: Number(countRows[0]?.total || 0),
    };
  }

  private async getFallbackReviewRows(
    excludedProductId: number,
    rating: number | undefined,
    limit: number,
    offset: number
  ) {
    if (rating && rating !== 5) {
      return {
        reviews: [],
        total: 0,
      };
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, u.name AS user_name, NULL AS user_avatar, p.name AS product_name
       FROM reviews r
       LEFT JOIN users u ON u.user_id = r.user_id
       LEFT JOIN products p ON p.product_id = r.product_id
       WHERE r.product_id <> ?
         AND r.status = 'approved'
         AND r.rating = 5
       ORDER BY r.is_verified_purchase DESC, r.helpful_count DESC, r.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [excludedProductId]
    );

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM reviews
       WHERE product_id <> ?
         AND status = 'approved'
         AND rating = 5`,
      [excludedProductId]
    );

    return {
      reviews: rows.map((row) => this.mapReview(row)),
      total: Number(countRows[0]?.total || 0),
    };
  }

  private async updateProductMetrics(productId: number) {
    await pool.execute(
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
           updated_at = NOW()
       WHERE product_id = ?`,
      [productId, productId, productId]
    );
  }

  private async getReviewProductId(reviewId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT product_id FROM reviews WHERE review_id = ? LIMIT 1',
      [reviewId]
    );

    return rows.length > 0 ? Number(rows[0].product_id) : null;
  }

  private resolveCustomerErrorStatus(message: string) {
    if (
      message.includes('không tồn tại') ||
      message.includes('not found') ||
      message.includes('không có quyền')
    ) {
      return 404;
    }

    if (
      message.includes('không thể') ||
      message.includes('cần') ||
      message.includes('đã') ||
      message.includes('chỉ có thể') ||
      message.includes('Rating') ||
      message.includes('thiếu')
    ) {
      return 400;
    }

    return 500;
  }

  private mapReviewEntity(review: any) {
    return {
      reviewId: review.reviewId,
      productId: review.productId,
      userId: review.userId,
      orderId: review.orderId,
      orderDetailId: review.orderDetailId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images || [],
      isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
      helpfulCount: Number(review.helpfulCount || 0),
      status: review.status,
      editCount: Number(review.editCount || 0),
      editedAfterReturnAt: review.editedAfterReturnAt,
      editedAfterReturnOrderReturnId: review.editedAfterReturnOrderReturnId,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  // ── CUSTOMER: Lấy reviews theo sản phẩm (chỉ approved) ───────────────────
  getByProduct = async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'productId không hợp lệ' });
      }

      const hasProduct = await this.productExists(productId);
      if (!hasProduct) {
        return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
      }

      const rating = this.getValidRatingFilter(req.query.rating);
      const page = this.getPositiveInteger(req.query.page, 1);
      const limit = this.getPositiveInteger(req.query.limit, 5, { max: 20 });
      const offset = (page - 1) * limit;
      const productStats = await this.getProductStats(productId);

      if (productStats.total > 0) {
        const { reviews, total } = await this.getProductReviewRows(
          productId,
          rating,
          limit,
          offset
        );

        return res.json({
          reviewSource: 'product',
          hasOwnReviews: true,
          productStats,
          stats: productStats,
          reviews,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        });
      }

      const fallbackStats = await this.getFallbackStats(productId);
      if (fallbackStats.total === 0) {
        return res.json({
          reviewSource: 'empty',
          hasOwnReviews: false,
          productStats,
          stats: EMPTY_STATS,
          reviews: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }

      const { reviews, total } = await this.getFallbackReviewRows(
        productId,
        rating,
        limit,
        offset
      );

      res.json({
        reviewSource: 'system_fallback',
        hasOwnReviews: false,
        productStats,
        stats: fallbackStats,
        reviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        fallbackLabel: 'Tổng hợp đánh giá 5 sao từ khách hàng trên hệ thống',
        fallbackDescription:
          'Sản phẩm này chưa có đánh giá riêng. Dưới đây là các đánh giá 5 sao từ những sản phẩm khác để bạn tham khảo.',
      });
    } catch (error: any) {
      console.error('❌ getByProduct ERROR:', error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  };

  getMyOrderSummary = async (req: AuthRequest, res: Response) => {
    try {
      const orderId = Number(req.params.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ message: 'orderId không hợp lệ' });
      }

      if (!this.reviewUseCase) {
        return res.status(500).json({ message: 'ReviewUseCase chưa được khởi tạo' });
      }

      const summary = await this.reviewUseCase.getMyOrderReviewSummary(
        orderId,
        req.user.userId
      );

      if (!summary) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      return res.json(summary);
    } catch (error: any) {
      return res
        .status(this.resolveCustomerErrorStatus(error.message || 'Unknown error'))
        .json({ message: error.message });
    }
  };

  // ── CUSTOMER: Kiểm tra xem user đã mua sản phẩm này chưa ─────────────────
  // GET /api/reviews/can-review/:productId
  checkCanReview = async (req: AuthRequest, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      const userId = req.user.userId;

      // Kiểm tra user có đơn hàng COMPLETED chứa sản phẩm này không
      // (completed = user đã tự xác nhận nhận hàng)
      const [orderRows] = await pool.execute<RowDataPacket[]>(
        `SELECT od.order_detail_id, od.order_id
         FROM order_details od
         JOIN orders o ON o.order_id = od.order_id
         WHERE o.user_id = ? AND od.product_id = ? AND o.status IN (?, ?)
         LIMIT 1`,
        [userId, productId, ...REVIEWABLE_ORDER_STATUSES]
      );

      if ((orderRows as any[]).length === 0) {
        return res.json({ canReview: false, reason: 'Bạn cần mua và nhận hàng thành công để đánh giá' });
      }

      const orderDetailId = orderRows[0].order_detail_id;
      const orderId = orderRows[0].order_id;

      // Kiểm tra đã review chưa
      const [existingRows] = await pool.execute<RowDataPacket[]>(
        'SELECT review_id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      );

      if ((existingRows as any[]).length > 0) {
        return res.json({ canReview: false, reason: 'Bạn đã đánh giá sản phẩm này rồi' });
      }

      res.json({ canReview: true, orderId, orderDetailId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // ── CUSTOMER: Tạo review mới (CHỈ CHO PHÉP NẾU ĐÃ MUA HÀNG) ─────────────
  create = async (req: AuthRequest, res: Response) => {
    try {
      const {
        productId,
        orderId: orderIdInput,
        orderDetailId: orderDetailIdInput,
        rating,
        title,
        comment,
      } = req.body;
      const userId = req.user.userId;

      if (!productId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Thiếu thông tin hoặc rating không hợp lệ (1-5)' });
      }

      if (orderIdInput && orderDetailIdInput) {
        if (!this.reviewUseCase) {
          return res.status(500).json({ message: 'ReviewUseCase chưa được khởi tạo' });
        }

        const review = await this.reviewUseCase.submitProductReview(
          Number(orderIdInput),
          Number(orderDetailIdInput),
          userId,
          {
            rating: Number(rating),
            title,
            comment,
          }
        );

        if (!review) {
          return res.status(404).json({ message: 'Không tìm thấy đơn hàng hoặc sản phẩm trong đơn' });
        }

        return res.status(201).json(this.mapReviewEntity(review));
      }

      // ✅ BẮT BUỘC: Kiểm tra đã mua hàng và user đã xác nhận nhận hàng (completed)
      const [orderRows] = await pool.execute<RowDataPacket[]>(
        `SELECT od.order_detail_id, od.order_id
         FROM order_details od
         JOIN orders o ON o.order_id = od.order_id
         WHERE o.user_id = ? AND od.product_id = ? AND o.status IN (?, ?)
         LIMIT 1`,
        [userId, productId, ...REVIEWABLE_ORDER_STATUSES]
      );

      if ((orderRows as any[]).length === 0) {
        return res.status(403).json({ message: 'Bạn cần mua và xác nhận nhận hàng thành công mới có thể đánh giá sản phẩm này' });
      }

      const orderId = orderRows[0].order_id;
      const orderDetailId = orderRows[0].order_detail_id;

      // ✅ Kiểm tra đã review chưa
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT review_id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      );
      if ((existing as any[]).length > 0) {
        return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO reviews (product_id, user_id, order_id, order_detail_id, rating, title, comment, is_verified_purchase, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'approved')`,
        [productId, userId, orderId, orderDetailId, rating, title || null, comment || null]
      );

      await this.updateProductMetrics(Number(productId));

      res.status(201).json({ reviewId: result.insertId, message: 'Đánh giá thành công!' });
    } catch (error: any) {
      res
        .status(this.resolveCustomerErrorStatus(error.message || 'Unknown error'))
        .json({ message: error.message });
    }
  };

  updateMine = async (req: AuthRequest, res: Response) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const userId = req.user.userId;
      const { rating, title, comment } = req.body;

      if (!Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ message: 'reviewId không hợp lệ' });
      }

      if (!this.reviewUseCase) {
        return res.status(500).json({ message: 'ReviewUseCase chưa được khởi tạo' });
      }

      const review = await this.reviewUseCase.updateProductReviewAfterReturn(
        reviewId,
        userId,
        {
          rating: Number(rating),
          title,
          comment,
        }
      );

      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy đánh giá cần sửa' });
      }

      return res.json(this.mapReviewEntity(review));
    } catch (error: any) {
      return res
        .status(this.resolveCustomerErrorStatus(error.message || 'Unknown error'))
        .json({ message: error.message });
    }
  };

  // ── CUSTOMER: Đánh dấu hữu ích ───────────────────────────────────────────
  markHelpful = async (req: Request, res: Response) => {
    try {
      await pool.execute('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE review_id = ?', [req.params.reviewId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // ── ADMIN: Lấy tất cả reviews ─────────────────────────────────────────────
  adminGetAll = async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const rating = req.query.rating ? Number(req.query.rating) : undefined;
      const search = req.query.search as string | undefined;
      const suspicious = req.query.suspicious === 'true';
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Number(req.query.limit || 15), 50);
      const offset = (page - 1) * limit;

      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'all') { where += ' AND r.status = ?'; params.push(status); }
      if (rating) { where += ' AND r.rating = ?'; params.push(rating); }
      if (search) {
        where += ' AND (u.name LIKE ? OR p.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      if (suspicious) {
        where += ` AND (r.rating <= 2 AND (
          SELECT COUNT(*) FROM reviews r2
          WHERE r2.user_id = r.user_id AND r2.rating <= 2
          AND r2.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ) >= 3)`;
      }

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT r.*, u.name AS user_name, p.name AS product_name
         FROM reviews r
         LEFT JOIN users u ON u.user_id = r.user_id
         LEFT JOIN products p ON p.product_id = r.product_id
         ${where} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      );
      const [countRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM reviews r
         LEFT JOIN users u ON u.user_id = r.user_id
         LEFT JOIN products p ON p.product_id = r.product_id ${where}`,
        params
      );

      res.json({ reviews: rows.map(this.mapReview), total: Number(countRows[0].total), page, totalPages: Math.ceil(Number(countRows[0].total) / limit) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // ── ADMIN: Ẩn/Hiện review ─────────────────────────────────────────────────
  updateStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
      }
      const productId = await this.getReviewProductId(Number(req.params.reviewId));
      await pool.execute('UPDATE reviews SET status = ?, updated_at = NOW() WHERE review_id = ?', [status, req.params.reviewId]);
      if (productId) {
        await this.updateProductMetrics(productId);
      }
      res.json({ success: true, message: status === 'approved' ? 'Đã hiện review' : 'Đã ẩn review' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  private mapReview(row: any) {
    return {
      reviewId: row.review_id,
      productId: row.product_id,
      productName: row.product_name,
      userId: row.user_id,
      userName: row.user_name || 'Ẩn danh',
      userAvatar: row.user_avatar,
      orderId: row.order_id,
      orderDetailId: row.order_detail_id,
      rating: Number(row.rating),
      title: row.title,
      comment: row.comment,
      images: (() => { try { return JSON.parse(row.images || '[]'); } catch { return []; } })(),
      isVerifiedPurchase: Boolean(row.is_verified_purchase),
      helpfulCount: Number(row.helpful_count || 0),
      status: row.status,
      editCount: Number(row.edit_count || 0),
      editedAfterReturnAt: row.edited_after_return_at,
      editedAfterReturnOrderReturnId:
        row.edited_after_return_order_return_id != null
          ? Number(row.edited_after_return_order_return_id)
          : undefined,
      createdAt: row.created_at,
    };
  }
}
