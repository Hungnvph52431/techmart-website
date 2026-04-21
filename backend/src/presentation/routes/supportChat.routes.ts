import { Router } from 'express';
import { SupportChatController } from '../controllers/SupportChatController';
import {
  authMiddleware,
  optionalAuthMiddleware,
  staffMiddleware,
} from '../middlewares/auth.middleware';

/**
 * Customer-facing routes: /api/support/*
 * - Login hoặc guest đều dùng được. Guest phải gửi header x-guest-token
 *   cho các request cần xác thực quyền truy cập conversation.
 */
export function createSupportChatCustomerRoutes(
  controller: SupportChatController
): Router {
  const router = Router();

  router.post('/conversations', optionalAuthMiddleware, (req, res) =>
    controller.createConversation(req, res)
  );

  router.get('/conversations/me', authMiddleware, (req, res) =>
    controller.getMyConversations(req, res)
  );

  router.get('/conversations/:id', optionalAuthMiddleware, (req, res) =>
    controller.getConversationForCustomer(req, res)
  );

  router.get('/conversations/:id/messages', optionalAuthMiddleware, (req, res) =>
    controller.getMessages(req, res)
  );

  router.post('/conversations/:id/messages', optionalAuthMiddleware, (req, res) =>
    controller.sendCustomerMessage(req, res)
  );

  router.put('/conversations/:id/read', optionalAuthMiddleware, (req, res) =>
    controller.markReadCustomer(req, res)
  );

  return router;
}

/**
 * Staff-facing routes: /api/staff/support/*
 * Tất cả đều require auth + role staff/admin.
 */
export function createSupportChatStaffRoutes(
  controller: SupportChatController
): Router {
  const router = Router();

  router.use(authMiddleware, staffMiddleware);

  router.get('/conversations', (req, res) => controller.listForStaff(req, res));

  router.get('/conversations/:id/messages', (req, res) =>
    controller.getMessages(req, res)
  );

  router.post('/conversations/:id/messages', (req, res) =>
    controller.sendStaffMessage(req, res)
  );

  router.put('/conversations/:id/assign', (req, res) =>
    controller.assignToMe(req, res)
  );

  router.put('/conversations/:id/close', (req, res) =>
    controller.closeConversation(req, res)
  );

  router.put('/conversations/:id/read', (req, res) =>
    controller.markReadStaff(req, res)
  );

  return router;
}
