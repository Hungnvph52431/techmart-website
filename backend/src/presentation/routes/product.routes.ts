import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  router.get('/', productController.getAll);
  router.get('/stats', authMiddleware, adminMiddleware, productController.getStats);
  router.get('/slug/:slug', productController.getBySlug);
  router.get('/:id', productController.getById);
  router.post('/', authMiddleware, adminMiddleware, productController.create);
  router.put('/:id', authMiddleware, adminMiddleware, productController.update);
  router.delete('/:id', authMiddleware, adminMiddleware, productController.delete);

  return router;
};
