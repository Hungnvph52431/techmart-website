import { ICouponRepository } from '../../domain/repositories/ICouponRepository';
import { CreateCouponDTO, UpdateCouponDTO } from '../../domain/entities/Coupon';

export class CouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async getAllCoupons() {
        return this.couponRepository.findAll();
    }

    // Lấy danh sách coupon còn hiệu lực (cho khách hàng chọn)
    async getAvailableCoupons() {
        const all = await this.couponRepository.findAll();
        const now = new Date();
        return all.filter((c) => {
            if (!c.isActive) return false;
            if (c.validFrom && now < new Date(c.validFrom)) return false;
            if (c.validTo && now > new Date(c.validTo)) return false;
            if (c.usageLimit && c.usedCount >= c.usageLimit) return false;
            return true;
        });
    }

    async getCouponById(id: number) {
        return this.couponRepository.findById(id);
    }

    async getCouponByCode(code: string) {
        return this.couponRepository.findByCode(code);
    }

    async validateCoupon(code: string, orderTotal: number) {
        const coupon = await this.couponRepository.findByCode(code);

        if (!coupon) {
            throw new Error('Mã giảm giá không tồn tại');
        }
        if (!coupon.isActive) {
            throw new Error('Mã giảm giá đã bị vô hiệu hóa');
        }

        const now = new Date();
        if (coupon.validFrom && now < new Date(coupon.validFrom)) {
            throw new Error('Mã giảm giá chưa có hiệu lực');
        }
        if (coupon.validTo && now > new Date(coupon.validTo)) {
            throw new Error('Mã giảm giá đã hết hạn');
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new Error('Mã giảm giá đã hết lượt sử dụng');
        }

        if (orderTotal < coupon.minOrderValue) {
            throw new Error(`Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này`);
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderTotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            discountAmount = coupon.discountValue;
        }

        return {
            coupon,
            discountAmount,
            finalTotal: orderTotal - discountAmount,
        };
    }

    async createCoupon(data: CreateCouponDTO) {
        // Check duplicate code
        const existing = await this.couponRepository.findByCode(data.code);
        if (existing) {
            throw new Error('Mã giảm giá đã tồn tại');
        }
        return this.couponRepository.create(data);
    }

    async updateCoupon(data: UpdateCouponDTO) {
        return this.couponRepository.update(data);
    }

    async deleteCoupon(id: number) {
        return this.couponRepository.delete(id);
    }

    async useCoupon(couponId: number) {
        return this.couponRepository.incrementUsedCount(couponId);
    }
}
