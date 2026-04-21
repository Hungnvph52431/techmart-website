const API_URL = import.meta.env.VITE_API_URL;

export type ConversationStatus = 'open' | 'assigned' | 'closed';
export type MessageSenderType = 'customer' | 'staff' | 'system';

export interface SupportMessage {
  messageId: number;
  conversationId: number;
  senderType: MessageSenderType;
  senderId: number | null;
  content: string;
  readAt: string | null;
  createdAt: string;
  senderName?: string; // chỉ có khi nhận qua socket
}

export interface SupportConversation {
  conversationId: number;
  userId: number | null;
  guestName: string | null;
  guestEmail: string | null;
  guestToken: string | null;
  subject: string | null;
  status: ConversationStatus;
  assignedStaffId: number | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCustomer: number;
  unreadStaff: number;
  createdAt: string;
  closedAt: string | null;
}

export interface ConversationWithInfo extends SupportConversation {
  customerName: string;
  customerEmail: string | null;
  assignedStaffName: string | null;
}

export interface CreateConversationInput {
  guestName?: string;
  guestEmail?: string;
  subject?: string;
  initialMessage: string;
}

export interface CreateConversationResult {
  conversation: SupportConversation;
  guestToken?: string;
  firstMessage: SupportMessage;
}

function buildHeaders(opts?: { token?: string | null; guestToken?: string | null }): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts?.guestToken) headers['x-guest-token'] = opts.guestToken;
  return headers;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Lỗi không xác định');
  }
  return data.data as T;
}

// ==================================================
// Customer API
// ==================================================

export async function createConversation(
  input: CreateConversationInput,
  token?: string | null
): Promise<CreateConversationResult> {
  const res = await fetch(`${API_URL}/support/conversations`, {
    method: 'POST',
    headers: buildHeaders({ token }),
    body: JSON.stringify(input),
  });
  return handle<CreateConversationResult>(res);
}

export async function getConversation(
  conversationId: number,
  auth: { token?: string | null; guestToken?: string | null }
): Promise<SupportConversation> {
  const res = await fetch(`${API_URL}/support/conversations/${conversationId}`, {
    headers: buildHeaders(auth),
  });
  return handle<SupportConversation>(res);
}

export async function getMessages(
  conversationId: number,
  auth: { token?: string | null; guestToken?: string | null },
  opts?: { limit?: number; beforeId?: number }
): Promise<SupportMessage[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.beforeId) params.set('beforeId', String(opts.beforeId));
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(
    `${API_URL}/support/conversations/${conversationId}/messages${query}`,
    { headers: buildHeaders(auth) }
  );
  return handle<SupportMessage[]>(res);
}

export async function markReadAsCustomer(
  conversationId: number,
  auth: { token?: string | null; guestToken?: string | null }
): Promise<void> {
  await fetch(`${API_URL}/support/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: buildHeaders(auth),
  });
}

export async function getMyConversations(token: string): Promise<ConversationWithInfo[]> {
  const res = await fetch(`${API_URL}/support/conversations/me`, {
    headers: buildHeaders({ token }),
  });
  return handle<ConversationWithInfo[]>(res);
}

// ==================================================
// Staff API
// ==================================================

export type StaffFilter = 'all' | 'mine' | 'unassigned' | 'closed';

export async function listConversationsForStaff(
  token: string,
  opts: { filter?: StaffFilter; search?: string; limit?: number; offset?: number } = {}
): Promise<{ items: ConversationWithInfo[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.filter) params.set('filter', opts.filter);
  if (opts.search) params.set('search', opts.search);
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.offset !== undefined) params.set('offset', String(opts.offset));
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_URL}/staff/support/conversations${query}`, {
    headers: buildHeaders({ token }),
  });
  return handle<{ items: ConversationWithInfo[]; total: number }>(res);
}

export async function getMessagesAsStaff(
  token: string,
  conversationId: number,
  opts?: { limit?: number; beforeId?: number }
): Promise<SupportMessage[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.beforeId) params.set('beforeId', String(opts.beforeId));
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(
    `${API_URL}/staff/support/conversations/${conversationId}/messages${query}`,
    { headers: buildHeaders({ token }) }
  );
  return handle<SupportMessage[]>(res);
}

export async function assignConversationToMe(
  token: string,
  conversationId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/staff/support/conversations/${conversationId}/assign`, {
    method: 'PUT',
    headers: buildHeaders({ token }),
  });
  await handle(res);
}

export async function closeConversationAsStaff(
  token: string,
  conversationId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/staff/support/conversations/${conversationId}/close`, {
    method: 'PUT',
    headers: buildHeaders({ token }),
  });
  await handle(res);
}

export async function markReadAsStaff(
  token: string,
  conversationId: number
): Promise<void> {
  await fetch(`${API_URL}/staff/support/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: buildHeaders({ token }),
  });
}
