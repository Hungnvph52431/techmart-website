import { Router } from 'express';
import { AdminProductController } from '../../controllers/AdminProductController';
import { adminMiddleware, authMiddleware } from '../../middlewares/auth.middleware';

export const createAdminProductRoutes = (
  adminProductController: AdminProductController
) => {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);
  router.get('/', adminProductController.getAll);
  router.get('/:id', adminProductController.getById);
  router.post('/', adminProductController.create);
  router.put('/:id', adminProductController.update);
  router.patch('/:id/archive', adminProductController.archive);

  return router;
};
