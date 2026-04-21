export type ConversationStatus = 'open' | 'assigned' | 'closed';

export type MessageSenderType = 'customer' | 'staff' | 'system';

export interface SupportConversation {
  conversationId: number;
  userId: number | null;
  guestName: string | null;
  guestEmail: string | null;
  guestToken: string | null;
  subject: string | null;
  status: ConversationStatus;
  assignedStaffId: number | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCustomer: number;
  unreadStaff: number;
  createdAt: Date;
  closedAt: Date | null;
}

export interface SupportMessage {
  messageId: number;
  conversationId: number;
  senderType: MessageSenderType;
  senderId: number | null;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

// View enriched cho list (join user + staff để hiện tên)
export interface ConversationWithInfo extends SupportConversation {
  customerName: string;
  customerEmail: string | null;
  assignedStaffName: string | null;
}

export interface CreateConversationDTO {
  userId?: number | null;
  guestName?: string;
  guestEmail?: string;
  subject?: string;
  initialMessage: string;
  guestToken?: string;
}

export interface CreateMessageDTO {
  conversationId: number;
  senderType: MessageSenderType;
  senderId: number | null;
  content: string;
}
