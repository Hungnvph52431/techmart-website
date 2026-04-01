import { IProductRepository, ProductFilters, PaginatedResult, ProductStats } from '../../domain/repositories/IProductRepository';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductStatus,
  ProductVariant,
  SaveProductPayload
} from '../../domain/entities/Product';
import { ProductImage, CreateProductImageDTO } from '../../domain/entities/ProductImage';
import { CreateProductVariantDTO, UpdateProductVariantDTO } from '../../domain/entities/ProductVariant';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';

export class ProductRepository implements IProductRepository {
  private pool = pool; // Khai báo pool để thực thi SQL
  // --- 1. TRUY VẤN DANH SÁCH (FRONTEND & ADMIN) ---

 async findAll(filters?: any): Promise<Product[]> {
  const { query, params } = this.buildBaseListQuery(true, filters);
  const fullSql = `SELECT p.*, c.name as categoryName, b.name as brandName ${query} ORDER BY p.created_at DESC`;
  const [rows] = await this.pool.query<RowDataPacket[]>(fullSql, params);
  const products = rows.map(row => this.mapRowToProduct(row));
  return this.attachRelations(products, { includeVariants: false });
}

  // Thêm tính năng phân trang từ bản Tuấn Anh
 async findAllPaginated(filters: any, page: number, limit: number): Promise<PaginatedResult<Product>> {
  const offset = (Number(page) - 1) * Number(limit);
  const { query, params } = this.buildBaseListQuery(true, filters);

  const dataSql = `SELECT p.*, c.name as categoryName, b.name as brandName ${query} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  const [rows] = await this.pool.query<RowDataPacket[]>(dataSql, [...params, Number(limit), Number(offset)]);

  const countSql = `SELECT COUNT(*) as total ${query}`;
  const [countResult]: any = await this.pool.query(countSql, params);
  const total = countResult[0].total;

  const products = rows.map(row => this.mapRowToProduct(row));
  const productsWithImages = await this.attachRelations(products, { includeVariants: false });

  return {
    data: productsWithImages,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit)
  };
}

  async findAdminList(filters?: any): Promise<Product[]> {
    const { query, params } = this.buildBaseListQuery(false, filters);
    const fullSql = `SELECT p.*, c.name as categoryName, b.name as brandName ${query} ORDER BY p.created_at DESC`;
    const [rows] = await pool.execute<RowDataPacket[]>(fullSql, params);
    const products = rows.map((row) => this.mapRowToProduct(row));
    return this.attachRelations(products, { includeVariants: true });
  }

  // --- 2. TÌM CHI TIẾT (ID & SLUG) ---

  async findById(id: number): Promise<Product | null> {
    const [rows]: any = await this.pool.execute('SELECT * FROM products WHERE product_id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async findAdminById(productId: number): Promise<Product | null> {
  // 1. Lấy thông tin sản phẩm + category + brand
  const [rows] = await this.pool.execute<RowDataPacket[]>(
    `SELECT p.*,
      c.name as categoryName, c.slug as categorySlug,
      b.name as brandName, b.slug as brandSlug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.category_id
     LEFT JOIN brands b ON p.brand_id = b.brand_id
     WHERE p.product_id = ? AND p.deleted_at IS NULL`,
    [productId]
  );

  if ((rows as any[]).length === 0) return null;
  const product = this.mapRowToProduct(rows[0]);

  // 2. Load ảnh sản phẩm
  const [images] = await this.pool.execute<RowDataPacket[]>(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC, is_primary DESC',
    [productId]
  );

  // 3. Load biến thể (bao gồm cả inactive để admin thấy đủ)
  const [variants] = await this.pool.execute<RowDataPacket[]>(
    'SELECT * FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC',
    [productId]
  );

  return {
    ...product,
    images: (images as any[]).map(img => ({
      imageId: img.image_id,
      productId: img.product_id,
      imageUrl: img.image_url,
      altText: img.alt_text || '',
      displayOrder: img.display_order,
      isPrimary: Boolean(img.is_primary),
      createdAt: img.created_at,
    })),
    variants: (variants as any[]).map(v => ({
      variantId: v.variant_id,
      productId: v.product_id,
      variantName: v.variant_name,
      sku: v.sku,
      // Parse attributes JSON nếu lưu dạng string
      attributes: (() => {
        try {
          return typeof v.attributes === 'string'
            ? JSON.parse(v.attributes)
            : (v.attributes || {});
        } catch { return {}; }
      })(),
      priceAdjustment: parseFloat(v.price_adjustment) || 0,
      stockQuantity: v.stock_quantity || 0,
      imageUrl: v.image_url || '',
      isActive: Boolean(v.is_active),
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    })),
    // Parse specifications JSON
    specifications: (() => {
      try {
        const spec = rows[0].specifications;
        return typeof spec === 'string' ? JSON.parse(spec) : (spec || {});
      } catch { return {}; }
    })(),
  } as any;
}

  async findBySlug(slug: string): Promise<Product | null> {
  const [rows] = await this.pool.execute<RowDataPacket[]>(
    `SELECT p.*, c.name as categoryName, b.name as brandName
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.category_id
     LEFT JOIN brands b ON p.brand_id = b.brand_id
     WHERE p.slug = ? AND p.deleted_at IS NULL`,
    [slug]
  );

  if (rows.length === 0) return null;

  const product = this.mapRowToProduct(rows[0]);

  // Load ảnh và variants
  const [images] = await this.pool.execute<RowDataPacket[]>(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC',
    [product.productId]
  );

  const [variants] = await this.pool.execute<RowDataPacket[]>(
    'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1',
    [product.productId]
  );

  // Parse specifications JSON
  const specs = (() => {
    try {
      const s = rows[0].specifications;
      return typeof s === 'string' ? JSON.parse(s) : (s || null);
    } catch { return null; }
  })();

  return {
    ...product,
    specifications: specs,
    images: images.map(this.mapRowToProductImage),
    variants: (variants as any[]).map(v => ({
      variantId:       v.variant_id,
      productId:       v.product_id,
      variantName:     v.variant_name,
      sku:             v.sku,
      // Parse attributes JSON
      attributes: (() => {
        try {
          return typeof v.attributes === 'string'
            ? JSON.parse(v.attributes)
            : (v.attributes || {});
        } catch { return {}; }
      })(),
      priceAdjustment: parseFloat(v.price_adjustment) || 0,
      stockQuantity:   v.stock_quantity || 0,
      imageUrl:        v.image_url || '',
      isActive:        Boolean(v.is_active),
    })),
  } as any;
}

  // --- 3. QUẢN LÝ ẢNH (BÍ QUYẾT HIỆN ẢNH CỦA TUẤN ANH) ---

  async findImages(productId: number): Promise<ProductImage[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC', [productId]
    );
    return rows.map(this.mapRowToProductImage);
  }

  async deleteImage(imageId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM product_images WHERE image_id = ?', [imageId]);
    return result.affectedRows > 0;
  }

  // --- 4. QUẢN LÝ BIẾN THỂ (VARIANTS) ---

  async findVariants(productId: number): Promise<ProductVariant[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1', [productId]
    );
    return rows.map(this.mapRowToProductVariant);
  }

  async findVariantById(id: number): Promise<ProductVariant | null> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM product_variants WHERE variant_id = ?', [id]);
    return rows.length > 0 ? this.mapRowToProductVariant(rows[0]) : null;
  }

  async addVariant(v: CreateProductVariantDTO): Promise<ProductVariant> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_variants (product_id, variant_name, sku, price_adjustment, stock_quantity) VALUES (?, ?, ?, ?, ?)`,
      [v.productId, v.variantName, v.sku, v.priceAdjustment, v.stockQuantity] as any
    );
    return { ...v, variantId: res.insertId } as any;
  }

  async updateVariant(v: UpdateProductVariantDTO): Promise<ProductVariant | null> {
    await pool.execute(`UPDATE product_variants SET variant_name = ?, price_adjustment = ? WHERE variant_id = ?`,
      [v.variantName, v.priceAdjustment, v.variantId] as any);
    return this.findVariantById(v.variantId);
  }

  async deleteVariant(id: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>('DELETE FROM product_variants WHERE variant_id = ?', [id]);
    return res.affectedRows > 0;
  }

  // --- 5. HÀM LƯU DỮ LIỆU & THỐNG KÊ (CỦA KHANH) ---
