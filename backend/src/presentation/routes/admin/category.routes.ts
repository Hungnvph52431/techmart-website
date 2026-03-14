import { Router } from 'express';
import { CategoryController } from '../../controllers/CategoryController';
import { adminMiddleware, authMiddleware } from '../../middlewares/auth.middleware';

export const createAdminCategoryRoutes = (categoryController: CategoryController) => {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);
  router.get('/', categoryController.getAll);
  router.get('/tree', categoryController.getTree);
  router.post('/', categoryController.create);
  router.put('/:id', categoryController.update);
  router.delete('/:id', categoryController.delete);

  return router;
};
