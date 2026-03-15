import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../../domain/entities/Category';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class CategoryRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    );
    return rows.map(this.mapRowToCategory);
  }

  async findById(categoryId: number): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE category_id = ?',
      [categoryId]
    );
    return rows.length > 0 ? this.mapRowToCategory(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE slug = ?',
      [slug]
    );
    return rows.length > 0 ? this.mapRowToCategory(rows[0]) : null;
  }

  async findByParentId(parentId: number | null): Promise<Category[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE parent_id <=> ? ORDER BY display_order ASC, name ASC',
      [parentId]
    );
    return rows.map(this.mapRowToCategory);
  }

  // --- CÁC HÀM KIỂM TRA RÀNG BUỘC ---
  async hasChildren(categoryId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT category_id FROM categories WHERE parent_id = ? LIMIT 1',
      [categoryId]
    );
    return rows.length > 0;
  }

  async hasProducts(categoryId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT product_id FROM products 
       WHERE category_id = ? AND status <> 'archived' 
       LIMIT 1`,
      [categoryId]
    );
    return rows.length > 0;
  }

  // --- THAO TÁC DỮ LIỆU ---
  async create(categoryData: CreateCategoryDTO): Promise<Category> {
    const now = new Date();
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (name, slug, description, parent_id, image_url, display_order, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryData.name,
        categoryData.slug,
        categoryData.description || null,
        categoryData.parentId || null,
        categoryData.imageUrl || null,
        categoryData.displayOrder || 0,
        categoryData.isActive !== undefined ? categoryData.isActive : true,
        now,
        now,
      ]
    );

    return {
      categoryId: result.insertId,
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      parentId: categoryData.parentId,
      imageUrl: categoryData.imageUrl,
      displayOrder: categoryData.displayOrder || 0,
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(categoryData: UpdateCategoryDTO): Promise<Category | null> {
    const existing = await this.findById(categoryData.categoryId);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (categoryData.name) { updates.push('name = ?'); params.push(categoryData.name); }
    if (categoryData.slug) { updates.push('slug = ?'); params.push(categoryData.slug); }
    if (categoryData.description !== undefined) { updates.push('description = ?'); params.push(categoryData.description); }
    if (categoryData.parentId !== undefined) { updates.push('parent_id = ?'); params.push(categoryData.parentId); }
    if (categoryData.imageUrl !== undefined) { updates.push('image_url = ?'); params.push(categoryData.imageUrl); }
    if (categoryData.displayOrder !== undefined) { updates.push('display_order = ?'); params.push(categoryData.displayOrder); }
    if (categoryData.isActive !== undefined) { updates.push('is_active = ?'); params.push(categoryData.isActive); }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(categoryData.categoryId);

    await pool.execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE category_id = ?`,
      params
    );

    return this.findById(categoryData.categoryId);
  }

  async delete(categoryId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categories WHERE category_id = ?',
      [categoryId]
    );
    return result.affectedRows > 0;
  }

  private mapRowToCategory(row: any): Category {
    return {
      categoryId: row.category_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parent_id,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}