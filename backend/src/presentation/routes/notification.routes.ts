// backend/src/presentation/routes/notification.routes.ts

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createNotificationRoutes = (controller: NotificationController) => {
  const router = Router();

  router.use(authMiddleware);

  router.get('/', controller.list);
  router.get('/unread-count', controller.unreadCount);
  router.patch('/read-all', controller.markAllRead);
  router.patch('/:id/read', controller.markRead);
  router.delete('/:id', controller.delete);

  return router;
};
