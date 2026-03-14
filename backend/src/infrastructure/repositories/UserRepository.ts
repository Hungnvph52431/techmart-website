import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, CreateUserDTO, UpdateUserDTO } from '../../domain/entities/User';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';

export class UserRepository implements IUserRepository {
  async findAll(): Promise<User[]> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(this.mapRowToUser);
  }

  async findById(userId: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE user_id = ?',
      [userId]
    );
    return rows.length > 0 ? this.mapRowToUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? this.mapRowToUser(rows[0]) : null;
  }

  async create(user: CreateUserDTO): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const now = new Date();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (email, password, name, phone, role, status, points, membership_level, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.email,
        hashedPassword,
        user.name,
        user.phone || null,
        user.role || 'customer',
        'active',
        0,
        'bronze',
        now,
        now,
      ]
    );

    return {
      userId: result.insertId,
      email: user.email,
      password: hashedPassword,
      name: user.name,
      phone: user.phone,
      role: user.role || 'customer',
      status: 'active',
      points: 0,
      membershipLevel: 'bronze',
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(user: UpdateUserDTO): Promise<User | null> {
    const existing = await this.findById(user.userId);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (user.email) {
      updates.push('email = ?');
      params.push(user.email);
    }
    if (user.name) {
      updates.push('name = ?');
      params.push(user.name);
    }
    if (user.phone !== undefined) {
      updates.push('phone = ?');
      params.push(user.phone);
    }
    if (user.role) {
      updates.push('role = ?');
      params.push(user.role);
    }
    if (user.status) {
      updates.push('status = ?');
      params.push(user.status);
    }
    if (user.points !== undefined) {
      updates.push('points = ?');
      params.push(user.points);
    }
    if (user.membershipLevel) {
      updates.push('membership_level = ?');
      params.push(user.membershipLevel);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(user.userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    return this.findById(user.userId);
  }
// Thêm hàm này vào bên trong class UserRepository của bạn
async updatePassword(userId: number, password: string): Promise<boolean> {
  try {
    // password truyền vào đây nên là mật khẩu ĐÃ HASH từ UseCase
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?',
      [password, new Date(), userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error in updatePassword repository:', error);
    return false;
  }
}
  async delete(userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  }

  private mapRowToUser(row: any): User {
    return {
      userId: row.user_id,
      email: row.email,
      password: row.password,
      name: row.name,
      phone: row.phone,
      role: row.role,
      status: row.status,
      points: row.points,
      membershipLevel: row.membership_level,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
