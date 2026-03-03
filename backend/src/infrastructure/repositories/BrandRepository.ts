import { IBrandRepository } from '../../domain/repositories/IBrandRepository';
import { Brand, CreateBrandDTO, UpdateBrandDTO } from '../../domain/entities/Brand';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class BrandRepository implements IBrandRepository {
  async findAll(): Promise<Brand[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM brands ORDER BY name ASC'
    );
    return rows.map(this.mapRowToBrand);
  }

  async findById(brandId: number): Promise<Brand | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM brands WHERE brand_id = ?',
      [brandId]
    );
    return rows.length > 0 ? this.mapRowToBrand(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM brands WHERE slug = ?',
      [slug]
    );
    return rows.length > 0 ? this.mapRowToBrand(rows[0]) : null;
  }

  async create(brandData: CreateBrandDTO): Promise<Brand> {
    const now = new Date();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO brands (name, slug, logo_url, description, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        brandData.name,
        brandData.slug,
        brandData.logoUrl || null,
        brandData.description || null,
        brandData.isActive !== undefined ? brandData.isActive : true,
        now,
        now,
      ]
    );

    return {
      brandId: result.insertId,
      name: brandData.name,
      slug: brandData.slug,
      logoUrl: brandData.logoUrl,
      description: brandData.description,
      isActive: brandData.isActive !== undefined ? brandData.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(brandData: UpdateBrandDTO): Promise<Brand | null> {
    const existing = await this.findById(brandData.brandId);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (brandData.name) {
      updates.push('name = ?');
      params.push(brandData.name);
    }
    if (brandData.slug) {
      updates.push('slug = ?');
      params.push(brandData.slug);
    }
    if (brandData.logoUrl !== undefined) {
      updates.push('logo_url = ?');
      params.push(brandData.logoUrl);
    }
    if (brandData.description !== undefined) {
      updates.push('description = ?');
      params.push(brandData.description);
    }
    if (brandData.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(brandData.isActive);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(brandData.brandId);

    await pool.execute(
      `UPDATE brands SET ${updates.join(', ')} WHERE brand_id = ?`,
      params
    );

    return this.findById(brandData.brandId);
  }

  async delete(brandId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM brands WHERE brand_id = ?',
      [brandId]
    );
    return result.affectedRows > 0;
  }

  private mapRowToBrand(row: any): Brand {
    return {
      brandId: row.brand_id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      description: row.description,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
