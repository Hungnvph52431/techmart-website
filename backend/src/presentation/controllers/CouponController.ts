import { Request, Response } from 'express';
import { CouponUseCase } from '../../application/use-cases/CouponUseCase';

export class CouponController {
    constructor(private couponUseCase: CouponUseCase) { }

    getAll = async (req: Request, res: Response) => {
        try {
            const coupons = await this.couponUseCase.getAllCoupons();
            res.json(coupons);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const coupon = await this.couponUseCase.getCouponById(Number(req.params.id));

            if (!coupon) {
                return res.status(404).json({ message: 'Coupon not found' });
            }

            res.json(coupon);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    getByCode = async (req: Request, res: Response) => {
        try {
            const coupon = await this.couponUseCase.getCouponByCode(req.params.code);

            if (!coupon) {
                return res.status(404).json({ message: 'Coupon not found' });
            }

            res.json(coupon);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    validate = async (req: Request, res: Response) => {
        try {
            const { code, orderTotal } = req.body;

            if (!code || orderTotal === undefined) {
                return res.status(400).json({ message: 'code and orderTotal are required' });
            }

            const result = await this.couponUseCase.validateCoupon(code, Number(orderTotal));
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const { code, discountType, discountValue } = req.body;

            if (!code || !discountType || discountValue === undefined) {
                return res.status(400).json({ message: 'code, discountType, and discountValue are required' });
            }

            const coupon = await this.couponUseCase.createCoupon(req.body);
            res.status(201).json(coupon);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const couponId = Number(req.params.id);

            const updated = await this.couponUseCase.updateCoupon({
                couponId,
                ...req.body,
            });

            if (!updated) {
                return res.status(404).json({ message: 'Coupon not found' });
            }

            res.json(updated);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const couponId = Number(req.params.id);
            const success = await this.couponUseCase.deleteCoupon(couponId);

            if (!success) {
                return res.status(404).json({ message: 'Coupon not found' });
            }

            res.json({ message: 'Coupon deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}
