import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createBrandRoutes = (brandController: BrandController) => {
  const router = Router();

  router.get('/', brandController.getAll);
  router.get('/:id', brandController.getById);
  router.post('/', authMiddleware, adminMiddleware, brandController.create);
  router.put('/:id', authMiddleware, adminMiddleware, brandController.update);
  router.delete('/:id', authMiddleware, adminMiddleware, brandController.delete);

  return router;
};
