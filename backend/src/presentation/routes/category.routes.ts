import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createCategoryRoutes = (categoryController: CategoryController) => {
    const router = Router();

    router.get('/', categoryController.getAll);
    router.get('/:id', categoryController.getById);
    router.post('/', authMiddleware, adminMiddleware, categoryController.create);
    router.put('/:id', authMiddleware, adminMiddleware, categoryController.update);
    router.delete('/:id', authMiddleware, adminMiddleware, categoryController.delete);

    return router;
};
