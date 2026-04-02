import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { authMiddleware, staffMiddleware } from '../middlewares/auth.middleware';

export const createBrandRoutes = (brandController: BrandController) => {
  const router = Router();

  router.get('/', brandController.getAll);
  router.get('/:id', brandController.getById);
  // Admin + Staff: quản lý thương hiệu
  router.post('/', authMiddleware, staffMiddleware, brandController.create);
  router.put('/:id', authMiddleware, staffMiddleware, brandController.update);
  router.delete('/:id', authMiddleware, staffMiddleware, brandController.delete);

  return router;
};
