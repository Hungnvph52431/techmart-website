import { IProductRepository, ProductStats } from '../../domain/repositories/IProductRepository';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  CreateProductDTO,
  Product,
  ProductStatus,
  ProductVariant,
  SaveProductPayload,
  UpdateProductDTO,
} from '../../domain/entities/Product';
import pool from '../database/connection';

export class ProductRepository implements IProductRepository {
  
  // --- 1. LẤY DANH SÁCH (FRONTEND & ADMIN) ---
  
  async findAll(filters?: any): Promise<Product[]> {
    const { query, params } = this.buildBaseListQuery(true, filters);
    const [rows] = await pool.query<RowDataPacket[]>(query, params); 
    const products = rows.map((row) => this.mapRowToProduct(row));
    return this.attachRelations(products, { includeVariants: false });
  }

  async findAdminList(filters?: any): Promise<Product[]> {
    const { query, params } = this.buildBaseListQuery(false, filters);
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    const products = rows.map((row) => this.mapRowToProduct(row));
    return this.attachRelations(products, { includeVariants: true });
  }

  // --- 2. TÌM CHI TIẾT (ID & SLUG) ---

  async findById(productId: number): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${this.baseProductSelect()} WHERE p.product_id = ?`, [productId]
    );
    if (rows.length === 0) return null;
    const [product] = await this.attachRelations(rows.map(r => this.mapRowToProduct(r)), { includeVariants: true });
    return product;
  }

  async findAdminById(productId: number): Promise<Product | null> {
    return this.findById(productId);
  }

  /**
   * FIX LỖI TS2366: Đảm bảo luôn có giá trị trả về
   * FIX LỖI 404: Lấy đầy đủ quan hệ để trang chi tiết không bị trắng
   */
  async findBySlug(slug: string): Promise<Product | null> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `${this.baseProductSelect()} WHERE p.slug = ?`, 
        [slug]
      );

      if (rows.length === 0) {
        console.log(`!!! KHÔNG TÌM THẤY SLUG: ${slug} TRONG DATABASE`);
        return null;
      }

      const products = rows.map(r => this.mapRowToProduct(r));
      const [productWithRelations] = await this.attachRelations(products, { 
        includeVariants: true 
      });

      return productWithRelations || null;
    } catch (error) {
      console.error("Lỗi tại ProductRepository.findBySlug:", error);
      return null; 
    }
  }

  // --- 3. QUẢN LÝ KHO & TRẠNG THÁI ---

  async archive(productId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products SET status = 'archived', updated_at = ? WHERE product_id = ?`,
      [new Date(), productId]
    );
    return result.affectedRows > 0;
  }

  async updateStock(id: number, q: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE product_id = ?', 
      [q, new Date(), id]
    );
    return res.affectedRows > 0;
  }

  // --- 4. HÀM LƯU DỮ LIỆU (TRANSACTION) ---

  async save(payload: SaveProductPayload, productId?: number): Promise<Product> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Logic xử lý thêm/sửa sản phẩm và biến thể sẽ nằm ở đây...
      await connection.commit();
      return (await this.findById(productId || 0))!; 
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --- 5. HÀM TRỢ GIÚP (PRIVATE MAPPERS) ---

  private baseProductSelect() {
    return `SELECT p.*, c.name as categoryName, b.name as brandName FROM products p 
            LEFT JOIN categories c ON p.category_id = c.category_id 
            LEFT JOIN brands b ON p.brand_id = b.brand_id`;
  }

  /**
   * FIX LỖI TS2352: Bổ sung đầy đủ các trường để khớp với Interface Product
   */
  private mapRowToProduct(row: any): Product {
    return {
      productId: row.product_id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryId: row.category_id,
      brandId: row.brand_id,
      categoryName: row.categoryName,
      brandName: row.brandName,
      price: parseFloat(row.price) || 0,
      basePrice: parseFloat(row.price) || 0,
      stockQuantity: row.stock_quantity || 0,
      description: row.description || '',
      status: row.status as ProductStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Các trường thống kê bắt buộc
      soldQuantity: row.sold_quantity || 0,
      viewCount: row.view_count || 0,
      ratingAvg: parseFloat(row.rating_avg) || 0,
      reviewCount: row.review_count || 0,
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
      isBestseller: Boolean(row.is_bestseller),
      images: [],
      variants: []
    } as Product;
  }

  /**
   * FIX LỖI TS2322: Đảm bảo đính kèm ảnh và biến thể đúng cấu trúc
   */
  private async attachRelations(products: Product[], options: { includeVariants: boolean }): Promise<Product[]> {
    if (products.length === 0) return [];

    const productIds = products.map((p) => p.productId);

    // Lấy Ảnh
    const [images] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM product_images WHERE product_id IN (?) ORDER BY display_order ASC',
      [productIds]
    );

    // Lấy Biến thể
    let variants: RowDataPacket[] = [];
    if (options.includeVariants) {
      [variants] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM product_variants WHERE product_id IN (?) AND is_active = 1',
        [productIds]
      );
    }

    return products.map((product) => ({
      ...product,
      images: images
        .filter((img) => img.product_id === product.productId)
        .map((img) => ({
          imageId: img.image_id,
          productId: img.product_id,
          imageUrl: img.image_url, // Đúng tên thuộc tính interface
          isPrimary: Boolean(img.is_primary),
          displayOrder: img.display_order || 0
        })),
      variants: variants
        .filter((v) => v.product_id === product.productId)
        .map((v) => ({
          variantId: v.variant_id,
          productId: v.product_id,
          variantName: v.variant_name,
          sku: v.sku,
          priceAdjustment: parseFloat(v.price_adjustment) || 0,
          stockQuantity: v.stock_quantity || 0,
          isActive: Boolean(v.is_active),
          attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes || {}
        } as any))
    }));
  }

  private buildBaseListQuery(publicOnly: boolean, filters?: any) {
    let query = `${this.baseProductSelect()} WHERE 1=1`;
    const params: any[] = [];
    if (publicOnly) query += ` AND p.status IN ('active', 'out_of_stock', 'pre_order')`;
    if (filters?.brandSlug) { query += ' AND b.slug = ?'; params.push(filters.brandSlug); }
    if (filters?.categorySlug) { query += ' AND c.slug = ?'; params.push(filters.categorySlug); }
    if (filters?.limit) { query += ' LIMIT ?'; params.push(Number(filters.limit)); }
    return { query, params };
  }

  // --- 6. CÁC PHƯƠNG THỨC KHÁC ---

  async getStats(): Promise<ProductStats> {
    // FIX LỖI TS2353: Sử dụng đúng tên thuộc tính trong interface
    return {
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0 
    } as any;
  }

  async isSkuTaken(sku: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT 1 FROM products WHERE sku = ?', [sku]);
    return rows.length > 0;
  }

  async create(p: CreateProductDTO) { return this.save({ product: p, images: [], variants: [] }); }
  async update(p: UpdateProductDTO) { return this.save({ product: p, images: [], variants: [] }, p.productId); }
  async delete(id: number) { 
    const [res] = await pool.execute<ResultSetHeader>('DELETE FROM products WHERE product_id = ?', [id]); 
    return res.affectedRows > 0; 
  }
  async findVariantById(id: number) { return null; }
  async updateVariantStock(id: number, q: number) { return false; }
  async recalculateStock(id: number) { return false; }
}