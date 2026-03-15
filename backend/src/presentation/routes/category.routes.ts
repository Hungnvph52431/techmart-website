import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

export const createCategoryRoutes = (categoryController: CategoryController) => {
  const router = Router();

  router.get('/', categoryController.getAll);
  router.get('/tree', categoryController.getTree);

  return router;
};
