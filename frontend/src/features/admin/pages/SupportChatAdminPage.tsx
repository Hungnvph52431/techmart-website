import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import {
  assignConversationToMe,
  closeConversationAsStaff,
  getMessagesAsStaff,
  listConversationsForStaff,
  markReadAsStaff,
  type ConversationWithInfo,
  type StaffFilter,
  type SupportMessage,
} from '@/services/supportChat.service';
import {
  MessageCircle,
  Search,
  Send,
  UserPlus,
  XCircle,
  Inbox,
  User as UserIcon,
  Mail,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL as string;
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const FILTER_TABS: { key: StaffFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'mine', label: 'Của tôi' },
  { key: 'unassigned', label: 'Chưa nhận' },
  { key: 'closed', label: 'Đã đóng' },
];

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function SupportChatAdminPage() {
  const { user, token } = useAuthStore();
  const staffId = user?.userId;

  const [filter, setFilter] = useState<StaffFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationWithInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) || null,
    [conversations, selectedId]
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ==================================================
  // Load conversation list
  // ==================================================
  const reloadList = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingList(true);
      const { items } = await listConversationsForStaff(token, {
        filter,
        search: debouncedSearch,
        limit: 100,
      });
      setConversations(items);
    } catch (err) {
      console.error('[Support admin] load list error:', err);
    } finally {
      setLoadingList(false);
    }
  }, [token, filter, debouncedSearch]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  // ==================================================
  // Socket connection
  // ==================================================
  useEffect(() => {
    if (!token) return;
    const socket = io(`${SOCKET_URL}/support`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('new-conversation', () => reloadList());
    socket.on('conversation-updated', () => reloadList());
    socket.on('conversation-closed', (evt: { conversationId: number }) => {
      if (evt.conversationId === selectedId) {
        setSelectedId(null);
        setMessages([]);
      }
      reloadList();
    });
    socket.on('new-message', (msg: SupportMessage) => {
      if (msg.conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === msg.messageId)) return prev;
          return [...prev, msg];
        });
      }
      reloadList();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ==================================================
  // Select conversation → load messages + join room
  // ==================================================
  useEffect(() => {
    if (!selectedId || !token) return;

    (async () => {
      try {
        const msgs = await getMessagesAsStaff(token, selectedId);
        setMessages(msgs);
        socketRef.current?.emit('join-conversation', { conversationId: selectedId });
        await markReadAsStaff(token, selectedId);
        socketRef.current?.emit('mark-read', { conversationId: selectedId });
        reloadList();
      } catch (err) {
        console.error('[Support admin] load messages error:', err);
      }
    })();
  }, [selectedId, token, reloadList]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================================================
  // Actions
  // ==================================================
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !selectedId || !socketRef.current || sending) return;
    setSending(true);
    socketRef.current.emit(
      'send-message',
      { conversationId: selectedId, content },
      (ack: { ok: boolean; error?: string; data?: SupportMessage }) => {
        setSending(false);
        if (!ack?.ok) {
          alert(ack?.error || 'Gửi thất bại');
          return;
        }
        setInput('');
        if (ack.data) {
          setMessages((prev) => {
            if (prev.some((m) => m.messageId === ack.data!.messageId)) return prev;
            return [...prev, ack.data!];
          });
        }
      }
    );
  }, [input, selectedId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !token || actionLoading) return;
    try {
      setActionLoading(true);
      await assignConversationToMe(token, selectedId);
      await reloadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId || !token || actionLoading) return;
    if (!confirm('Đóng cuộc hội thoại này?')) return;
    try {
      setActionLoading(true);
      await closeConversationAsStaff(token, selectedId);
      setSelectedId(null);
      setMessages([]);
      await reloadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // Render
  // ==================================================
  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-gray-900">Hỗ trợ khách hàng</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trả lời khách trực tiếp qua chat
        </p>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* ===== LEFT: Conversation list ===== */}
        <aside className="w-80 flex flex-col border-r border-gray-200 min-h-0">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Tìm khách, đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-200">
            {FILTER_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`flex-1 px-2 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  filter === t.key
                    ? 'text-blue-600 border-blue-600 bg-blue-50'
                    : 'text-gray-500 border-transparent hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingList && conversations.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">Đang tải...</div>
            )}
            {!loadingList && conversations.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">
                <Inbox size={28} className="mx-auto mb-2 text-gray-300" />
                Chưa có cuộc hội thoại nào
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.conversationId}
                onClick={() => setSelectedId(conv.conversationId)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedId === conv.conversationId ? 'bg-blue-50 hover:bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {conv.customerName}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatTime(conv.lastMessageAt || conv.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {conv.lastMessagePreview || '(chưa có tin nhắn)'}
                  </span>
                  {conv.unreadStaff > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center">
                      {conv.unreadStaff}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <StatusBadge status={conv.status} />
                  {conv.assignedStaffName && (
                    <span className="text-[10px] text-gray-400">
                      · {conv.assignedStaffName}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ===== RIGHT: Chat panel ===== */}
        <section className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <MessageCircle size={48} className="text-gray-300" />
              <p className="text-sm">Chọn cuộc hội thoại để bắt đầu trả lời</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <UserIcon size={16} className="text-gray-400" />
                    {selected.customerName}
                    <StatusBadge status={selected.status} />
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {selected.customerEmail && (
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {selected.customerEmail}
                      </span>
                    )}
                    {selected.subject && <span>· {selected.subject}</span>}
                    {selected.assignedStaffName && (
                      <span>· Phụ trách: {selected.assignedStaffName}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.status === 'open' && (
                    <button
                      onClick={handleAssign}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserPlus size={14} /> Nhận hội thoại
                    </button>
                  )}
                  {selected.status !== 'closed' &&
                    (selected.assignedStaffId === staffId || selected.status === 'open') && (
                      <button
                        onClick={handleClose}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle size={14} /> Đóng
                      </button>
                    )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-2">
                {messages.map((msg) => {
                  if (msg.senderType === 'system') {
                    return (
                      <div key={msg.messageId} className="flex justify-center">
                        <span className="text-xs text-gray-400 italic bg-white px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  const fromStaff = msg.senderType === 'staff';
                  return (
                    <div
                      key={msg.messageId}
                      className={`flex ${fromStaff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                          fromStaff
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        <div
                          className={`text-[10px] mt-1 ${fromStaff ? 'text-blue-100' : 'text-gray-400'}`}
                        >
                          {formatFull(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selected.status === 'closed' ? (
                <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-sm text-gray-500">
                  Hội thoại này đã đóng.
                </div>
              ) : (
                <div className="border-t border-gray-200 p-3 flex gap-2 items-end flex-shrink-0">
                  <textarea
                    ref={inputRef}
                    className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500 min-h-[42px] max-h-[120px]"
                    placeholder="Nhập tin nhắn trả lời khách..."
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send size={17} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ====== Status badge ======
function StatusBadge({ status }: { status: 'open' | 'assigned' | 'closed' }) {
  const cfg = {
    open: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Chờ' },
    assigned: { bg: 'bg-green-50', text: 'text-green-700', label: 'Đang xử lý' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Đã đóng' },
  }[status];
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
