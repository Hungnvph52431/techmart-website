import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import {
  createConversation,
  getConversation,
  getMessages,
  markReadAsCustomer,
  type SupportConversation,
  type SupportMessage,
} from '@/services/supportChat.service';

const API_URL = import.meta.env.VITE_API_URL as string;
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const LS_CONV_ID = 'techmart_support_conversation_id';
const LS_GUEST_TOKEN = 'techmart_support_guest_token';
const LS_GUEST_NAME = 'techmart_support_guest_name';
const LS_GUEST_EMAIL = 'techmart_support_guest_email';

interface Props {
  active: boolean;
}

type Phase = 'loading' | 'active' | 'closed';

const WELCOME_QUICK_REPLIES = [
  'Kiểm tra đơn hàng',
  'Đổi/trả hàng',
  'Bảo hành sản phẩm',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupportChatPanel({ active }: Props) {
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const [phase, setPhase] = useState<Phase>('loading');
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [staffName, setStaffName] = useState('');

  // Guest identity — chỉ hỏi 1 lần, lưu localStorage
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem(LS_GUEST_NAME) || ''
  );
  const [guestEmail, setGuestEmail] = useState(
    () => localStorage.getItem(LS_GUEST_EMAIL) || ''
  );

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const needsGuestInfo = !isLoggedIn && (!guestName.trim() || !guestEmail.trim());

  // ==================================================
  // Load conversation từ localStorage
  // ==================================================
  useEffect(() => {
    const savedId = localStorage.getItem(LS_CONV_ID);
    const savedGuestToken = localStorage.getItem(LS_GUEST_TOKEN);
    if (!savedId) {
      setPhase('active');
      return;
    }
    const conversationId = Number(savedId);

    (async () => {
      try {
        const conv = await getConversation(conversationId, {
          token,
          guestToken: savedGuestToken,
        });
        if (conv.status === 'closed') {
          clearLocalConversation();
          setPhase('active');
          return;
        }
        const msgs = await getMessages(conversationId, {
          token,
          guestToken: savedGuestToken,
        });
        setConversation(conv);
        setMessages(msgs);
        setPhase('active');
      } catch {
        clearLocalConversation();
        setPhase('active');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // Kết nối Socket khi có conversation
  // ==================================================
  useEffect(() => {
    if (!conversation) return;

    const guestTok = localStorage.getItem(LS_GUEST_TOKEN) || undefined;
    const socket = io(`${SOCKET_URL}/support`, {
      auth: token ? { token } : { guestToken: guestTok },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(
        'join-conversation',
        { conversationId: conversation.conversationId },
        () => {}
      );
    });

    socket.on('new-message', (msg: SupportMessage & { senderName?: string }) => {
      if (msg.conversationId !== conversation.conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.messageId === msg.messageId)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('conversation-assigned', (evt: { conversationId: number; staffName: string }) => {
      if (evt.conversationId !== conversation.conversationId) return;
      setStaffName(evt.staffName);
      setConversation((prev) => (prev ? { ...prev, status: 'assigned' } : prev));
      setMessages((prev) => [
        ...prev,
        {
          messageId: -Date.now(),
          conversationId: evt.conversationId,
          senderType: 'system',
          senderId: null,
          content: `${evt.staffName} đã tham gia cuộc trò chuyện`,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    socket.on('conversation-closed', () => {
      clearLocalConversation();
      setPhase('closed');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Support socket] connect_error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversation?.conversationId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================================================
  // Auto scroll + mark-read
  // ==================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  useEffect(() => {
    if (!active || !conversation) return;
    const guestTok = localStorage.getItem(LS_GUEST_TOKEN) || undefined;
    markReadAsCustomer(conversation.conversationId, { token, guestToken: guestTok }).catch(() => {});
    socketRef.current?.emit('mark-read', { conversationId: conversation.conversationId });
  }, [active, conversation, messages.length, token]);

  // Auto focus input khi mở tab
  useEffect(() => {
    if (active && phase === 'active') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [active, phase]);

  // ==================================================
  // Handlers
  // ==================================================
  const clearLocalConversation = () => {
    localStorage.removeItem(LS_CONV_ID);
    localStorage.removeItem(LS_GUEST_TOKEN);
  };

  const validateGuest = (): string | null => {
    if (!guestName.trim()) return 'Vui lòng nhập tên';
    if (!/^\S+@\S+\.\S+$/.test(guestEmail)) return 'Email không hợp lệ';
    return null;
  };

  const sendFirstMessage = useCallback(
    async (content: string) => {
      setErrorMsg('');
      if (!isLoggedIn) {
        const err = validateGuest();
        if (err) {
          setErrorMsg(err);
          return;
        }
      }

      try {
        setSending(true);
        const result = await createConversation(
          {
            guestName: isLoggedIn ? undefined : guestName.trim(),
            guestEmail: isLoggedIn ? undefined : guestEmail.trim(),
            initialMessage: content,
          },
          token
        );
        localStorage.setItem(LS_CONV_ID, String(result.conversation.conversationId));
        if (result.guestToken) {
          localStorage.setItem(LS_GUEST_TOKEN, result.guestToken);
          localStorage.setItem(LS_GUEST_NAME, guestName.trim());
          localStorage.setItem(LS_GUEST_EMAIL, guestEmail.trim());
        }
        setConversation(result.conversation);
        setMessages([result.firstMessage]);
        setInput('');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setSending(false);
      }
    },
    [isLoggedIn, guestName, guestEmail, token]
  );

  const sendViaSocket = useCallback(
    (content: string) => {
      if (!conversation) return;
      const socket = socketRef.current;
      if (!socket?.connected) {
        setErrorMsg('Mất kết nối, đang thử lại...');
        return;
      }
      setSending(true);
      socket.emit(
        'send-message',
        { conversationId: conversation.conversationId, content },
        (ack: { ok: boolean; error?: string; data?: SupportMessage }) => {
          setSending(false);
          if (!ack?.ok) {
            setErrorMsg(ack?.error || 'Gửi tin thất bại');
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
    },
    [conversation]
  );

  const handleSend = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || sending) return;
      setErrorMsg('');
      if (!conversation) {
        sendFirstMessage(content);
      } else {
        sendViaSocket(content);
      }
    },
    [input, sending, conversation, sendFirstMessage, sendViaSocket]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    clearLocalConversation();
    setConversation(null);
    setMessages([]);
    setStaffName('');
    setInput('');
    setPhase('active');
  };

  // ==================================================
  // Render
  // ==================================================

  if (phase === 'loading') {
    return (
      <div className="support-panel">
        <div className="support-empty">
          <div className="support-spinner" />
          <p>Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  if (phase === 'closed') {
    return (
      <div className="support-panel">
        <div className="support-empty">
          <div className="support-empty-icon">✓</div>
          <p className="support-empty-title">Cuộc trò chuyện đã kết thúc</p>
          <p className="support-empty-sub">Cảm ơn bạn đã liên hệ TechMart</p>
          <button className="support-primary-btn" onClick={startNewChat}>
            Bắt đầu chat mới
          </button>
        </div>
      </div>
    );
  }

  // phase === 'active'
  const isClosed = conversation?.status === 'closed';
  const showGuestFields = !conversation && needsGuestInfo;
  const statusBanner = conversation
    ? conversation.status === 'assigned'
      ? staffName
        ? `${staffName} đang hỗ trợ bạn`
        : 'Nhân viên đang hỗ trợ bạn'
      : 'Đang kết nối với nhân viên...'
    : null;

  return (
    <div className="support-panel">
      {statusBanner && (
        <div className="support-status-banner">
          <span className="support-status-dot" />
          <span>{statusBanner}</span>
        </div>
      )}

      <div className="support-messages">
        {/* Welcome bubble hiển thị khi chưa có conversation */}
        {!conversation && (
          <>
            <div className="support-msg-row other">
              <div className="support-staff-avatar">T</div>
              <div className="support-bubble other">
                {isLoggedIn ? (
                  <>Xin chào <b>{user?.fullName}</b>! 👋<br />Tụi mình hỗ trợ 24/7, bạn cần giúp gì ạ?</>
                ) : (
                  <>Xin chào! 👋<br />Tụi mình là nhân viên TechMart. Bạn cần tư vấn gì nhỉ?</>
                )}
              </div>
            </div>
            <div className="support-quick-replies">
              {WELCOME_QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  className="support-quick-chip"
                  onClick={() => {
                    if (needsGuestInfo) {
                      setInput(q);
                      inputRef.current?.focus();
                    } else {
                      handleSend(q);
                    }
                  }}
                  disabled={sending}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tin nhắn cuộc trò chuyện */}
        {messages.map((msg) => {
          if (msg.senderType === 'system') {
            return (
              <div key={msg.messageId} className="support-system-msg">
                {msg.content}
              </div>
            );
          }
          const isMine = msg.senderType === 'customer';
          return (
            <div
              key={msg.messageId}
              className={`support-msg-row ${isMine ? 'mine' : 'other'}`}
            >
              {!isMine && <div className="support-staff-avatar">T</div>}
              <div className="support-bubble-wrap">
                <div className={`support-bubble ${isMine ? 'mine' : 'other'}`}>
                  {msg.content}
                </div>
                <span className="support-msg-time">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Guest fields (compact, chỉ hỏi lần đầu) */}
      {showGuestFields && (
        <div className="support-guest-fields">
          <input
            className="support-guest-field"
            placeholder="Tên của bạn"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            disabled={sending}
          />
          <input
            className="support-guest-field"
            type="email"
            placeholder="Email để liên hệ lại"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            disabled={sending}
          />
        </div>
      )}

      {errorMsg && <div className="support-error-inline">{errorMsg}</div>}

      {/* Input area */}
      <div className="support-input-area">
        <textarea
          ref={inputRef}
          className="support-textarea"
          placeholder={
            isClosed
              ? 'Hội thoại đã đóng'
              : conversation
                ? 'Nhập tin nhắn...'
                : 'Nhập tin nhắn đầu tiên...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending || isClosed}
        />
        <button
          className="support-send-btn"
          onClick={() => handleSend()}
          disabled={sending || !input.trim() || isClosed}
          aria-label="Gửi"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
