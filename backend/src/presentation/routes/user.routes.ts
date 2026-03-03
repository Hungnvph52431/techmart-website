import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

export const createUserRoutes = (userController: UserController) => {
  const router = Router();

  router.get('/', authMiddleware, adminMiddleware, userController.getAll);
  router.get('/:id', authMiddleware, adminMiddleware, userController.getById);
  router.post('/', authMiddleware, adminMiddleware, userController.create);
  router.patch('/:id', authMiddleware, adminMiddleware, userController.update);
  router.patch('/:id/status', authMiddleware, adminMiddleware, userController.updateStatus);
  router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);

  return router;
};