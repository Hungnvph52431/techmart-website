import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../domain/entities/Product';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProductRepository implements IProductRepository {
 async findAll(filters?: {
    productId?: number;
    categoryId?: number;
    categorySlug?: string; 
    brandId?: number;
    brandSlug?: string;    
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isFeatured?: boolean; 
    isNew?: boolean;
    isBestseller?: boolean;
    status?: string;
    limit?: number;        
    offset?: number;
  }): Promise<Product[]> {
    // 1. ĐÃ SỬA TẠI ĐÂY: Thêm c.slug và b.slug vào lệnh SELECT
    let query = `
      SELECT 
        p.*, 
        c.name as categoryName, 
        c.slug as categorySlug,
        b.name as brandName,
        b.slug as brandSlug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // 2. Xử lý lọc theo ID hoặc Slug (Dành cho SEO URL)
    if (filters?.categoryId) {
      query += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    } else if (filters?.categorySlug) {
      query += ' AND c.slug = ?';
      params.push(filters.categorySlug);
    }

    // Lọc theo Hãng (Ví dụ: apple, samsung)
    if (filters?.brandId) {
      query += ' AND p.brand_id = ?';
      params.push(filters.brandId);
    } else if (filters?.brandSlug) {
      query += ' AND b.slug = ?';
      params.push(filters.brandSlug);
    }

    if (filters?.search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.isFeatured !== undefined) {
      query += ' AND p.is_featured = ?';
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters?.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY p.created_at DESC';

    // KIỂM TRA CHẶT CHẼ: 0 là giá trị hợp lệ cho offset nên phải dùng !== undefined
    if (filters?.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters?.offset !== undefined) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    // DÙNG .query THAY VÌ .execute ĐỂ TRÁNH LỖI ER_WRONG_ARGUMENTS
    const [rows] = await pool.query<RowDataPacket[]>(query, params); 
    return rows.map(row => this.mapRowToProduct(row));
  }

  async findById(productId: number): Promise<Product | null> {
    const query = `
      SELECT p.*, c.name as categoryName, b.name as brandName 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_id = ?
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [productId]);
    return rows.length > 0 ? this.mapRowToProduct(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const query = `
      SELECT p.*, c.name as categoryName, b.name as brandName, b.slug as brandSlug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.slug = ?
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [slug]);
    return rows.length > 0 ? this.mapRowToProduct(rows[0]) : null;
  }

  async create(product: CreateProductDTO): Promise<Product> {
    const now = new Date();
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products (name, slug, sku, category_id, brand_id, price, sale_price, 
       description, specifications, main_image, stock_quantity, is_featured, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name, product.slug, product.sku, product.categoryId, product.brandId || null,
        product.price, product.salePrice || null, product.description || null,
        product.specifications ? JSON.stringify(product.specifications) : null,
        product.mainImage || null, product.stockQuantity || 0,
        product.isFeatured || false, product.status || 'active', now, now
      ]
    );

    return this.findById(result.insertId) as unknown as Product;
  }

  async update(product: UpdateProductDTO): Promise<Product | null> {
    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      { key: 'name', value: product.name },
      { key: 'slug', value: product.slug },
      { key: 'price', value: product.price },
      { key: 'sale_price', value: product.salePrice },
      { key: 'brand_id', value: product.brandId },
      { key: 'category_id', value: product.categoryId },
      { key: 'status', value: product.status },
      { key: 'is_featured', value: product.isFeatured }
    ];

    fields.forEach(field => {
      if (field.value !== undefined) {
        updates.push(`${field.key} = ?`);
        params.push(field.value);
      }
    });

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(product.productId);

    await pool.execute(`UPDATE products SET ${updates.join(', ')} WHERE product_id = ?`, params);
    return this.findById(product.productId);
  }

  async delete(productId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM products WHERE product_id = ?', [productId]);
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
  let specs = {};
  try {
    // Chống sập khi gặp specifications bị rỗng hoặc lỗi JSON
    if (typeof row.specifications === 'string' && row.specifications.trim() !== "") {
      specs = JSON.parse(row.specifications);
    }
  } catch (e) {
    specs = {}; 
  }

  return {
    productId: row.product_id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.category_id,
    brandId: row.brand_id,
    price: parseFloat(row.price) || 0,
    salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
    mainImage: row.main_image,
    stockQuantity: row.stock_quantity || 0,
    soldQuantity: row.sold_quantity || 0,
    viewCount: row.view_count || 0,
    isNew: Boolean(row.is_new),
    isBestseller: Boolean(row.is_bestseller),
    ratingAvg: row.rating_avg ? parseFloat(row.rating_avg) : 0,
    reviewCount: row.review_count || 0,
    isFeatured: Boolean(row.is_featured),
    status: row.status,
    categoryName: row.categoryName,
    brandName: row.brandName,
    brandSlug: row.brandSlug,
    specifications: specs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
}

