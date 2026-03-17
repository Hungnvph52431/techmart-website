import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';

export const createBrandRoutes = (brandController: BrandController) => {
  const router = Router();

  router.get('/', brandController.getAll);

  return router;
};
