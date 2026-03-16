export interface Coupon {
    couponId: number;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    minOrderValue: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usedCount: number;
    perUserLimit: number;
    validFrom?: Date;
    validTo?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCouponDTO {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    validFrom?: Date;
    validTo?: Date;
    isActive?: boolean;
}

export interface UpdateCouponDTO extends Partial<CreateCouponDTO> {
    couponId: number;
}
