import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { adminMiddleware, authMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  router.get('/', productController.getAll);
  router.get('/stats', authMiddleware, adminMiddleware, productController.getStats);
  router.get('/slug/:slug', productController.getBySlug);
  router.get('/:id', productController.getById);

  return router;
};