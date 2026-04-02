import { Router } from 'express';
import { CategoryController } from '../../controllers/CategoryController';
import { authMiddleware, staffMiddleware } from '../../middlewares/auth.middleware';

export const createAdminCategoryRoutes = (categoryController: CategoryController) => {
  const router = Router();

  // Admin + Staff: quản lý danh mục
  router.use(authMiddleware, staffMiddleware);
  router.get('/', categoryController.getAll);
  router.get('/tree', categoryController.getTree);
  router.post('/', categoryController.create);
  router.put('/:id', categoryController.update);
  router.delete('/:id', categoryController.delete);

  return router;
};
