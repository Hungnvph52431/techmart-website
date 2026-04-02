import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';
import {
  IWishlistRepository,
  WishlistProductSummary,
} from '../../domain/repositories/IWishlistRepository';

const RESERVED_ORDER_STATUSES_SQL = `'pending', 'confirmed', 'processing', 'shipping'`;

export class WishlistRepository implements IWishlistRepository {
  async findProductIdsByUserId(userId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT w.product_id
       FROM wishlists w
       INNER JOIN products p ON p.product_id = w.product_id
       WHERE w.user_id = ?
         AND p.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [userId]
    );

    return rows.map((row) => Number(row.product_id));
  }

  async findProductsByUserId(userId: number): Promise<WishlistProductSummary[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.product_id,
         p.name,
         p.slug,
         p.sku,
         p.category_id,
         c.name AS category_name,
         p.brand_id,
         b.name AS brand_name,
         p.price,
         p.sale_price,
         p.main_image,
         p.stock_quantity,
         GREATEST(
           p.stock_quantity - COALESCE((
             SELECT SUM(od.quantity)
             FROM order_details od
             INNER JOIN orders o ON o.order_id = od.order_id
             WHERE od.product_id = p.product_id
               AND od.variant_id IS NULL
               AND o.status IN (${RESERVED_ORDER_STATUSES_SQL})
           ), 0),
           0
         ) AS available_stock_quantity,
         p.sold_quantity,
         p.view_count,
         p.rating_avg,
         p.review_count,
         (
           SELECT COUNT(*)
           FROM product_variants pv
           WHERE pv.product_id = p.product_id
             AND pv.is_active = 1
         ) AS variant_count,
         p.is_featured,
         p.is_new,
         p.is_bestseller,
         p.status,
         p.created_at,
         p.updated_at
       FROM wishlists w
       INNER JOIN products p ON p.product_id = w.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       WHERE w.user_id = ?
         AND p.deleted_at IS NULL
       ORDER BY w.created_at DESC`,
      [userId]
    );

    return rows.map((row) => ({
      productId: Number(row.product_id),
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryId: Number(row.category_id),
      categoryName: row.category_name || '',
      brandId: row.brand_id != null ? Number(row.brand_id) : undefined,
      brandName: row.brand_name || '',
      price: Number(row.price ?? 0),
      salePrice: row.sale_price != null ? Number(row.sale_price) : undefined,
      mainImage: row.main_image || '',
      stockQuantity: Number(row.stock_quantity ?? 0),
      availableStockQuantity: Number(row.available_stock_quantity ?? row.stock_quantity ?? 0),
      soldQuantity: Number(row.sold_quantity ?? 0),
      viewCount: Number(row.view_count ?? 0),
      ratingAvg: Number(row.rating_avg ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      hasVariants: Number(row.variant_count ?? 0) > 0,
      variantCount: Number(row.variant_count ?? 0),
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
      isBestseller: Boolean(row.is_bestseller),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async productExists(productId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM products WHERE product_id = ? AND deleted_at IS NULL LIMIT 1',
      [productId]
    );

    return rows.length > 0;
  }

  async add(userId: number, productId: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );
  }

  async remove(userId: number, productId: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
  }
}
