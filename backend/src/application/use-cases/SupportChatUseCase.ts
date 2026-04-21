import crypto from 'crypto';
import { ISupportChatRepository } from '../../domain/repositories/ISupportChatRepository';
import {
  SupportConversation,
  SupportMessage,
  ConversationWithInfo,
  MessageSenderType,
} from '../../domain/entities/SupportChat';

export interface CreateConversationInput {
  userId?: number | null;       // có nếu khách đã đăng nhập
  guestName?: string;            // có nếu guest
  guestEmail?: string;
  subject?: string;
  initialMessage: string;
}

export interface CreateConversationOutput {
  conversation: SupportConversation;
  guestToken?: string;           // trả cho guest để lưu localStorage, tra đơn chat sau này
  firstMessage: SupportMessage;
}

export interface SendMessageInput {
  conversationId: number;
  senderType: MessageSenderType;
  senderId: number | null;
  content: string;
}

export class SupportChatUseCase {
  constructor(private readonly repo: ISupportChatRepository) {}

  async createConversation(input: CreateConversationInput): Promise<CreateConversationOutput> {
    const content = input.initialMessage.trim();
    if (!content) throw new Error('Nội dung tin nhắn không được trống.');
    if (content.length > 2000) throw new Error('Tin nhắn tối đa 2000 ký tự.');

    const isGuest = !input.userId;
    if (isGuest) {
      if (!input.guestName?.trim()) throw new Error('Khách vãng lai cần cung cấp tên.');
      if (!input.guestEmail?.trim() || !/^\S+@\S+\.\S+$/.test(input.guestEmail)) {
        throw new Error('Email không hợp lệ.');
      }
    }

    const guestToken = isGuest ? this.generateToken() : undefined;

    const conversation = await this.repo.createConversation({
      userId: input.userId ?? null,
      guestName: input.guestName?.trim(),
      guestEmail: input.guestEmail?.trim(),
      subject: input.subject?.trim(),
      initialMessage: content,
      guestToken,
    });

    // Tạo message đầu tiên
    const firstMessage = await this.repo.createMessage({
      conversationId: conversation.conversationId,
      senderType: 'customer',
      senderId: input.userId ?? null,
      content,
    });

    return {
      conversation,
      guestToken,
      firstMessage,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<SupportMessage> {
    const content = input.content.trim();
    if (!content) throw new Error('Nội dung tin nhắn không được trống.');
    if (content.length > 2000) throw new Error('Tin nhắn tối đa 2000 ký tự.');

    const conv = await this.repo.findConversationById(input.conversationId);
    if (!conv) throw new Error('Cuộc hội thoại không tồn tại.');
    if (conv.status === 'closed') throw new Error('Cuộc hội thoại đã đóng.');

    const message = await this.repo.createMessage({
      conversationId: input.conversationId,
      senderType: input.senderType,
      senderId: input.senderId,
      content,
    });

    // Cập nhật preview + unread cho bên đối diện
    const incUnreadFor: 'customer' | 'staff' =
      input.senderType === 'customer' ? 'staff' : 'customer';
    await this.repo.updateLastMessage(input.conversationId, content, incUnreadFor);

    return message;
  }

  async getMessages(
    conversationId: number,
    limit: number = 100,
    beforeId?: number
  ): Promise<SupportMessage[]> {
    return this.repo.findMessagesByConversation(conversationId, limit, beforeId);
  }

  async getConversation(conversationId: number): Promise<SupportConversation | null> {
    return this.repo.findConversationById(conversationId);
  }

  async getConversationByGuestToken(token: string): Promise<SupportConversation | null> {
    return this.repo.findConversationByGuestToken(token);
  }

  async getConversationsForUser(userId: number): Promise<ConversationWithInfo[]> {
    return this.repo.findConversationsByUserId(userId);
  }

  async listForStaff(opts: {
    filter: 'all' | 'mine' | 'unassigned' | 'closed';
    staffId: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ConversationWithInfo[]; total: number }> {
    const repoOpts = this.staffFilterToRepoOpts(opts);
    const [items, total] = await Promise.all([
      this.repo.listConversations(repoOpts),
      this.repo.countConversations(repoOpts),
    ]);
    return { items, total };
  }

  async assignToStaff(conversationId: number, staffId: number): Promise<boolean> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) throw new Error('Cuộc hội thoại không tồn tại.');
    if (conv.status === 'closed') throw new Error('Cuộc hội thoại đã đóng.');
    return this.repo.assignStaff(conversationId, staffId);
  }

  async closeConversation(conversationId: number): Promise<boolean> {
    return this.repo.closeConversation(conversationId);
  }

  async markRead(conversationId: number, side: 'customer' | 'staff'): Promise<void> {
    await Promise.all([
      this.repo.markMessagesRead(conversationId, side),
      this.repo.resetUnread(conversationId, side),
    ]);
  }

  /**
   * Xác thực quyền truy cập cuộc hội thoại. Quăng error nếu không có quyền.
   *  - Customer đã login: phải là owner (user_id match)
   *  - Guest: phải gửi đúng guestToken
   *  - Staff/Admin: luôn có quyền (đã filter ở middleware)
   */
  async authorizeAccess(params: {
    conversationId: number;
    userId?: number;
    userRole?: string;
    guestToken?: string;
  }): Promise<SupportConversation> {
    const conv = await this.repo.findConversationById(params.conversationId);
    if (!conv) throw new Error('Cuộc hội thoại không tồn tại.');

    const isStaff = params.userRole === 'staff' || params.userRole === 'admin';
    if (isStaff) return conv;

    if (params.userId && conv.userId === params.userId) return conv;

    if (params.guestToken && conv.guestToken === params.guestToken) return conv;

    throw new Error('Không có quyền truy cập cuộc hội thoại này.');
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private staffFilterToRepoOpts(opts: {
    filter: 'all' | 'mine' | 'unassigned' | 'closed';
    staffId: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const base = { search: opts.search, limit: opts.limit, offset: opts.offset };
    switch (opts.filter) {
      case 'mine':
        return { ...base, assignedStaffId: opts.staffId, status: 'active' as const };
      case 'unassigned':
        return { ...base, unassignedOnly: true };
      case 'closed':
        return { ...base, status: 'closed' as const };
      case 'all':
      default:
        return { ...base, status: 'active' as const };
    }
  }
}
