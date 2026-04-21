import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SupportChatUseCase } from '../../application/use-cases/SupportChatUseCase';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

interface SocketUser {
  role: 'customer' | 'staff' | 'admin' | 'guest';
  userId?: number;
  guestToken?: string;
  name?: string;
}

interface AckResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

type WithUser = Socket & { user?: SocketUser };

export class SupportChatSocketServer {
  private io: IOServer;
  private supportNs: ReturnType<IOServer['of']>;

  constructor(
    httpServer: HttpServer,
    private readonly useCase: SupportChatUseCase,
    corsOrigins: string[]
  ) {
    this.io = new IOServer(httpServer, {
      cors: { origin: corsOrigins, credentials: true },
      path: '/socket.io',
    });

    this.supportNs = this.io.of('/support');
    this.setupAuth();
    this.setupHandlers();
  }

  // ==================================================
  // Auth middleware cho namespace
  // ==================================================
  private setupAuth() {
    this.supportNs.use((socket: WithUser, next) => {
      try {
        const token = socket.handshake.auth?.token;
        const guestToken = socket.handshake.auth?.guestToken;

        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          socket.user = {
            role: decoded.role || 'customer',
            userId: decoded.userId || decoded.id,
            name: decoded.name,
          };
          return next();
        }

        if (guestToken) {
          socket.user = { role: 'guest', guestToken };
          return next();
        }

        next(new Error('Unauthorized: missing token'));
      } catch (err) {
        next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  // ==================================================
  // Handlers
  // ==================================================
  private setupHandlers() {
    this.supportNs.on('connection', (socket: WithUser) => {
      const user = socket.user;
      if (!user) {
        socket.disconnect();
        return;
      }

      // Staff tự join room broadcast để nhận thông báo conversation mới
      if (user.role === 'staff' || user.role === 'admin') {
        socket.join('staff');
      }

      socket.on('join-conversation', async (
        payload: { conversationId: number },
        ack: (r: AckResponse) => void
      ) => {
        try {
          const conv = await this.useCase.authorizeAccess({
            conversationId: payload.conversationId,
            userId: user.userId,
            userRole: user.role,
            guestToken: user.guestToken,
          });
          socket.join(`conv-${payload.conversationId}`);
          if (ack) ack({ ok: true, data: conv });
        } catch (err) {
          if (ack) ack({ ok: false, error: this.errMsg(err) });
        }
      });

      socket.on('leave-conversation', (payload: { conversationId: number }) => {
        socket.leave(`conv-${payload.conversationId}`);
      });

      socket.on('send-message', async (
        payload: { conversationId: number; content: string },
        ack: (r: AckResponse) => void
      ) => {
        try {
          await this.useCase.authorizeAccess({
            conversationId: payload.conversationId,
            userId: user.userId,
            userRole: user.role,
            guestToken: user.guestToken,
          });

          const isStaff = user.role === 'staff' || user.role === 'admin';
          const message = await this.useCase.sendMessage({
            conversationId: payload.conversationId,
            senderType: isStaff ? 'staff' : 'customer',
            senderId: user.userId ?? null,
            content: payload.content,
          });

          // Emit tới room của conversation (cả customer + staff đang ở đó)
          this.supportNs.to(`conv-${payload.conversationId}`).emit('new-message', {
            ...message,
            senderName: user.name,
          });

          // Thông báo riêng cho toàn bộ staff để update list sidebar
          this.supportNs.to('staff').emit('conversation-updated', {
            conversationId: payload.conversationId,
            lastMessagePreview: payload.content.slice(0, 200),
            lastMessageAt: message.createdAt,
            byStaff: isStaff,
          });

          if (ack) ack({ ok: true, data: message });
        } catch (err) {
          if (ack) ack({ ok: false, error: this.errMsg(err) });
        }
      });

      socket.on('typing', (payload: { conversationId: number; typing: boolean }) => {
        socket.to(`conv-${payload.conversationId}`).emit('typing', {
          conversationId: payload.conversationId,
          typing: payload.typing,
          from: user.role === 'staff' || user.role === 'admin' ? 'staff' : 'customer',
          name: user.name,
        });
      });

      socket.on('mark-read', async (payload: { conversationId: number }) => {
        try {
          const side: 'customer' | 'staff' =
            user.role === 'staff' || user.role === 'admin' ? 'staff' : 'customer';
          await this.useCase.markRead(payload.conversationId, side);
          this.supportNs.to(`conv-${payload.conversationId}`).emit('messages-read', {
            conversationId: payload.conversationId,
            side,
          });
        } catch (err) {
          console.error('[Socket /support] mark-read error:', err);
        }
      });

      socket.on('disconnect', () => {
        // no-op; rooms auto-clean
      });
    });
  }

  // ==================================================
  // Public emitters (gọi từ REST controller khi cần)
  // ==================================================

  emitNewConversation(conversationId: number, preview: {
    customerName: string;
    lastMessagePreview: string;
  }) {
    this.supportNs.to('staff').emit('new-conversation', { conversationId, ...preview });
  }

  emitConversationAssigned(conversationId: number, staffId: number, staffName: string) {
    this.supportNs.to(`conv-${conversationId}`).emit('conversation-assigned', {
      conversationId,
      staffId,
      staffName,
    });
    this.supportNs.to('staff').emit('conversation-updated', {
      conversationId,
      assignedStaffId: staffId,
    });
  }

  emitConversationClosed(conversationId: number) {
    this.supportNs.to(`conv-${conversationId}`).emit('conversation-closed', { conversationId });
    this.supportNs.to('staff').emit('conversation-updated', {
      conversationId,
      status: 'closed',
    });
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : 'Lỗi không xác định';
  }
}
