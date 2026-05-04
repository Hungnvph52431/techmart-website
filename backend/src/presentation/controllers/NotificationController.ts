// backend/src/presentation/controllers/NotificationController.ts

import { Response } from 'express';
import { NotificationUseCase } from '../../application/use-cases/NotificationUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';

export class NotificationController {
  constructor(private useCase: NotificationUseCase) {}

  // GET /api/notifications
  list = async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.user?.userId || req.user?.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const items = await this.useCase.list(userId, limit);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // GET /api/notifications/unread-count
  unreadCount = async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.user?.userId || req.user?.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const count = await this.useCase.unreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // PATCH /api/notifications/:id/read
  markRead = async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.user?.userId || req.user?.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const ok = await this.useCase.markRead(Number(req.params.id), userId);
      if (!ok) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // PATCH /api/notifications/read-all
  markAllRead = async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.user?.userId || req.user?.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      await this.useCase.markAllRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // DELETE /api/notifications/:id
  delete = async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.user?.userId || req.user?.id);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const ok = await this.useCase.delete(Number(req.params.id), userId);
      if (!ok) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
