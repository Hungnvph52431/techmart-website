import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';
import {
  ISupportChatRepository,
  ListConversationsOptions,
} from '../../domain/repositories/ISupportChatRepository';
import {
  SupportConversation,
  SupportMessage,
  ConversationWithInfo,
  CreateConversationDTO,
  CreateMessageDTO,
} from '../../domain/entities/SupportChat';

export class SupportChatRepository implements ISupportChatRepository {
  // ==================================================
  // Conversations
  // ==================================================

  async createConversation(data: CreateConversationDTO): Promise<SupportConversation> {
    const preview = data.initialMessage.slice(0, 200);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO support_chat_conversations
         (user_id, guest_name, guest_email, guest_token, subject,
          status, last_message_at, last_message_preview, unread_staff)
       VALUES (?, ?, ?, ?, ?, 'open', NOW(), ?, 1)`,
      [
        data.userId ?? null,
        data.guestName ?? null,
        data.guestEmail ?? null,
        data.guestToken ?? null,
        data.subject ?? null,
        preview,
      ]
    );
    const conv = await this.findConversationById(result.insertId);
    if (!conv) throw new Error('Failed to load created conversation');
    return conv;
  }

  async findConversationById(conversationId: number): Promise<SupportConversation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM support_chat_conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    return rows.length > 0 ? this.mapConv(rows[0]) : null;
  }

  async findConversationsByUserId(userId: number): Promise<ConversationWithInfo[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, u.name AS user_name, u.email AS user_email, s.name AS staff_name
       FROM support_chat_conversations c
       LEFT JOIN users u ON u.user_id = c.user_id
       LEFT JOIN users s ON s.user_id = c.assigned_staff_id
       WHERE c.user_id = ?
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [userId]
    );
    return rows.map((r) => this.mapConvWithInfo(r));
  }

  async findConversationByGuestToken(token: string): Promise<SupportConversation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM support_chat_conversations WHERE guest_token = ?`,
      [token]
    );
    return rows.length > 0 ? this.mapConv(rows[0]) : null;
  }

  async listConversations(opts: ListConversationsOptions): Promise<ConversationWithInfo[]> {
    const { whereClause, params } = this.buildListWhere(opts);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const offset = Math.max(opts.offset ?? 0, 0);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, u.name AS user_name, u.email AS user_email, s.name AS staff_name
       FROM support_chat_conversations c
       LEFT JOIN users u ON u.user_id = c.user_id
       LEFT JOIN users s ON s.user_id = c.assigned_staff_id
       ${whereClause}
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    );
    return rows.map((r) => this.mapConvWithInfo(r));
  }

  async countConversations(opts: ListConversationsOptions): Promise<number> {
    const { whereClause, params } = this.buildListWhere(opts);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM support_chat_conversations c
       LEFT JOIN users u ON u.user_id = c.user_id
       ${whereClause}`,
      params
    );
    return Number(rows[0]?.total ?? 0);
  }

  async assignStaff(conversationId: number, staffId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE support_chat_conversations
       SET assigned_staff_id = ?, status = 'assigned'
       WHERE conversation_id = ? AND status <> 'closed'`,
      [staffId, conversationId]
    );
    return result.affectedRows > 0;
  }

  async closeConversation(conversationId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE support_chat_conversations
       SET status = 'closed', closed_at = NOW()
       WHERE conversation_id = ? AND status <> 'closed'`,
      [conversationId]
    );
    return result.affectedRows > 0;
  }

  async updateLastMessage(
    conversationId: number,
    preview: string,
    incUnreadFor: 'customer' | 'staff'
  ): Promise<void> {
    const col = incUnreadFor === 'customer' ? 'unread_customer' : 'unread_staff';
    await pool.execute(
      `UPDATE support_chat_conversations
       SET last_message_at = NOW(),
           last_message_preview = ?,
           ${col} = ${col} + 1
       WHERE conversation_id = ?`,
      [preview.slice(0, 200), conversationId]
    );
  }

  async resetUnread(conversationId: number, side: 'customer' | 'staff'): Promise<void> {
    const col = side === 'customer' ? 'unread_customer' : 'unread_staff';
    await pool.execute(
      `UPDATE support_chat_conversations SET ${col} = 0 WHERE conversation_id = ?`,
      [conversationId]
    );
  }

  // ==================================================
  // Messages
  // ==================================================

  async createMessage(data: CreateMessageDTO): Promise<SupportMessage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO support_chat_messages
         (conversation_id, sender_type, sender_id, content)
       VALUES (?, ?, ?, ?)`,
      [data.conversationId, data.senderType, data.senderId, data.content]
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM support_chat_messages WHERE message_id = ?`,
      [result.insertId]
    );
    return this.mapMsg(rows[0]);
  }

  async findMessagesByConversation(
    conversationId: number,
    limit: number = 100,
    beforeId?: number
  ): Promise<SupportMessage[]> {
    const lim = Math.min(Math.max(limit, 1), 500);
    const params: any[] = [conversationId];
    let cursor = '';
    if (beforeId !== undefined) {
      cursor = ' AND message_id < ?';
      params.push(beforeId);
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM support_chat_messages
       WHERE conversation_id = ?${cursor}
       ORDER BY message_id DESC
       LIMIT ${Number(lim)}`,
      params
    );
    // reverse để trả về thứ tự cũ → mới (tiện render)
    return rows.reverse().map((r) => this.mapMsg(r));
  }

  async markMessagesRead(
    conversationId: number,
    side: 'customer' | 'staff'
  ): Promise<void> {
    // side đọc thì đánh dấu đọc các tin của BÊN KIA
    const otherSide = side === 'customer' ? 'staff' : 'customer';
    await pool.execute(
      `UPDATE support_chat_messages
       SET read_at = NOW()
       WHERE conversation_id = ? AND sender_type = ? AND read_at IS NULL`,
      [conversationId, otherSide]
    );
  }

  // ==================================================
  // Helpers
  // ==================================================

  private buildListWhere(opts: ListConversationsOptions): {
    whereClause: string;
    params: any[];
  } {
    const where: string[] = [];
    const params: any[] = [];

    if (opts.status === 'active') {
      where.push(`c.status IN ('open','assigned')`);
    } else if (opts.status) {
      where.push(`c.status = ?`);
      params.push(opts.status);
    }

    if (opts.unassignedOnly) {
      where.push(`c.assigned_staff_id IS NULL AND c.status = 'open'`);
    } else if (opts.assignedStaffId !== undefined) {
      where.push(`c.assigned_staff_id = ?`);
      params.push(opts.assignedStaffId);
    }

    if (opts.search && opts.search.trim()) {
      where.push(`(u.name LIKE ? OR u.email LIKE ? OR c.guest_name LIKE ? OR c.guest_email LIKE ? OR c.subject LIKE ?)`);
      const like = `%${opts.search.trim()}%`;
      params.push(like, like, like, like, like);
    }

    return {
      whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  private mapConv(r: RowDataPacket): SupportConversation {
    return {
      conversationId: r.conversation_id,
      userId: r.user_id,
      guestName: r.guest_name,
      guestEmail: r.guest_email,
      guestToken: r.guest_token,
      subject: r.subject,
      status: r.status,
      assignedStaffId: r.assigned_staff_id,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      unreadCustomer: r.unread_customer,
      unreadStaff: r.unread_staff,
      createdAt: r.created_at,
      closedAt: r.closed_at,
    };
  }

  private mapConvWithInfo(r: RowDataPacket): ConversationWithInfo {
    return {
      ...this.mapConv(r),
      customerName: r.user_name || r.guest_name || 'Khách vãng lai',
      customerEmail: r.user_email || r.guest_email || null,
      assignedStaffName: r.staff_name || null,
    };
  }

  private mapMsg(r: RowDataPacket): SupportMessage {
    return {
      messageId: r.message_id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderId: r.sender_id,
      content: r.content,
      readAt: r.read_at,
      createdAt: r.created_at,
    };
  }
}
