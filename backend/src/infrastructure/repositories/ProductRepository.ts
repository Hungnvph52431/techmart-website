import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../domain/entities/Product';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProductRepository implements IProductRepository {
  async findAll(filters?: {
    categoryId?: number;
    brandId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isFeatured?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    status?: string;
  }): Promise<Product[]> {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (filters?.categoryId) {
      query += ' AND category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters?.brandId) {
      query += ' AND brand_id = ?';
      params.push(filters.brandId);
    }
    if (filters?.minPrice) {
      query += ' AND price >= ?';
      params.push(filters.minPrice);
    }
    if (filters?.maxPrice) {
      query += ' AND price <= ?';
      params.push(filters.maxPrice);
    }
    if (filters?.search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.isFeatured !== undefined) {
      query += ' AND is_featured = ?';
      params.push(filters.isFeatured ? 1 : 0);
    }
    if (filters?.isNew !== undefined) {
      query += ' AND is_new = ?';
      params.push(filters.isNew ? 1 : 0);
    }
    if (filters?.isBestseller !== undefined) {
      query += ' AND is_bestseller = ?';
      params.push(filters.isBestseller ? 1 : 0);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map(this.mapRowToProduct);
  }

  async findById(productId: number): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM products WHERE product_id = ?',
      [productId]
    );
    return rows.length > 0 ? this.mapRowToProduct(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM products WHERE slug = ?',
      [slug]
    );
    return rows.length > 0 ? this.mapRowToProduct(rows[0]) : null;
  }

  async create(product: CreateProductDTO): Promise<Product> {
    const now = new Date();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products (name, slug, sku, category_id, brand_id, price, sale_price, 
       cost_price, description, specifications, main_image, stock_quantity, is_featured, 
       is_new, is_bestseller, status, meta_title, meta_description, meta_keywords, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name,
        product.slug,
        product.sku,
        product.categoryId,
        product.brandId || null,
        product.price,
        product.salePrice || null,
        product.costPrice || null,
        product.description || null,
        product.specifications ? JSON.stringify(product.specifications) : null,
        product.mainImage || null,
        product.stockQuantity || 0,
        product.isFeatured || false,
        product.isNew || false,
        product.isBestseller || false,
        product.status || 'active',
        product.metaTitle || null,
        product.metaDescription || null,
        product.metaKeywords || null,
        now,
        now,
      ]
    );

    return {
      productId: result.insertId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.categoryId,
      brandId: product.brandId,
      price: product.price,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      description: product.description,
      specifications: product.specifications,
      mainImage: product.mainImage,
      stockQuantity: product.stockQuantity || 0,
      soldQuantity: 0,
      viewCount: 0,
      ratingAvg: 0,
      reviewCount: 0,
      isFeatured: product.isFeatured || false,
      isNew: product.isNew || false,
      isBestseller: product.isBestseller || false,
      status: product.status || 'active',
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      metaKeywords: product.metaKeywords,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(product: UpdateProductDTO): Promise<Product | null> {
    const existing = await this.findById(product.productId);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (product.name) {
      updates.push('name = ?');
      params.push(product.name);
    }
    if (product.slug) {
      updates.push('slug = ?');
      params.push(product.slug);
    }
    if (product.sku) {
      updates.push('sku = ?');
      params.push(product.sku);
    }
    if (product.categoryId) {
      updates.push('category_id = ?');
      params.push(product.categoryId);
    }
    if (product.brandId !== undefined) {
      updates.push('brand_id = ?');
      params.push(product.brandId);
    }
    if (product.price) {
      updates.push('price = ?');
      params.push(product.price);
    }
    if (product.salePrice !== undefined) {
      updates.push('sale_price = ?');
      params.push(product.salePrice);
    }
    if (product.costPrice !== undefined) {
      updates.push('cost_price = ?');
      params.push(product.costPrice);
    }
    if (product.description !== undefined) {
      updates.push('description = ?');
      params.push(product.description);
    }
    if (product.specifications) {
      updates.push('specifications = ?');
      params.push(JSON.stringify(product.specifications));
    }
    if (product.mainImage !== undefined) {
      updates.push('main_image = ?');
      params.push(product.mainImage);
    }
    if (product.stockQuantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(product.stockQuantity);
    }
    if (product.isFeatured !== undefined) {
      updates.push('is_featured = ?');
      params.push(product.isFeatured);
    }
    if (product.isNew !== undefined) {
      updates.push('is_new = ?');
      params.push(product.isNew);
    }
    if (product.isBestseller !== undefined) {
      updates.push('is_bestseller = ?');
      params.push(product.isBestseller);
    }
    if (product.status) {
      updates.push('status = ?');
      params.push(product.status);
    }
    if (product.metaTitle !== undefined) {
      updates.push('meta_title = ?');
      params.push(product.metaTitle);
    }
    if (product.metaDescription !== undefined) {
      updates.push('meta_description = ?');
      params.push(product.metaDescription);
    }
    if (product.metaKeywords !== undefined) {
      updates.push('meta_keywords = ?');
      params.push(product.metaKeywords);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(product.productId);

    await pool.execute(
      `UPDATE products SET ${updates.join(', ')} WHERE product_id = ?`,
      params
    );

    return this.findById(product.productId);
  }

  async delete(productId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM products WHERE product_id = ?',
      [productId]
    );
    return result.affectedRows > 0;
  }

  async updateStock(productId: number, quantity: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
      [quantity, productId]
    );
    return result.affectedRows > 0;
  }

  private mapRowToProduct(row: any): Product {
    return {
      productId: row.product_id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryId: row.category_id,
      brandId: row.brand_id,
      price: parseFloat(row.price),
      salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
      costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
      description: row.description,
      specifications: typeof row.specifications === 'string' 
        ? JSON.parse(row.specifications) 
        : row.specifications,
      mainImage: row.main_image,
      stockQuantity: row.stock_quantity,
      soldQuantity: row.sold_quantity,
      viewCount: row.view_count,
      ratingAvg: row.rating_avg ? parseFloat(row.rating_avg) : 0,
      reviewCount: row.review_count,
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
      isBestseller: Boolean(row.is_bestseller),
      status: row.status,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      metaKeywords: row.meta_keywords,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
