// backend/src/presentation/controllers/ReviewController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import pool from '../../infrastructure/database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ReviewController {

  // ── CUSTOMER: Lấy reviews theo sản phẩm (chỉ approved) ───────────────────
  getByProduct = async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      const rating = req.query.rating ? Number(req.query.rating) : undefined;
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Number(req.query.limit || 5), 20);
      const offset = (page - 1) * limit;


      const [statsRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total, ROUND(AVG(rating),1) AS average,
          SUM(rating=1) AS s1, SUM(rating=2) AS s2, SUM(rating=3) AS s3,
          SUM(rating=4) AS s4, SUM(rating=5) AS s5
         FROM reviews WHERE product_id = ? AND status = 'approved'`,
        [productId]
        
      );
          console.log('>>> statsRows:', statsRows);

      const s = statsRows[0];
      const stats = {
        average: parseFloat(s.average) || 0,
        total: Number(s.total),
        distribution: { 1: Number(s.s1), 2: Number(s.s2), 3: Number(s.s3), 4: Number(s.s4), 5: Number(s.s5) },
      };

      let query = `
        SELECT r.*, u.name AS user_name, u.name AS user_name, NULL AS user_avatar
        FROM reviews r LEFT JOIN users u ON u.user_id = r.user_id
        WHERE r.product_id = ? AND r.status = 'approved'
      `;
      const params: any[] = [productId];
      if (rating) { query += ' AND r.rating = ?'; params.push(rating); }
      query += ' ORDER BY r.is_verified_purchase DESC, r.helpful_count DESC, r.created_at DESC';
      query += ` LIMIT ${limit} OFFSET ${offset}`;
      const [rows] = await pool.execute<RowDataPacket[]>(query, params);

      let countQuery = `SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'approved'`;
      const countParams: any[] = [productId];
      if (rating) { countQuery += ' AND rating = ?'; countParams.push(rating); }
      const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
      const total = Number(countRows[0].total);

      res.json({ stats, reviews: rows.map(this.mapReview), total, page, totalPages: Math.ceil(total / limit) });
     } catch (error: any) {
    console.error('❌ getByProduct ERROR:', error.message, error.stack);
    res.status(500).json({ message: error.message });
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
         WHERE o.user_id = ? AND od.product_id = ? AND o.status IN ('delivered', 'completed')
         LIMIT 1`,
        [userId, productId]
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
      const { productId, rating, title, comment } = req.body;
      const userId = req.user.userId;

      if (!productId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Thiếu thông tin hoặc rating không hợp lệ (1-5)' });
      }

      // ✅ BẮT BUỘC: Kiểm tra đã mua hàng và user đã xác nhận nhận hàng (completed)
      const [orderRows] = await pool.execute<RowDataPacket[]>(
        `SELECT od.order_detail_id, od.order_id
         FROM order_details od
         JOIN orders o ON o.order_id = od.order_id
         WHERE o.user_id = ? AND od.product_id = ? AND o.status IN ('delivered', 'completed')
         LIMIT 1`,
        [userId, productId]
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
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'pending')`,
        [productId, userId, orderId, orderDetailId, rating, title || null, comment || null]
      );

      res.status(201).json({ reviewId: result.insertId, message: 'Đánh giá đang chờ duyệt' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      await pool.execute('UPDATE reviews SET status = ?, updated_at = NOW() WHERE review_id = ?', [status, req.params.reviewId]);
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
      createdAt: row.created_at,
    };
  }
}