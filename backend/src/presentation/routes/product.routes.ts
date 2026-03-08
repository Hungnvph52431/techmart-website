import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  router.get('/', productController.getAll);
  router.get('/slug/:slug', productController.getBySlug);
  router.get('/:id', productController.getById);

  return router;
};
