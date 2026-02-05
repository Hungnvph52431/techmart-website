import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  router.get('/', productController.getAll);
  router.get('/:id', productController.getById);
  router.get('/slug/:slug', productController.getBySlug);
  router.post('/', authMiddleware, adminMiddleware, productController.create);
  router.put('/:id', authMiddleware, adminMiddleware, productController.update);
  router.delete('/:id', authMiddleware, adminMiddleware, productController.delete);

  return router;
};
