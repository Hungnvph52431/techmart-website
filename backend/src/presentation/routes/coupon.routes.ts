import { Router } from 'express';
import { CouponController } from '../controllers/CouponController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createCouponRoutes = (couponController: CouponController) => {
    const router = Router();

    // Public: lấy danh sách coupon khả dụng
    router.get('/available', couponController.getAvailable);


    // Public: validate coupon (authenticated users)
    router.post('/validate', authMiddleware, couponController.validate);

    // Public: get by code
    router.get('/code/:code', couponController.getByCode);

    // Admin CRUD
    router.get('/', authMiddleware, adminMiddleware, couponController.getAll);
    router.get('/:id', authMiddleware, adminMiddleware, couponController.getById);
    router.post('/', authMiddleware, adminMiddleware, couponController.create);
    router.put('/:id', authMiddleware, adminMiddleware, couponController.update);
    router.delete('/:id', authMiddleware, adminMiddleware, couponController.delete);

    return router;
};
