import { IVoucherRepository } from '../../domain/repositories/IVoucherRepository';
import { Voucher } from '../../domain/entities/Voucher';
import pool from '../database/connection'; 
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 🛠 HÀM ÉP KIỂU NGÀY THÁNG CHUẨN MYSQL
const formatSqlDate = (dateString: string | null) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  
  // Lấy chính xác giờ địa phương (Việt Nam) thay vì UTC
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

export class VoucherRepository implements IVoucherRepository {
  async findAll(): Promise<Voucher[]> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows as Voucher[];
  }

  async create(data: any): Promise<Voucher> {
    const now = new Date();
    
    // GỌI HÀM ÉP KIỂU Ở ĐÂY ĐỂ TRỊ LỖI KHÔNG LƯU NGÀY
    const validFrom = formatSqlDate(data.valid_from);
    const validTo = formatSqlDate(data.valid_to);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO coupons (
        code, description, discount_type, discount_value, 
        min_order_value, max_discount_amount, usage_limit, 
        per_user_limit, valid_from, valid_to, is_active, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        data.description || null,
        data.discount_type,
        data.discount_value,
        data.min_order_value || 0,
        data.max_discount_amount, // Đã đổi ở Frontend, không cần || null nữa
        data.usage_limit || null,
        data.per_user_limit || 1,
        validFrom,
        validTo,
        data.is_active !== undefined ? data.is_active : 1,
        now,
        now
      ]
    );

    return { coupon_id: result.insertId, ...data, used_count: 0 };
  }
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM coupons WHERE coupon_id = ?', 
      [id]
    );
    return result.affectedRows > 0;
  }
  async findByCode(code: string): Promise<any | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM coupons WHERE code = ?', 
    [code]
  );
  // Nếu tìm thấy thì trả về phần tử đầu tiên, không thì trả về null
  return rows.length > 0 ? rows[0] : null;
}

  // ... (giữ nguyên các hàm findByCode, updateUsage cũ)
}