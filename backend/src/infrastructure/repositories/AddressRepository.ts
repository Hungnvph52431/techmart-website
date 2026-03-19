// src/infrastructure/repositories/AddressRepository.ts

import  pool  from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface AddressRow {
  address_id: number;
  user_id: number;
  full_name: string;
  phone: string;
  address_line: string;
  ward: string;
  district: string;
  city: string;
  is_default: boolean;
}

const toAddress = (row: AddressRow) => ({
  addressId: row.address_id,
  userId: row.user_id,
  fullName: row.full_name,
  phone: row.phone,
  addressLine: row.address_line,
  ward: row.ward,
  district: row.district,
  city: row.city,
  isDefault: Boolean(row.is_default),
});

export class AddressRepository {
  async findByUserId(userId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, address_id ASC',
      [userId]
    );
    return (rows as AddressRow[]).map(toAddress);
  }

  async findById(addressId: number) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM addresses WHERE address_id = ?',
      [addressId]
    );
    if (!(rows as AddressRow[]).length) return null;
    return toAddress((rows as AddressRow[])[0]);
  }

  async create(userId: number, data: {
    fullName: string; phone: string; addressLine: string;
    ward: string; district: string; city: string; isDefault?: boolean;
  }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Nếu là default → bỏ default cũ
      if (data.isDefault) {
        await conn.execute('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
      }

      // Nếu chưa có địa chỉ nào → tự động làm default
      const [existing] = await conn.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM addresses WHERE user_id = ?', [userId]
      );
      const isFirst = (existing as any)[0].cnt === 0;

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO addresses (user_id, full_name, phone, address_line, ward, district, city, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, data.fullName, data.phone, data.addressLine, data.ward, data.district, data.city, data.isDefault || isFirst]
      );

      await conn.commit();
      return this.findById(result.insertId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async update(addressId: number, data: Partial<{
    fullName: string; phone: string; addressLine: string;
    ward: string; district: string; city: string;
  }>) {
    const fields: string[] = [];
    const values: Array<string | number> = [];

    if (data.fullName !== undefined) { fields.push('full_name = ?'); values.push(data.fullName); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.addressLine !== undefined) { fields.push('address_line = ?'); values.push(data.addressLine); }
    if (data.ward !== undefined) { fields.push('ward = ?'); values.push(data.ward); }
    if (data.district !== undefined) { fields.push('district = ?'); values.push(data.district); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }

    if (!fields.length) return this.findById(addressId);

    values.push(addressId);
    await pool.execute(`UPDATE addresses SET ${fields.join(', ')} WHERE address_id = ?`, values as any);
    return this.findById(addressId);
  }

  async setDefault(addressId: number, userId: number) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
      await conn.execute('UPDATE addresses SET is_default = TRUE WHERE address_id = ?', [addressId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async delete(addressId: number, userId: number) {
    const addr = await this.findById(addressId);
    if (!addr) return false;

    await pool.execute('DELETE FROM addresses WHERE address_id = ? AND user_id = ?', [addressId, userId]);

    // Nếu xóa địa chỉ default → tự động set default cho địa chỉ đầu tiên còn lại
    if (addr.isDefault) {
      await pool.execute(
        'UPDATE addresses SET is_default = TRUE WHERE user_id = ? LIMIT 1',
        [userId]
      );
    }

    return true;
  }
}
