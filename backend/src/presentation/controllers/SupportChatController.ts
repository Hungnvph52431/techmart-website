import { Response } from 'express';
import { SupportChatUseCase } from '../../application/use-cases/SupportChatUseCase';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SupportChatSocketServer } from '../../infrastructure/socket/SupportChatSocket';

const GUEST_TOKEN_HEADER = 'x-guest-token';

export class SupportChatController {
  private socketServer: SupportChatSocketServer | null = null;

  constructor(private readonly useCase: SupportChatUseCase) {}

  setSocketServer(server: SupportChatSocketServer): void {
    this.socketServer = server;
  }

  // ==================================================
  // CUSTOMER ENDPOINTS
  // ==================================================

  /** POST /api/support/conversations */
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { guestName, guestEmail, subject, initialMessage } = req.body;
      const userId = req.user?.userId || req.user?.id || null;

      const result = await this.useCase.createConversation({
        userId,
        guestName,
        guestEmail,
        subject,
        initialMessage,
      });

      // Thông báo staff có cuộc chat mới
      this.socketServer?.emitNewConversation(result.conversation.conversationId, {
        customerName: result.conversation.guestName || req.user?.name || 'Khách',
        lastMessagePreview: result.conversation.lastMessagePreview || '',
      });

      res.status(201).json({
        success: true,
        data: {
          conversation: result.conversation,
          guestToken: result.guestToken, // chỉ có nếu là guest
          firstMessage: result.firstMessage,
        },
      });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  /** GET /api/support/conversations/me (yêu cầu login) */
  async getMyConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Cần đăng nhập.' });
        return;
      }
      const items = await this.useCase.getConversationsForUser(userId);
      res.json({ success: true, data: items });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** GET /api/support/conversations/:id  (customer - xem conversation của chính mình) */
  async getConversationForCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
        return;
      }
      const conversation = await this.useCase.authorizeAccess({
        conversationId,
        userId: req.user?.userId || req.user?.id,
        userRole: req.user?.role,
        guestToken: req.headers[GUEST_TOKEN_HEADER] as string | undefined,
      });
      res.json({ success: true, data: conversation });
    } catch (error) {
      this.handleError(res, error, 403);
    }
  }

  /** GET /api/support/conversations/:id/messages */
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
        return;
      }
      // Customer cần authorize, staff đã qua middleware
      if (req.user?.role !== 'staff' && req.user?.role !== 'admin') {
        await this.useCase.authorizeAccess({
          conversationId,
          userId: req.user?.userId || req.user?.id,
          guestToken: req.headers[GUEST_TOKEN_HEADER] as string | undefined,
        });
      }
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
      const messages = await this.useCase.getMessages(conversationId, limit, beforeId);
      res.json({ success: true, data: messages });
    } catch (error) {
      this.handleError(res, error, 403);
    }
  }

  /** POST /api/support/conversations/:id/messages (REST fallback - thường dùng socket) */
  async sendCustomerMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      const { content } = req.body;
      const userId = req.user?.userId || req.user?.id || null;

      await this.useCase.authorizeAccess({
        conversationId,
        userId,
        guestToken: req.headers[GUEST_TOKEN_HEADER] as string | undefined,
      });

      const message = await this.useCase.sendMessage({
        conversationId,
        senderType: 'customer',
        senderId: userId,
        content,
      });
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  /** PUT /api/support/conversations/:id/read (customer) */
  async markReadCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      await this.useCase.authorizeAccess({
        conversationId,
        userId: req.user?.userId || req.user?.id,
        guestToken: req.headers[GUEST_TOKEN_HEADER] as string | undefined,
      });
      await this.useCase.markRead(conversationId, 'customer');
      res.json({ success: true });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  // ==================================================
  // STAFF ENDPOINTS (qua staffMiddleware)
  // ==================================================

  /** GET /api/staff/support/conversations?filter=all|mine|unassigned|closed&search=&limit=&offset= */
  async listForStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const staffId = req.user?.userId || req.user?.id;
      if (!staffId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const filter = (req.query.filter as any) || 'all';
      const validFilters = ['all', 'mine', 'unassigned', 'closed'];
      if (!validFilters.includes(filter)) {
        res.status(400).json({ success: false, message: 'Filter không hợp lệ.' });
        return;
      }

      const { items, total } = await this.useCase.listForStaff({
        filter,
        staffId,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });
      res.json({ success: true, data: { items, total } });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** POST /api/staff/support/conversations/:id/messages */
  async sendStaffMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      const staffId = req.user?.userId || req.user?.id;
      const { content } = req.body;

      const message = await this.useCase.sendMessage({
        conversationId,
        senderType: 'staff',
        senderId: staffId,
        content,
      });
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  /** PUT /api/staff/support/conversations/:id/assign */
  async assignToMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      const staffId = req.user?.userId || req.user?.id;
      const staffName = req.user?.name || 'Nhân viên';
      const ok = await this.useCase.assignToStaff(conversationId, staffId);
      if (!ok) {
        res.status(400).json({ success: false, message: 'Không thể gán hội thoại.' });
        return;
      }
      this.socketServer?.emitConversationAssigned(conversationId, staffId, staffName);
      res.json({ success: true });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  /** PUT /api/staff/support/conversations/:id/close */
  async closeConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      const ok = await this.useCase.closeConversation(conversationId);
      if (!ok) {
        res.status(400).json({ success: false, message: 'Không thể đóng hội thoại.' });
        return;
      }
      this.socketServer?.emitConversationClosed(conversationId);
      res.json({ success: true });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  /** PUT /api/staff/support/conversations/:id/read */
  async markReadStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = Number(req.params.id);
      await this.useCase.markRead(conversationId, 'staff');
      res.json({ success: true });
    } catch (error) {
      this.handleError(res, error, 400);
    }
  }

  // ==================================================
  // Helpers
  // ==================================================

  private handleError(res: Response, error: unknown, defaultStatus: number = 500): void {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    const status = msg.includes('không tồn tại')
      ? 404
      : msg.includes('không có quyền')
        ? 403
        : defaultStatus;
    console.error('[SupportChatController]', error);
    res.status(status).json({ success: false, message: msg });
  }
}