async getImages(productId: number): Promise<ProductImage[]> {
    const [rows] = await this.pool.execute('SELECT * FROM product_images WHERE product_id = ?', [productId]);
    return rows as ProductImage[];
  }

async addImage(data: CreateProductImageDTO): Promise<ProductImage> {
  const [result] = await this.pool.execute<ResultSetHeader>(
    'INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
    [data.productId, data.imageUrl, data.altText || '', data.displayOrder ?? 0, data.isPrimary ? 1 : 0]
  );
  return {
    imageId: result.insertId,
    ...data,
    createdAt: new Date()
  } as ProductImage;
}


  async save(payload: SaveProductPayload, productId?: number): Promise<Product> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const p = payload.product;
    const specsJson = p.specifications ? JSON.stringify(p.specifications) : null;
    const isNew = !productId;

    if (isNew) {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO products (
          name, slug, sku, category_id, brand_id,
          price, sale_price, cost_price, stock_quantity,
          description, specifications, main_image, status,
          is_featured, is_new, is_bestseller,
          meta_title, meta_description, meta_keywords
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.name, p.slug, p.sku,
          p.categoryId, p.brandId || null,
          p.price, p.salePrice || null, p.costPrice || null,
          p.stockQuantity || 0,
          p.description || '', specsJson,
          p.mainImage || '', p.status || 'draft',
          p.isFeatured ? 1 : 0, p.isNew ? 1 : 0, p.isBestseller ? 1 : 0,
          p.metaTitle || null, p.metaDescription || null, p.metaKeywords || null,
        ] as any
      );
      productId = result.insertId;
    } else {
      await connection.execute(
        `UPDATE products SET
          name = ?, slug = ?, sku = ?, category_id = ?, brand_id = ?,
          price = ?, sale_price = ?, cost_price = ?, stock_quantity = ?,
          description = ?, specifications = ?, main_image = ?, status = ?,
          is_featured = ?, is_new = ?, is_bestseller = ?,
          meta_title = ?, meta_description = ?, meta_keywords = ?
        WHERE product_id = ?`,
        [
          p.name, p.slug, p.sku,
          p.categoryId, p.brandId || null,
          p.price, p.salePrice || null, p.costPrice || null,
          p.stockQuantity || 0,
          p.description || '', specsJson,
          p.mainImage || '', p.status || 'draft',
          p.isFeatured ? 1 : 0, p.isNew ? 1 : 0, p.isBestseller ? 1 : 0,
          p.metaTitle || null, p.metaDescription || null, p.metaKeywords || null,
          productId,
        ] as any
      );
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [productId] as any);
      await connection.execute('DELETE FROM product_variants WHERE product_id = ?', [productId] as any);
    }

    // Lưu ảnh
    if (payload.images?.length) {
      for (let i = 0; i < payload.images.length; i++) {
        const img = payload.images[i];
        if (!img.imageUrl) continue;
        await connection.execute(
          'INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
          [productId, img.imageUrl, img.altText || '', i, img.isPrimary ? 1 : 0] as any
        );
      }
    }

    // Lưu biến thể
    if (payload.variants?.length) {
      for (const v of payload.variants) {
        if (!v.variantName || !v.sku) continue;
        await connection.execute(
          `INSERT INTO product_variants
            (product_id, variant_name, sku, attributes, price_adjustment, stock_quantity, image_url, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId, v.variantName, v.sku,
            JSON.stringify(v.attributes || {}),
            v.priceAdjustment || 0,
            v.stockQuantity || 0,
            v.imageUrl || '',
            v.isActive ? 1 : 0,
          ] as any
        );
      }
    }

    await connection.commit();
    return (await this.findAdminById(productId!))!;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async create(data: any): Promise<Product> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO products (
        name, slug, sku, category_id, brand_id,
        price, sale_price, cost_price, stock_quantity,
        description, main_image, status,
        is_featured, is_new, is_bestseller,
        meta_title, meta_description, meta_keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name, data.slug, data.sku,
        data.category_id || data.categoryId,
        data.brand_id || data.brandId || null,
        data.price, data.sale_price || data.salePrice || null,
        data.cost_price || data.costPrice || null,
        data.stock_quantity || data.stockQuantity || 0,
        data.description || '',
        data.main_image || data.mainImage || '',
        data.status || 'active',
        data.is_featured || data.isFeatured || 0,
        data.is_new || data.isNew || 0,
        data.is_bestseller || data.isBestseller || 0,
        data.meta_title || data.metaTitle || null,
        data.meta_description || data.metaDescription || null,
        data.meta_keywords || data.metaKeywords || null
      ]
    );
    const newProduct = await this.findById(result.insertId);
    return newProduct!;
}

async update(data: any): Promise<Product | null> {
  const id = data.productId;

  await this.pool.execute(
    `UPDATE products SET
      name = ?, slug = ?, sku = ?, category_id = ?,
      price = ?, sale_price = ?, stock_quantity = ?,
      status = ?, main_image = ?, description = ?,
      is_featured = ?, is_new = ?, is_bestseller = ?
     WHERE product_id = ?`,
    [
      data.name, data.slug, data.sku,
      data.category_id || data.categoryId,
      data.price, data.sale_price || data.salePrice || null,
      data.stock_quantity || data.stockQuantity,
      data.status, data.main_image || data.mainImage || '',
      data.description || '',
      data.is_featured ?? data.isFeatured ?? 0,
      data.is_new ?? data.isNew ?? 0,
      data.is_bestseller ?? data.isBestseller ?? 0,
      id
    ]
  );

  return this.findById(Number(id));
}

async delete(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE products SET status = ? WHERE product_id = ? AND deleted_at IS NULL',
      ['inactive', id]
    );
    return result.affectedRows > 0;
  }

  async hardDelete(id: number): Promise<boolean> {
    // Xóa hẳn: set deleted_at để soft-delete khỏi DB
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE products SET deleted_at = NOW() WHERE product_id = ? AND deleted_at IS NULL',
      [id]
    );
    return result.affectedRows > 0;
  }
  async getStats(): Promise<ProductStats> {
    // 1. Tổng quan + Giá trị tồn kho
    const [summary]: any = await this.pool.execute(`
      SELECT
        COUNT(*) as totalProducts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeProducts,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveProducts,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as outOfStockCount,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 5 THEN 1 ELSE 0 END) as lowStockCount,
        COALESCE(SUM(stock_quantity), 0) as totalStockUnits,
        COALESCE(SUM(stock_quantity * price), 0) as totalInventoryValue,
        COALESCE(SUM(sold_quantity), 0) as totalSoldUnits
      FROM products WHERE deleted_at IS NULL
    `);

    // 2. Top sản phẩm bán chạy
    const [topSelling]: any = await this.pool.execute(`
      SELECT product_id, name, sold_quantity, stock_quantity, main_image, price
      FROM products
      WHERE deleted_at IS NULL AND sold_quantity > 0
      ORDER BY sold_quantity DESC
      LIMIT 10
    `);

    // 3. Sản phẩm hết hàng / sắp hết (stock <= 5)
    const [lowStock]: any = await this.pool.execute(`
      SELECT product_id, name, stock_quantity, main_image
      FROM products
      WHERE deleted_at IS NULL AND status = 'active' AND stock_quantity <= 5
      ORDER BY stock_quantity ASC
      LIMIT 10
    `);

    // 4. Phân bổ theo danh mục
    const [categoryBreakdown]: any = await this.pool.execute(`
      SELECT c.name as categoryName, COUNT(p.product_id) as productCount,
             COALESCE(SUM(p.sold_quantity), 0) as totalSold
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.deleted_at IS NULL AND p.status = 'active'
      GROUP BY c.category_id, c.name
      ORDER BY totalSold DESC
      LIMIT 8
    `);

    return {
      ...summary[0],
      totalStockUnits: Number(summary[0].totalStockUnits),
      totalInventoryValue: parseFloat(summary[0].totalInventoryValue),
      totalSoldUnits: Number(summary[0].totalSoldUnits),
      topSellingProducts: topSelling.map((r: any) => ({
        productId: r.product_id,
        name: r.name,
        soldQuantity: r.sold_quantity,
        stockQuantity: r.stock_quantity,
        mainImage: r.main_image || null,
        price: parseFloat(r.price),
      })),
      lowStockProducts: lowStock.map((r: any) => ({
        productId: r.product_id,
        name: r.name,
        stockQuantity: r.stock_quantity,
        mainImage: r.main_image || null,
      })),
      categoryBreakdown: categoryBreakdown.map((r: any) => ({
        categoryName: r.categoryName || 'Chưa phân loại',
        productCount: Number(r.productCount),
        totalSold: Number(r.totalSold),
      })),
    };
  }
  async checkProductInUse(productId: number): Promise<{ inCart: number; inPendingOrders: number }> {
    const [cartRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM cart WHERE product_id = ?`, [productId]
    );
    const [orderRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT o.order_id) AS cnt FROM order_details od
       JOIN orders o ON o.order_id = od.order_id
       WHERE od.product_id = ? AND o.status IN ('pending', 'confirmed')`, [productId]
    );
    return {
      inCart: Number(cartRows[0]?.cnt || 0),
      inPendingOrders: Number(orderRows[0]?.cnt || 0),
    };
  }

  async archive(productId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products SET status = 'inactive' WHERE product_id = ? AND deleted_at IS NULL`, [productId]
    );
    return result.affectedRows > 0;
  }

  async updateStock(id: number, q: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [q, id]
    );
    return res.affectedRows > 0;
  }

  async updateVariantStock(id: number, q: number) { return false; }
  async recalculateStock(id: number) { return false; }
  async isSkuTaken(sku: string) { return false; }

  // --- 6. HÀM TRỢ GIÚP (PRIVATE) ---

  private baseProductSelect() {
    return `SELECT p.*, c.name as categoryName, b.name as brandName FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN brands b ON p.brand_id = b.brand_id`;
  }

  private mapRowToProduct(row: any): Product {
  return {
    productId: row.product_id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.category_id,
    brandId: row.brand_id,
    categoryName: row.categoryName || row.category_name,
    brandName: row.brandName || row.brand_name,
    price: parseFloat(row.price) || 0,
    salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
    costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
    stockQuantity: row.stock_quantity || 0,
    soldQuantity: row.sold_quantity || 0,
    viewCount: row.view_count || 0,
    ratingAvg: row.rating_avg ? parseFloat(row.rating_avg) : 0,
    reviewCount: row.review_count || 0,
    mainImage: row.main_image || '',
    description: row.description || '',
    status: row.status as ProductStatus,
    specifications: (() => {
      try {
        const s = row.specifications;
        return typeof s === 'string' ? JSON.parse(s) : (s || null);
      } catch { return null; }
    })(),
    isFeatured: Boolean(row.is_featured),
    isNew: Boolean(row.is_new),
    isBestseller: Boolean(row.is_bestseller),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: [],
    variants: []
  } as any;
}

  private mapRowToProductImage(row: any): ProductImage {
    return { imageId: row.image_id, productId: row.product_id, imageUrl: row.image_url, isPrimary: Boolean(row.is_primary), displayOrder: row.display_order, createdAt: row.created_at || new Date() };
  }

  private mapRowToProductVariant(row: any): ProductVariant {
    return {
      variantId:       row.variant_id,
      productId:       row.product_id,
      variantName:     row.variant_name,
      sku:             row.sku || '',
      attributes: (() => {
        try {
          const a = row.attributes;
          return typeof a === 'string' ? JSON.parse(a) : (a || {});
        } catch { return {}; }
      })(),
      priceAdjustment: parseFloat(row.price_adjustment) || 0,
      stockQuantity:   row.stock_quantity || 0,
      imageUrl:        row.image_url || '',
      isActive:        Boolean(row.is_active ?? 1),
    } as any;
  }

  private async attachRelations(products: Product[], options: { includeVariants: boolean }): Promise<Product[]> {
    if (products.length === 0) return [];
    const productIds = products.map((p) => p.productId);
    const [images] = await pool.query<RowDataPacket[]>('SELECT * FROM product_images WHERE product_id IN (?)', [productIds]);

    let variants: RowDataPacket[] = [];
    if (options.includeVariants) {
      [variants] = await pool.query<RowDataPacket[]>('SELECT * FROM product_variants WHERE product_id IN (?)', [productIds]);
    }

    return products.map((p) => ({
      ...p,
      images: images.filter((img) => img.product_id === p.productId).map(this.mapRowToProductImage),
      variants: variants.filter((v) => v.product_id === p.productId).map(this.mapRowToProductVariant)
    } as any));
  }

 private buildBaseListQuery(publicOnly: boolean, filters?: any) {
  let query = `
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN brands b ON p.brand_id = b.brand_id
    WHERE p.deleted_at IS NULL
  `;
  const params: any[] = [];

  if (publicOnly) {
    if (filters?.search) {
      // Khi tìm kiếm: hiển thị cả sản phẩm ngừng bán
      query += ` AND p.status IN ('active', 'out_of_stock', 'inactive')`;
    } else {
      // Trang chủ / danh sách bình thường: ẩn sản phẩm ngừng bán
      query += ` AND p.status IN ('active', 'out_of_stock')`;
    }
  }

  // 1. Lọc theo Danh mục (categoryId hoặc categorySlug)
  if (filters?.categoryId) {
    query += ' AND p.category_id = ?';
    params.push(Number(filters.categoryId));
  }
  if (filters?.categorySlug || filters?.category) {
    const slug = filters.categorySlug || filters.category;
    query += ` AND (c.slug = ? OR c.parent_id IN (SELECT cat.category_id FROM categories cat WHERE cat.slug = ?))`;
    params.push(slug, slug);
  }

  // 2. MỚI: Lọc theo Thương hiệu (brandId hoặc brandSlug)
  if (filters?.brandId) {
    query += ' AND p.brand_id = ?';
    params.push(Number(filters.brandId));
  }
  if (filters?.brandSlug || filters?.brand) {
    query += ' AND b.slug = ?';
    params.push(filters.brandSlug || filters.brand);
  }

  // 3. Lọc theo Tìm kiếm & 3 nút tích (Nổi bật, Mới, Bán chạy)
  if (filters?.search) {
    query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  // Lọc theo trạng thái (admin filter)
  if (filters?.status && filters.status !== 'all') {
    query += ' AND p.status = ?';
    params.push(filters.status);
  }

  if (filters?.isFeatured === true || filters?.featured === 'true') query += ' AND p.is_featured = 1';
  if (filters?.isNew === true || filters?.isNew === 'true') query += ' AND p.is_new = 1';
  if (filters?.isBestseller === true || filters?.isBestseller === 'true') query += ' AND p.is_bestseller = 1';
  if (filters?.onSale === true || filters?.onSale === 'true') query += ' AND p.sale_price IS NOT NULL AND p.sale_price < p.price';
 if (filters?.ram) {
    const ramValues = String(filters.ram).split(',').map(v => v.trim()).filter(Boolean);
    if (ramValues.length === 1) {
      query += ` AND JSON_UNQUOTE(JSON_EXTRACT(p.specifications, '$.ram')) = ?`;
      params.push(ramValues[0]);
    } else if (ramValues.length > 1) {
      query += ` AND JSON_UNQUOTE(JSON_EXTRACT(p.specifications, '$.ram')) IN (${ramValues.map(() => '?').join(',')})`;
      params.push(...ramValues);
    }
  }
  if (filters?.storage) {
    const storageValues = String(filters.storage).split(',').map(v => v.trim()).filter(Boolean);
    if (storageValues.length === 1) {
      query += ` AND JSON_CONTAINS(JSON_EXTRACT(p.specifications, '$.storage'), JSON_QUOTE(?))`;
      params.push(storageValues[0]);
    } else if (storageValues.length > 1) {
      const orClauses = storageValues.map(() => `JSON_CONTAINS(JSON_EXTRACT(p.specifications, '$.storage'), JSON_QUOTE(?))`);
      query += ` AND (${orClauses.join(' OR ')})`;
      params.push(...storageValues);
    }
  }
  if (filters?.chip) {
    const chipValues = String(filters.chip).split(',').map(v => v.trim()).filter(Boolean);
    if (chipValues.length === 1) {
      query += ` AND JSON_UNQUOTE(JSON_EXTRACT(p.specifications, '$.chip')) LIKE ?`;
      params.push(`%${chipValues[0]}%`);
    } else if (chipValues.length > 1) {
      const orClauses = chipValues.map(() => `JSON_UNQUOTE(JSON_EXTRACT(p.specifications, '$.chip')) LIKE ?`);
      query += ` AND (${orClauses.join(' OR ')})`;
      params.push(...chipValues.map(v => `%${v}%`));
    }
  }

  // 4. Lọc theo giá (minPrice / maxPrice)
  if (filters?.minPrice) {
    query += ` AND COALESCE(p.sale_price, p.price) >= ?`;
    params.push(Number(filters.minPrice));
  }
  if (filters?.maxPrice) {
    query += ` AND COALESCE(p.sale_price, p.price) <= ?`;
    params.push(Number(filters.maxPrice));
  }

  return { query, params };
}

}
