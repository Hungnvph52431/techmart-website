import { IProductRepository, ProductStats } from '../../domain/repositories/IProductRepository';
import { PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  CreateProductDTO,
  Product,
  ProductImage,
  ProductStatus,
  ProductVariant,
  SaveProductPayload,
  UpdateProductDTO,
} from '../../domain/entities/Product';
import pool from '../database/connection';

type PublicFilters = {
  categoryId?: number;
  category?: string;
  brandId?: number;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featured?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  status?: string;
};

export class ProductRepository implements IProductRepository {
  async findAll(filters?: PublicFilters): Promise<Product[]> {
    const { query, params } = this.buildBaseListQuery(true, filters);
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    const products = rows.map((row) => this.mapRowToProduct(row));
    return this.attachRelations(products, { includeVariants: false });
  }

  async findById(productId: number): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${this.baseProductSelect()}
       WHERE p.product_id = ? AND p.status IN ('active', 'out_of_stock', 'pre_order')`,
      [productId]
    );

    if (rows.length === 0) {
      return null;
    }

    const [product] = await this.attachRelations(
      rows.map((row) => this.mapRowToProduct(row)),
      { includeVariants: true }
    );
    return product || null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${this.baseProductSelect()}
       WHERE p.slug = ? AND p.status IN ('active', 'out_of_stock', 'pre_order')`,
      [slug]
    );

    if (rows.length === 0) {
      return null;
    }

    const [product] = await this.attachRelations(
      rows.map((row) => this.mapRowToProduct(row)),
      { includeVariants: true }
    );
    return product || null;
  }

  async create(product: CreateProductDTO): Promise<Product> {
    return this.save({ product, images: [], variants: [] });
  }

  async update(product: UpdateProductDTO): Promise<Product | null> {
    const existing = await this.findAdminById(product.productId);
    if (!existing) {
      return null;
    }

    const payload: SaveProductPayload = {
      product: {
        ...existing,
        ...product,
      },
      images: (existing.images || []).map((image) => ({
        imageId: image.imageId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        displayOrder: image.displayOrder,
        isPrimary: image.isPrimary,
      })),
      variants: (existing.variants || []).map((variant) => ({
        variantId: variant.variantId,
        variantName: variant.variantName,
        sku: variant.sku,
        attributes: variant.attributes,
        priceAdjustment: variant.priceAdjustment,
        stockQuantity: variant.stockQuantity,
        imageUrl: variant.imageUrl,
        isActive: variant.isActive,
      })),
    };

    return this.save(payload, product.productId);
  }

  async delete(productId: number): Promise<boolean> {
    return this.archive(productId);
  }

  async updateStock(productId: number, quantity: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products
       SET stock_quantity = GREATEST(stock_quantity + ?, 0),
           updated_at = ?
       WHERE product_id = ?`,
      [quantity, new Date(), productId]
    );

    return result.affectedRows > 0;
  }

  async findAdminList(filters?: {
    search?: string;
    categoryId?: number;
    status?: ProductStatus | 'all';
  }): Promise<Product[]> {
    const { query, params } = this.buildBaseListQuery(false, filters);
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return this.attachRelations(
      rows.map((row) => this.mapRowToProduct(row)),
      { includeVariants: true }
    );
  }

  async findAdminById(productId: number): Promise<Product | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `${this.baseProductSelect()} WHERE p.product_id = ?`,
      [productId]
    );

    if (rows.length === 0) {
      return null;
    }

    const [product] = await this.attachRelations(
      rows.map((row) => this.mapRowToProduct(row)),
      { includeVariants: true }
    );
    return product || null;
  }

  async save(payload: SaveProductPayload, productId?: number): Promise<Product> {
    const existing = productId ? await this.findAdminById(productId) : null;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (await this.isSkuTaken(payload.product.sku, { excludeProductId: productId })) {
        throw new Error('Product SKU already exists');
      }

      const payloadVariantSkus = new Set<string>();
      const seenCombinations = new Set<string>();

      for (const variant of payload.variants) {
        if (payloadVariantSkus.has(variant.sku)) {
          throw new Error('Duplicate variant SKU in payload');
        }
        payloadVariantSkus.add(variant.sku);

        if (
          await this.isSkuTaken(variant.sku, {
            excludeProductId: productId,
            excludeVariantId: variant.variantId,
          })
        ) {
          throw new Error(`Variant SKU already exists: ${variant.sku}`);
        }

        const normalizedAttributes = this.normalizeVariantAttributes(variant.attributes || {});

        if (Object.keys(normalizedAttributes).length === 0) {
          continue;
        }

        const normalizedKey = JSON.stringify(normalizedAttributes);

        if (seenCombinations.has(normalizedKey)) {
          throw new Error('Duplicate variant attribute combination');
        }
        seenCombinations.add(normalizedKey);
      }

      const derivedMainImage =
        payload.images.find((image) => image.isPrimary)?.imageUrl || payload.images[0]?.imageUrl;
      const explicitMainImage =
        payload.product.mainImage !== undefined
          ? String(payload.product.mainImage).trim() || null
          : undefined;
      const mainImage =
        explicitMainImage !== undefined
          ? explicitMainImage ?? derivedMainImage ?? null
          : derivedMainImage || existing?.mainImage || null;

      const status = payload.product.status || existing?.status || 'draft';
      const stockQuantity =
        payload.variants.length > 0
          ? payload.variants
              .filter((variant) => variant.isActive)
              .reduce((sum, variant) => sum + variant.stockQuantity, 0)
          : payload.product.stockQuantity ?? existing?.stockQuantity ?? 0;

      const resolvedProductId = await this.upsertProduct(connection, {
        productId,
        product: payload.product,
        mainImage,
        stockQuantity,
        status,
      });

      await this.syncImages(connection, resolvedProductId, payload.images);
      await this.syncVariants(connection, resolvedProductId, payload.variants);

      if (payload.variants.length > 0) {
        await this.recalculateStockWithConnection(connection, resolvedProductId);
      }

      await connection.commit();
      return (await this.findAdminById(resolvedProductId))!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async archive(productId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products
       SET status = 'archived',
           updated_at = ?
       WHERE product_id = ?`,
      [new Date(), productId]
    );
    return result.affectedRows > 0;
  }

  async getStats(): Promise<ProductStats> {
    const [[summary]] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN status = 'active'        THEN 1 ELSE 0 END) AS active_products,
        SUM(CASE WHEN status = 'inactive'      THEN 1 ELSE 0 END) AS inactive_products,
        SUM(CASE WHEN status = 'out_of_stock'  THEN 1 ELSE 0 END) AS out_of_stock_count,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity < 10 THEN 1 ELSE 0 END) AS low_stock_count
      FROM products`
    );

    const [topRows] = await pool.execute<RowDataPacket[]>(
      `SELECT product_id, name, sold_quantity, stock_quantity, main_image
       FROM products ORDER BY sold_quantity DESC LIMIT 5`
    );

    const [lowStockRows] = await pool.execute<RowDataPacket[]>(
      `SELECT product_id, name, stock_quantity
       FROM products WHERE stock_quantity > 0 AND stock_quantity < 10
       ORDER BY stock_quantity ASC LIMIT 10`
    );

    return {
      totalProducts:   Number(summary.total_products)   || 0,
      activeProducts:  Number(summary.active_products)  || 0,
      inactiveProducts: Number(summary.inactive_products) || 0,
      outOfStockCount: Number(summary.out_of_stock_count) || 0,
      lowStockCount:   Number(summary.low_stock_count)   || 0,
      topSellingProducts: topRows.map(r => ({
        productId:    r.product_id,
        name:         r.name,
        soldQuantity: r.sold_quantity,
        stockQuantity: r.stock_quantity,
        mainImage:    r.main_image,
      })),
      lowStockProducts: lowStockRows.map(r => ({
        productId:    r.product_id,
        name:         r.name,
        stockQuantity: r.stock_quantity,
      })),
    };
  }

  async findVariantById(variantId: number): Promise<ProductVariant | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_variants WHERE variant_id = ?',
      [variantId]
    );

    return rows.length > 0 ? this.mapRowToVariant(rows[0]) : null;
  }

  async updateVariantStock(variantId: number, quantity: number): Promise<boolean> {
    const variant = await this.findVariantById(variantId);
    if (!variant) {
      return false;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE product_variants
       SET stock_quantity = GREATEST(stock_quantity + ?, 0),
           updated_at = ?
       WHERE variant_id = ?`,
      [quantity, new Date(), variantId]
    );

    return result.affectedRows > 0;
  }

  async recalculateStock(productId: number): Promise<boolean> {
    const connection = await pool.getConnection();

    try {
      await this.recalculateStockWithConnection(connection, productId);
      return true;
    } finally {
      connection.release();
    }
  }

  async isSkuTaken(
    sku: string,
    options?: { excludeProductId?: number; excludeVariantId?: number }
  ): Promise<boolean> {
    const productParams: any[] = [sku];
    let productQuery = 'SELECT product_id AS id FROM products WHERE sku = ?';

    if (options?.excludeProductId) {
      productQuery += ' AND product_id <> ?';
      productParams.push(options.excludeProductId);
    }

    const [productRows] = await pool.execute<RowDataPacket[]>(productQuery, productParams);
    if (productRows.length > 0) {
      return true;
    }

    const variantParams: any[] = [sku];
    let variantQuery = 'SELECT variant_id AS id FROM product_variants WHERE sku = ?';

    if (options?.excludeVariantId) {
      variantQuery += ' AND variant_id <> ?';
      variantParams.push(options.excludeVariantId);
    }

    const [variantRows] = await pool.execute<RowDataPacket[]>(variantQuery, variantParams);
    return variantRows.length > 0;
  }

  private baseProductSelect() {
    return `
      SELECT
        p.*,
        c.name AS category_name,
        b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
    `;
  }

  private buildBaseListQuery(
    publicOnly: boolean,
    filters?: PublicFilters | {
      search?: string;
      categoryId?: number;
      status?: ProductStatus | 'all';
    }
  ) {
    let query = `${this.baseProductSelect()} WHERE 1=1`;
    const params: any[] = [];

    if (publicOnly) {
      query += ` AND p.status IN ('active', 'out_of_stock', 'pre_order')`;
      const publicFilters = filters as PublicFilters | undefined;

      if (publicFilters?.categoryId) {
        query += ' AND p.category_id = ?';
        params.push(publicFilters.categoryId);
      }
      if (publicFilters?.category) {
        query += ' AND (c.slug = ? OR c.name = ?)';
        params.push(publicFilters.category, publicFilters.category);
      }
      if (publicFilters?.brandId) {
        query += ' AND p.brand_id = ?';
        params.push(publicFilters.brandId);
      }
      if (publicFilters?.brand) {
        query += ' AND (b.slug = ? OR b.name = ?)';
        params.push(publicFilters.brand, publicFilters.brand);
      }
      if (publicFilters?.minPrice !== undefined) {
        query += ' AND p.price >= ?';
        params.push(publicFilters.minPrice);
      }
      if (publicFilters?.maxPrice !== undefined) {
        query += ' AND p.price <= ?';
        params.push(publicFilters.maxPrice);
      }
      if (publicFilters?.search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
        params.push(
          `%${publicFilters.search}%`,
          `%${publicFilters.search}%`,
          `%${publicFilters.search}%`
        );
      }

      const featured = publicFilters?.featured ?? publicFilters?.isFeatured;
      if (featured !== undefined) {
        query += ' AND p.is_featured = ?';
        params.push(featured ? 1 : 0);
      }
      if (publicFilters?.isNew !== undefined) {
        query += ' AND p.is_new = ?';
        params.push(publicFilters.isNew ? 1 : 0);
      }
      if (publicFilters?.isBestseller !== undefined) {
        query += ' AND p.is_bestseller = ?';
        params.push(publicFilters.isBestseller ? 1 : 0);
      }
    } else {
      const adminFilters = filters as {
        search?: string;
        categoryId?: number;
        status?: ProductStatus | 'all';
      } | undefined;

      if (adminFilters?.search) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${adminFilters.search}%`, `%${adminFilters.search}%`);
      }
      if (adminFilters?.categoryId) {
        query += ' AND p.category_id = ?';
        params.push(adminFilters.categoryId);
      }
      if (adminFilters?.status && adminFilters.status !== 'all') {
        query += ' AND p.status = ?';
        params.push(adminFilters.status);
      }
    }

    query += ' ORDER BY p.updated_at DESC, p.created_at DESC';
    return { query, params };
  }

  private async attachRelations(
    products: Product[],
    options: { includeVariants: boolean }
  ): Promise<Product[]> {
    if (products.length === 0) {
      return products;
    }

    const productIds = products.map((product) => product.productId);
    const placeholders = productIds.map(() => '?').join(', ');

    const [imageRows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY display_order ASC, image_id ASC`,
      productIds
    );

    const imagesByProduct = imageRows.reduce<Map<number, ProductImage[]>>((map, row) => {
      const image = this.mapRowToImage(row);
      const bucket = map.get(image.productId) || [];
      bucket.push(image);
      map.set(image.productId, bucket);
      return map;
    }, new Map());

    let variantsByProduct = new Map<number, ProductVariant[]>();

    if (options.includeVariants) {
      const [variantRows] = await pool.execute<RowDataPacket[]>(
        `SELECT *
         FROM product_variants
         WHERE product_id IN (${placeholders})
         ORDER BY variant_id ASC`,
        productIds
      );

      variantsByProduct = variantRows.reduce<Map<number, ProductVariant[]>>((map, row) => {
        const variant = this.mapRowToVariant(row);
        const bucket = map.get(variant.productId) || [];
        bucket.push(variant);
        map.set(variant.productId, bucket);
        return map;
      }, new Map());
    }

    return products.map((product) => {
      const images = imagesByProduct.get(product.productId) || [];
      const primaryImage = images.find((image) => image.isPrimary)?.imageUrl || images[0]?.imageUrl;

      return {
        ...product,
        mainImage: product.mainImage || primaryImage,
        images,
        variants: options.includeVariants ? variantsByProduct.get(product.productId) || [] : [],
      };
    });
  }

  private async upsertProduct(
    connection: PoolConnection,
    data: {
      productId?: number;
      product: CreateProductDTO;
      mainImage: string | null;
      stockQuantity: number;
      status: ProductStatus;
    }
  ) {
    const now = new Date();

    if (!data.productId) {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO products (
          name, slug, sku, category_id, brand_id, price, sale_price, cost_price,
          description, specifications, main_image, stock_quantity, sold_quantity,
          view_count, rating_avg, review_count, is_featured, is_new, is_bestseller,
          status, meta_title, meta_description, meta_keywords, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.product.name,
          data.product.slug,
          data.product.sku,
          data.product.categoryId,
          data.product.brandId || null,
          data.product.price,
          data.product.salePrice || null,
          data.product.costPrice || null,
          data.product.description || null,
          data.product.specifications ? JSON.stringify(data.product.specifications) : null,
          data.mainImage,
          data.stockQuantity,
          data.product.isFeatured ?? false,
          data.product.isNew ?? false,
          data.product.isBestseller ?? false,
          data.status,
          data.product.metaTitle || null,
          data.product.metaDescription || null,
          data.product.metaKeywords || null,
          now,
          now,
        ]
      );

      return result.insertId;
    }

    await connection.execute(
      `UPDATE products
       SET name = ?,
           slug = ?,
           sku = ?,
           category_id = ?,
           brand_id = ?,
           price = ?,
           sale_price = ?,
           cost_price = ?,
           description = ?,
           specifications = ?,
           main_image = ?,
           stock_quantity = ?,
           is_featured = ?,
           is_new = ?,
           is_bestseller = ?,
           status = ?,
           meta_title = ?,
           meta_description = ?,
           meta_keywords = ?,
           updated_at = ?
       WHERE product_id = ?`,
      [
        data.product.name,
        data.product.slug,
        data.product.sku,
        data.product.categoryId,
        data.product.brandId || null,
        data.product.price,
        data.product.salePrice || null,
        data.product.costPrice || null,
        data.product.description || null,
        data.product.specifications ? JSON.stringify(data.product.specifications) : null,
        data.mainImage,
        data.stockQuantity,
        data.product.isFeatured ?? false,
        data.product.isNew ?? false,
        data.product.isBestseller ?? false,
        data.status,
        data.product.metaTitle || null,
        data.product.metaDescription || null,
        data.product.metaKeywords || null,
        now,
        data.productId,
      ]
    );

    return data.productId;
  }

  private async syncImages(
    connection: PoolConnection,
    productId: number,
    images: SaveProductPayload['images']
  ) {
    await connection.execute(
      'DELETE FROM product_images WHERE product_id = ?',
      [productId]
    );

    for (const [index, image] of images.entries()) {
      await connection.execute(
        `INSERT INTO product_images (
          product_id, image_url, alt_text, display_order, is_primary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          image.imageUrl,
          image.altText || null,
          image.displayOrder ?? index,
          image.isPrimary,
          new Date(),
        ]
      );
    }
  }

  private async syncVariants(
    connection: PoolConnection,
    productId: number,
    variants: SaveProductPayload['variants']
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT variant_id FROM product_variants WHERE product_id = ?',
      [productId]
    );

    const existingVariantIds = new Set<number>(rows.map((row) => row.variant_id));
    const touchedVariantIds = new Set<number>();

    for (const variant of variants) {
      if (variant.variantId) {
        touchedVariantIds.add(variant.variantId);
        await connection.execute(
          `UPDATE product_variants
           SET variant_name = ?,
               sku = ?,
               attributes = ?,
               price_adjustment = ?,
               stock_quantity = ?,
               image_url = ?,
               is_active = ?,
               updated_at = ?
           WHERE variant_id = ? AND product_id = ?`,
          [
            variant.variantName,
            variant.sku,
            JSON.stringify(variant.attributes || {}),
            variant.priceAdjustment ?? 0,
            variant.stockQuantity,
            variant.imageUrl || null,
            variant.isActive,
            new Date(),
            variant.variantId,
            productId,
          ]
        );
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO product_variants (
            product_id, variant_name, sku, attributes, price_adjustment,
            stock_quantity, image_url, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            variant.variantName,
            variant.sku,
            JSON.stringify(variant.attributes || {}),
            variant.priceAdjustment ?? 0,
            variant.stockQuantity,
            variant.imageUrl || null,
            variant.isActive,
            new Date(),
            new Date(),
          ]
        );
        touchedVariantIds.add(result.insertId);
      }
    }

    for (const variantId of existingVariantIds) {
      if (!touchedVariantIds.has(variantId)) {
        await connection.execute(
          `UPDATE product_variants
           SET is_active = 0,
               stock_quantity = 0,
               updated_at = ?
           WHERE variant_id = ?`,
          [new Date(), variantId]
        );
      }
    }
  }

  private async recalculateStockWithConnection(connection: PoolConnection, productId: number) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock
       FROM product_variants
       WHERE product_id = ? AND is_active = 1`,
      [productId]
    );

    const totalStock = rows[0]?.total_stock ?? 0;
    await connection.execute(
      `UPDATE products
       SET stock_quantity = ?,
           main_image = COALESCE(
             (SELECT image_url
              FROM product_images
              WHERE product_id = ?
              ORDER BY is_primary DESC, display_order ASC, image_id ASC
              LIMIT 1),
             main_image
           ),
           updated_at = ?
       WHERE product_id = ?`,
      [totalStock, productId, new Date(), productId]
    );
  }

  private normalizeVariantAttributes(attributes: Record<string, any>) {
    return Object.keys(attributes)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        const value = attributes[key];

        if (Array.isArray(value)) {
          const normalized = value
            .map((item) => String(item).trim())
            .filter(Boolean);

          if (normalized.length > 0) {
            acc[key] = normalized;
          }

          return acc;
        }

        if (value === undefined || value === null) {
          return acc;
        }

        const normalized = String(value).trim();
        if (normalized) {
          acc[key] = normalized;
        }

        return acc;
      }, {});
  }

  private mapRowToProduct(row: any): Product {
    return {
      productId: row.product_id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryId: row.category_id,
      brandId: row.brand_id,
      price: Number(row.price),
      salePrice: row.sale_price !== null ? Number(row.sale_price) : undefined,
      costPrice: row.cost_price !== null ? Number(row.cost_price) : undefined,
      description: row.description,
      specifications: row.specifications
        ? typeof row.specifications === 'string'
          ? JSON.parse(row.specifications)
          : row.specifications
        : {},
      mainImage: row.main_image,
      stockQuantity: row.stock_quantity,
      soldQuantity: row.sold_quantity,
      viewCount: row.view_count,
      ratingAvg: row.rating_avg ? Number(row.rating_avg) : 0,
      reviewCount: row.review_count,
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
      isBestseller: Boolean(row.is_bestseller),
      status: row.status,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      metaKeywords: row.meta_keywords,
      categoryName: row.category_name || undefined,
      brandName: row.brand_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToImage(row: any): ProductImage {
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

  private mapRowToVariant(row: any): ProductVariant {
    return {
      variantId: row.variant_id,
      productId: row.product_id,
      variantName: row.variant_name,
      sku: row.sku,
      attributes: row.attributes
        ? typeof row.attributes === 'string'
          ? JSON.parse(row.attributes)
          : row.attributes
        : {},
      priceAdjustment: Number(row.price_adjustment || 0),
      stockQuantity: row.stock_quantity,
      imageUrl: row.image_url,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
