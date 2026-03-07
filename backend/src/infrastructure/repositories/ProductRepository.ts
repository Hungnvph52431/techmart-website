import { IProductRepository, ProductFilters, PaginatedResult } from '../../domain/repositories/IProductRepository';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../domain/entities/Product';
import { ProductImage, CreateProductImageDTO } from '../../domain/entities/ProductImage';
import { ProductVariant, CreateProductVariantDTO, UpdateProductVariantDTO } from '../../domain/entities/ProductVariant';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProductRepository implements IProductRepository {
  async findAll(filters?: ProductFilters): Promise<any[]> {
    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.categoryId) {
      query += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters?.brandId) {
      query += ' AND p.brand_id = ?';
      params.push(filters.brandId);
    }
    if (filters?.minPrice) {
      query += ' AND p.price >= ?';
      params.push(filters.minPrice);
    }
    if (filters?.maxPrice) {
      query += ' AND p.price <= ?';
      params.push(filters.maxPrice);
    }
    if (filters?.search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.isFeatured !== undefined) {
      query += ' AND p.is_featured = ?';
      params.push(filters.isFeatured ? 1 : 0);
    }
    if (filters?.isNew !== undefined) {
      query += ' AND p.is_new = ?';
      params.push(filters.isNew ? 1 : 0);
    }
    if (filters?.isBestseller !== undefined) {
      query += ' AND p.is_bestseller = ?';
      params.push(filters.isBestseller ? 1 : 0);
    }
    if (filters?.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.map((row: any) => ({
      ...this.mapRowToProduct(row),
      category_name: row.category_name,
      brand_name: row.brand_name,
    }));
  }

  async findAllPaginated(filters: ProductFilters, page: number, limit: number): Promise<PaginatedResult<Product>> {
    let baseQuery = `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.categoryId) {
      baseQuery += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters?.brandId) {
      baseQuery += ' AND p.brand_id = ?';
      params.push(filters.brandId);
    }
    if (filters?.minPrice) {
      baseQuery += ' AND p.price >= ?';
      params.push(filters.minPrice);
    }
    if (filters?.maxPrice) {
      baseQuery += ' AND p.price <= ?';
      params.push(filters.maxPrice);
    }
    if (filters?.search) {
      baseQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.isFeatured !== undefined) {
      baseQuery += ' AND p.is_featured = ?';
      params.push(filters.isFeatured ? 1 : 0);
    }
    if (filters?.isNew !== undefined) {
      baseQuery += ' AND p.is_new = ?';
      params.push(filters.isNew ? 1 : 0);
    }
    if (filters?.isBestseller !== undefined) {
      baseQuery += ' AND p.is_bestseller = ?';
      params.push(filters.isBestseller ? 1 : 0);
    }
    if (filters?.status) {
      baseQuery += ' AND p.status = ?';
      params.push(filters.status);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countRows[0].total;

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataQuery = `SELECT p.*, c.name as category_name, b.name as brand_name ${baseQuery} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];
    const [rows] = await pool.execute<RowDataPacket[]>(dataQuery, dataParams);

    const data = rows.map((row: any) => ({
      ...this.mapRowToProduct(row),
      category_name: row.category_name,
      brand_name: row.brand_name,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(productId: number): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_id = ?
      `,
      [productId]
    );
    if (rows.length === 0) return null;

    const row = rows[0] as any;
    const product = {
      ...this.mapRowToProduct(row),
      category_name: row.category_name,
      brand_name: row.brand_name,
    };

    // Attach images and variants
    const images = await this.findImages(productId);
    const variants = await this.findVariants(productId);

    return { ...product, images, variants };
  }

  async findBySlug(slug: string): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.slug = ?
      `,
      [slug]
    );
    if (rows.length === 0) return null;

    const row = rows[0] as any;
    const product = {
      ...this.mapRowToProduct(row),
      category_name: row.category_name,
      brand_name: row.brand_name,
    };

    // Attach images and variants
    const images = await this.findImages(row.product_id);
    const variants = await this.findVariants(row.product_id);

    return { ...product, images, variants };
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

  // ==========================================
  // Product Images
  // ==========================================

  async findImages(productId: number): Promise<ProductImage[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC',
      [productId]
    );
    return rows.map(this.mapRowToProductImage);
  }

  async addImage(image: CreateProductImageDTO): Promise<ProductImage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        image.productId,
        image.imageUrl,
        image.altText || null,
        image.displayOrder || 0,
        image.isPrimary || false,
        new Date(),
      ]
    );

    return {
      imageId: result.insertId,
      productId: image.productId,
      imageUrl: image.imageUrl,
      altText: image.altText,
      displayOrder: image.displayOrder || 0,
      isPrimary: image.isPrimary || false,
      createdAt: new Date(),
    };
  }

  async deleteImage(imageId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM product_images WHERE image_id = ?',
      [imageId]
    );
    return result.affectedRows > 0;
  }

  // ==========================================
  // Product Variants
  // ==========================================

  async findVariants(productId: number): Promise<ProductVariant[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY variant_name ASC',
      [productId]
    );
    return rows.map(this.mapRowToProductVariant);
  }

  async addVariant(variant: CreateProductVariantDTO): Promise<ProductVariant> {
    const now = new Date();
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_variants (product_id, variant_name, sku, attributes, price_adjustment, stock_quantity, image_url, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        variant.productId,
        variant.variantName,
        variant.sku || null,
        variant.attributes ? JSON.stringify(variant.attributes) : null,
        variant.priceAdjustment || 0,
        variant.stockQuantity || 0,
        variant.imageUrl || null,
        variant.isActive !== undefined ? variant.isActive : true,
        now,
        now,
      ]
    );

    return {
      variantId: result.insertId,
      productId: variant.productId,
      variantName: variant.variantName,
      sku: variant.sku,
      attributes: variant.attributes,
      priceAdjustment: variant.priceAdjustment || 0,
      stockQuantity: variant.stockQuantity || 0,
      imageUrl: variant.imageUrl,
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateVariant(variant: UpdateProductVariantDTO): Promise<ProductVariant | null> {
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_variants WHERE variant_id = ?',
      [variant.variantId]
    );
    if (existingRows.length === 0) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (variant.variantName) {
      updates.push('variant_name = ?');
      params.push(variant.variantName);
    }
    if (variant.sku !== undefined) {
      updates.push('sku = ?');
      params.push(variant.sku);
    }
    if (variant.attributes) {
      updates.push('attributes = ?');
      params.push(JSON.stringify(variant.attributes));
    }
    if (variant.priceAdjustment !== undefined) {
      updates.push('price_adjustment = ?');
      params.push(variant.priceAdjustment);
    }
    if (variant.stockQuantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(variant.stockQuantity);
    }
    if (variant.imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(variant.imageUrl);
    }
    if (variant.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(variant.isActive);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(variant.variantId);

    await pool.execute(
      `UPDATE product_variants SET ${updates.join(', ')} WHERE variant_id = ?`,
      params
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_variants WHERE variant_id = ?',
      [variant.variantId]
    );
    return rows.length > 0 ? this.mapRowToProductVariant(rows[0]) : null;
  }

  async deleteVariant(variantId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM product_variants WHERE variant_id = ?',
      [variantId]
    );
    return result.affectedRows > 0;
  }

  // ==========================================
  // Private mappers
  // ==========================================



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

  private mapRowToProductImage(row: any): ProductImage {
    return {
      imageId: row.image_id,
      productId: row.product_id,
      imageUrl: row.image_url,
      altText: row.alt_text,
      displayOrder: row.display_order,
      isPrimary: Boolean(row.is_primary),
      createdAt: row.created_at,
    };
  }

  private mapRowToProductVariant(row: any): ProductVariant {
    return {
      variantId: row.variant_id,
      productId: row.product_id,
      variantName: row.variant_name,
      sku: row.sku,
      attributes: typeof row.attributes === 'string'
        ? JSON.parse(row.attributes)
        : row.attributes,
      priceAdjustment: row.price_adjustment ? parseFloat(row.price_adjustment) : 0,
      stockQuantity: row.stock_quantity,
      imageUrl: row.image_url,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
