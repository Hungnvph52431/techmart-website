import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserWithPassword, CreateUserDTO, UpdateUserDTO } from '../../domain/entities/User';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserRepository implements IUserRepository {
  async findAll(): Promise<User[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT user_id, email, name, phone, role, status, points, membership_level, 
              created_at, updated_at, last_login 
       FROM users ORDER BY created_at DESC`
    );
    return rows.map(this.mapToUser);
  }

  async findById(userId: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT user_id, email, name, phone, role, status, points, membership_level, 
              created_at, updated_at, last_login 
       FROM users WHERE user_id = ?`,
      [userId]
    );
    return rows.length ? this.mapToUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows.length ? this.mapToUserWithPassword(rows[0]) : null;
  }

  async create(data: CreateUserDTO & { hashedPassword: string }): Promise<User> {
    const now = new Date();
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (
        email, password, name, phone, role, status, points, membership_level,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.email,
        data.hashedPassword,
        data.name,
        data.phone || null,
        data.role || 'customer',
        'active',
        0,
        'bronze',
        now,
        now,
      ]
    );

    return (await this.findById(result.insertId))!;
  }

  async update(dto: UpdateUserDTO): Promise<User | null> {
    const sets: string[] = [];
    const values: any[] = [];

    if (dto.name !== undefined) { sets.push('name = ?'); values.push(dto.name); }
    if (dto.phone !== undefined) { sets.push('phone = ?'); values.push(dto.phone); }
    if (dto.role) { sets.push('role = ?'); values.push(dto.role); }
    if (dto.status) { sets.push('status = ?'); values.push(dto.status); }
    if (dto.points !== undefined) { sets.push('points = ?'); values.push(dto.points); }
    if (dto.membershipLevel) { sets.push('membership_level = ?'); values.push(dto.membershipLevel); }

    if (sets.length === 0) return null;

    sets.push('updated_at = ?');
    values.push(new Date());
    values.push(dto.userId);

    await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, values);

    return this.findById(dto.userId);
  }

  async updateStatus(userId: number, status: User['status']): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET status = ?, updated_at = ? WHERE user_id = ?',
      [status, new Date(), userId]
    );
    return res.affectedRows > 0;
  }

  async updateRole(userId: number, role: User['role']): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET role = ?, updated_at = ? WHERE user_id = ?',
      [role, new Date(), userId]
    );
    return res.affectedRows > 0;
  }

  async updatePoints(userId: number, pointsDelta: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET points = points + ?, updated_at = ? WHERE user_id = ?',
      [pointsDelta, new Date(), userId]
    );
    return res.affectedRows > 0;
  }

  async delete(userId: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE user_id = ?', [userId]);
    return res.affectedRows > 0;
  }

  private mapToUser(row: RowDataPacket): User {
    return {
      userId: row.user_id,
      email: row.email,
      name: row.name,
      phone: row.phone ?? undefined,
      role: row.role,
      status: row.status,
      points: row.points,
      membershipLevel: row.membership_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login ?? undefined,
    };
  }

  private mapToUserWithPassword(row: RowDataPacket): UserWithPassword {
    return {
      ...this.mapToUser(row),
      password: row.password,
    };
  }
}