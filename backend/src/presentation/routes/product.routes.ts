import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createProductRoutes = (productController: ProductController) => {
  const router = Router();

  // Public routes
  router.get('/', productController.getAll);
  router.get('/slug/:slug', productController.getBySlug);
  router.get('/:id', productController.getById);

  // Product images
  router.get('/:id/images', productController.getImages);
  router.post('/:id/images', authMiddleware, adminMiddleware, productController.addImage);
  router.delete('/:id/images/:imageId', authMiddleware, adminMiddleware, productController.deleteImage);

  // Product variants
  router.get('/:id/variants', productController.getVariants);
  router.post('/:id/variants', authMiddleware, adminMiddleware, productController.addVariant);
  router.put('/:id/variants/:variantId', authMiddleware, adminMiddleware, productController.updateVariant);
  router.delete('/:id/variants/:variantId', authMiddleware, adminMiddleware, productController.deleteVariant);

  // Admin CRUD
  router.post('/', authMiddleware, adminMiddleware, productController.create);
  router.put('/:id', authMiddleware, adminMiddleware, productController.update);
  router.delete('/:id', authMiddleware, adminMiddleware, productController.delete);

  return router;
};
