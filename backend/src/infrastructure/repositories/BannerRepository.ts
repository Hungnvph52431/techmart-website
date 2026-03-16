// backend/src/infrastructure/repositories/BannerRepository.ts

import { IBannerRepository } from '../../domain/repositories/IBannerRepository';
import { Banner, CreateBannerDTO, UpdateBannerDTO } from '../../domain/entities/Banner';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';

export class BannerRepository implements IBannerRepository {
  private pool = pool;

  private mapRow(row: any): Banner {
    return {
      bannerId: row.banner_id,
      title: row.title,
      imageUrl: row.image_url,
      linkUrl: row.link_url,
      position: row.position,
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      validFrom: row.valid_from ? new Date(row.valid_from) : undefined,
      validTo: row.valid_to ? new Date(row.valid_to) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findAll(position?: string): Promise<Banner[]> {
    let query = 'SELECT * FROM banners';
    const params: any[] = [];
    if (position) {
      query += ' WHERE position = ?';
      params.push(position);
    }
    query += ' ORDER BY display_order ASC';
    const [rows] = await this.pool.execute<RowDataPacket[]>(query, params);
    return rows.map(this.mapRow);
  }

  async findActive(position?: string): Promise<Banner[]> {
    let query = `SELECT * FROM banners WHERE is_active = 1
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_to IS NULL OR valid_to >= NOW())`;
    const params: any[] = [];
    if (position) {
      query += ' AND position = ?';
      params.push(position);
    }
    query += ' ORDER BY display_order ASC';
    const [rows] = await this.pool.execute<RowDataPacket[]>(query, params);
    return rows.map(this.mapRow);
  }

  async findById(id: number): Promise<Banner | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM banners WHERE banner_id = ?', [id]
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async create(data: CreateBannerDTO): Promise<Banner> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO banners (title, image_url, link_url, position, display_order, is_active, valid_from, valid_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.imageUrl,
        data.linkUrl || null,
        data.position,
        data.displayOrder ?? 0,
        data.isActive !== false ? 1 : 0,
        data.validFrom || null,
        data.validTo || null,
      ]
    );
    return (await this.findById(result.insertId))!;
  }

  async update(data: UpdateBannerDTO): Promise<Banner | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined)        { fields.push('title = ?');         values.push(data.title); }
    if (data.imageUrl !== undefined)     { fields.push('image_url = ?');     values.push(data.imageUrl); }
    if (data.linkUrl !== undefined)      { fields.push('link_url = ?');      values.push(data.linkUrl); }
    if (data.position !== undefined)     { fields.push('position = ?');      values.push(data.position); }
    if (data.displayOrder !== undefined) { fields.push('display_order = ?'); values.push(data.displayOrder); }
    if (data.isActive !== undefined)     { fields.push('is_active = ?');     values.push(data.isActive ? 1 : 0); }
    if (data.validFrom !== undefined)    { fields.push('valid_from = ?');    values.push(data.validFrom); }
    if (data.validTo !== undefined)      { fields.push('valid_to = ?');      values.push(data.validTo); }

    if (fields.length === 0) return this.findById(data.bannerId);

    fields.push('updated_at = NOW()');
    values.push(data.bannerId);

    await this.pool.execute(
      `UPDATE banners SET ${fields.join(', ')} WHERE banner_id = ?`, values
    );
    return this.findById(data.bannerId);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'DELETE FROM banners WHERE banner_id = ?', [id]
    );
    return result.affectedRows > 0;
  }

  async updateOrder(id: number, displayOrder: number): Promise<void> {
    await this.pool.execute(
      'UPDATE banners SET display_order = ? WHERE banner_id = ?', [displayOrder, id]
    );
  }
}
