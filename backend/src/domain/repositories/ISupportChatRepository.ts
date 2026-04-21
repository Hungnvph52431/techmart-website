import {
  SupportConversation,
  SupportMessage,
  ConversationWithInfo,
  CreateConversationDTO,
  CreateMessageDTO,
} from '../entities/SupportChat';

export interface ListConversationsOptions {
  status?: 'open' | 'assigned' | 'closed' | 'active'; // active = open + assigned
  assignedStaffId?: number;
  unassignedOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ISupportChatRepository {
  // Conversations
  createConversation(data: CreateConversationDTO): Promise<SupportConversation>;
  findConversationById(conversationId: number): Promise<SupportConversation | null>;
  findConversationsByUserId(userId: number): Promise<ConversationWithInfo[]>;
  findConversationByGuestToken(token: string): Promise<SupportConversation | null>;
  listConversations(opts: ListConversationsOptions): Promise<ConversationWithInfo[]>;
  countConversations(opts: ListConversationsOptions): Promise<number>;
  assignStaff(conversationId: number, staffId: number): Promise<boolean>;
  closeConversation(conversationId: number): Promise<boolean>;
  updateLastMessage(
    conversationId: number,
    preview: string,
    incUnreadFor: 'customer' | 'staff'
  ): Promise<void>;
  resetUnread(conversationId: number, side: 'customer' | 'staff'): Promise<void>;

  // Messages
  createMessage(data: CreateMessageDTO): Promise<SupportMessage>;
  findMessagesByConversation(
    conversationId: number,
    limit?: number,
    beforeId?: number
  ): Promise<SupportMessage[]>;
  markMessagesRead(
    conversationId: number,
    side: 'customer' | 'staff'
  ): Promise<void>;
}
