import { ICouponRepository } from '../../domain/repositories/ICouponRepository';
import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '../../domain/entities/Coupon';
import pool from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class CouponRepository implements ICouponRepository {
    async findAll(): Promise<Coupon[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM coupons ORDER BY created_at DESC'
        );
        return rows.map(this.mapRowToCoupon);
    }

    async findById(couponId: number): Promise<Coupon | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM coupons WHERE coupon_id = ?',
            [couponId]
        );
        return rows.length > 0 ? this.mapRowToCoupon(rows[0]) : null;
    }

    async findByCode(code: string): Promise<Coupon | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM coupons WHERE code = ?',
            [code]
        );
        return rows.length > 0 ? this.mapRowToCoupon(rows[0]) : null;
    }

    async create(couponData: CreateCouponDTO): Promise<Coupon> {
        const now = new Date();

        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, 
       max_discount_amount, usage_limit, per_user_limit, valid_from, valid_to, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                couponData.code,
                couponData.description || null,
                couponData.discountType,
                couponData.discountValue,
                couponData.minOrderValue || 0,
                couponData.maxDiscountAmount || null,
                couponData.usageLimit || null,
                couponData.perUserLimit || 1,
                couponData.validFrom || null,
                couponData.validTo || null,
                couponData.isActive !== undefined ? couponData.isActive : true,
                now,
                now,
            ]
        );

        return {
            couponId: result.insertId,
            code: couponData.code,
            description: couponData.description,
            discountType: couponData.discountType,
            discountValue: couponData.discountValue,
            minOrderValue: couponData.minOrderValue || 0,
            maxDiscountAmount: couponData.maxDiscountAmount,
            usageLimit: couponData.usageLimit,
            usedCount: 0,
            perUserLimit: couponData.perUserLimit || 1,
            validFrom: couponData.validFrom,
            validTo: couponData.validTo,
            isActive: couponData.isActive !== undefined ? couponData.isActive : true,
            createdAt: now,
            updatedAt: now,
        };
    }

    async update(couponData: UpdateCouponDTO): Promise<Coupon | null> {
        const existing = await this.findById(couponData.couponId);
        if (!existing) return null;

        const updates: string[] = [];
        const params: any[] = [];

        if (couponData.code) {
            updates.push('code = ?');
            params.push(couponData.code);
        }
        if (couponData.description !== undefined) {
            updates.push('description = ?');
            params.push(couponData.description);
        }
        if (couponData.discountType) {
            updates.push('discount_type = ?');
            params.push(couponData.discountType);
        }
        if (couponData.discountValue !== undefined) {
            updates.push('discount_value = ?');
            params.push(couponData.discountValue);
        }
        if (couponData.minOrderValue !== undefined) {
            updates.push('min_order_value = ?');
            params.push(couponData.minOrderValue);
        }
        if (couponData.maxDiscountAmount !== undefined) {
            updates.push('max_discount_amount = ?');
            params.push(couponData.maxDiscountAmount);
        }
        if (couponData.usageLimit !== undefined) {
            updates.push('usage_limit = ?');
            params.push(couponData.usageLimit);
        }
        if (couponData.perUserLimit !== undefined) {
            updates.push('per_user_limit = ?');
            params.push(couponData.perUserLimit);
        }
        if (couponData.validFrom !== undefined) {
            updates.push('valid_from = ?');
            params.push(couponData.validFrom);
        }
        if (couponData.validTo !== undefined) {
            updates.push('valid_to = ?');
            params.push(couponData.validTo);
        }
        if (couponData.isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(couponData.isActive);
        }

        if (updates.length === 0) return existing;

        updates.push('updated_at = ?');
        params.push(new Date());
        params.push(couponData.couponId);

        await pool.execute(
            `UPDATE coupons SET ${updates.join(', ')} WHERE coupon_id = ?`,
            params
        );

        return this.findById(couponData.couponId);
    }

    async delete(couponId: number): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'DELETE FROM coupons WHERE coupon_id = ?',
            [couponId]
        );
        return result.affectedRows > 0;
    }

    async incrementUsedCount(couponId: number): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = ?',
            [couponId]
        );
        return result.affectedRows > 0;
    }

    private mapRowToCoupon(row: any): Coupon {
        return {
            couponId: row.coupon_id,
            code: row.code,
            description: row.description,
            discountType: row.discount_type,
            discountValue: parseFloat(row.discount_value),
            minOrderValue: row.min_order_value ? parseFloat(row.min_order_value) : 0,
            maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount) : undefined,
            usageLimit: row.usage_limit,
            usedCount: row.used_count,
            perUserLimit: row.per_user_limit,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
