import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '../entities/Coupon';

export interface ICouponRepository {
    findAll(): Promise<Coupon[]>;
    findById(couponId: number): Promise<Coupon | null>;
    findByCode(code: string): Promise<Coupon | null>;
    create(coupon: CreateCouponDTO): Promise<Coupon>;
    update(coupon: UpdateCouponDTO): Promise<Coupon | null>;
    delete(couponId: number): Promise<boolean>;
    incrementUsedCount(couponId: number): Promise<boolean>;
}
