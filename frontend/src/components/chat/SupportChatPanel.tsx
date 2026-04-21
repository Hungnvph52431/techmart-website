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
const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); // strip /api suffix

const LS_CONV_ID = 'techmart_support_conversation_id';
const LS_GUEST_TOKEN = 'techmart_support_guest_token';

interface Props {
  active: boolean; // tab đang được hiện - dùng để auto mark-read
}

type Phase = 'loading' | 'form' | 'chat' | 'closed' | 'error';

export default function SupportChatPanel({ active }: Props) {
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token;

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [staffName, setStaffName] = useState<string>('');

  // Form state (cho khách vãng lai)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ==================================================
  // Khởi tạo: check localStorage, load conversation nếu có
  // ==================================================
  useEffect(() => {
    const savedId = localStorage.getItem(LS_CONV_ID);
    const savedGuestToken = localStorage.getItem(LS_GUEST_TOKEN);
    if (!savedId) {
      setPhase('form');
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
          setPhase('closed');
          return;
        }
        const msgs = await getMessages(conversationId, {
          token,
          guestToken: savedGuestToken,
        });
        setConversation(conv);
        setMessages(msgs);
        setPhase('chat');
      } catch (err) {
        // Có thể conversation không còn truy cập được → xóa và quay về form
        clearLocalConversation();
        setPhase('form');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // Kết nối Socket khi vào phase chat
  // ==================================================
  useEffect(() => {
    if (phase !== 'chat' || !conversation) return;

    const guestToken = localStorage.getItem(LS_GUEST_TOKEN) || undefined;
    const socket = io(`${SOCKET_URL}/support`, {
      auth: token ? { token } : { guestToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-conversation', { conversationId: conversation.conversationId }, () => {
        // no-op
      });
    });

    socket.on('new-message', (msg: SupportMessage & { senderName?: string }) => {
      if (msg.conversationId !== conversation.conversationId) return;
      setMessages((prev) => {
        // Dedupe nếu message đã tồn tại (mình gửi REST fallback rồi socket echo)
        if (prev.some((m) => m.messageId === msg.messageId)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('conversation-assigned', (evt: { conversationId: number; staffName: string }) => {
      if (evt.conversationId !== conversation.conversationId) return;
      setStaffName(evt.staffName);
      setConversation((prev) => prev ? { ...prev, status: 'assigned' } : prev);
      // Thêm system message vào UI (không lưu DB)
      setMessages((prev) => [
        ...prev,
        {
          messageId: -Date.now(),
          conversationId: evt.conversationId,
          senderType: 'system',
          senderId: null,
          content: `${evt.staffName} đã tham gia cuộc hội thoại`,
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
  }, [phase, conversation?.conversationId, token, conversation]);

  // ==================================================
  // Auto scroll + mark-read khi tab active
  // ==================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!active || phase !== 'chat' || !conversation) return;
    const guestToken = localStorage.getItem(LS_GUEST_TOKEN) || undefined;
    markReadAsCustomer(conversation.conversationId, { token, guestToken }).catch(() => {});
    socketRef.current?.emit('mark-read', { conversationId: conversation.conversationId });
  }, [active, phase, conversation, messages.length, token]);

  // ==================================================
  // Handlers
  // ==================================================
  const clearLocalConversation = () => {
    localStorage.removeItem(LS_CONV_ID);
    localStorage.removeItem(LS_GUEST_TOKEN);
  };

  const handleSubmitForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const msg = formMessage.trim();
    if (!msg) {
      setErrorMsg('Vui lòng nhập nội dung cần hỗ trợ.');
      return;
    }
    if (!isLoggedIn) {
      if (!formName.trim() || !formEmail.trim()) {
        setErrorMsg('Vui lòng nhập tên và email.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
        setErrorMsg('Email không hợp lệ.');
        return;
      }
    }

    try {
      setSending(true);
      const result = await createConversation(
        {
          guestName: isLoggedIn ? undefined : formName.trim(),
          guestEmail: isLoggedIn ? undefined : formEmail.trim(),
          subject: formSubject.trim() || undefined,
          initialMessage: msg,
        },
        token
      );
      localStorage.setItem(LS_CONV_ID, String(result.conversation.conversationId));
      if (result.guestToken) {
        localStorage.setItem(LS_GUEST_TOKEN, result.guestToken);
      }
      setConversation(result.conversation);
      setMessages([result.firstMessage]);
      setPhase('chat');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSending(false);
    }
  }, [formMessage, formName, formEmail, formSubject, isLoggedIn, token]);

  const handleSendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !conversation || sending) return;
    const socket = socketRef.current;
    if (!socket?.connected) {
      setErrorMsg('Mất kết nối. Đang thử lại...');
      return;
    }
    setSending(true);
    socket.emit(
      'send-message',
      { conversationId: conversation.conversationId, content },
      (ack: { ok: boolean; error?: string; data?: SupportMessage }) => {
        setSending(false);
        if (!ack?.ok) {
          setErrorMsg(ack?.error || 'Gửi tin thất bại.');
          return;
        }
        setInput('');
        // Server sẽ emit new-message → component tự nhận; nhưng thêm ngay để mượt
        if (ack.data && !messages.some((m) => m.messageId === ack.data!.messageId)) {
          setMessages((prev) => [...prev, ack.data!]);
        }
      }
    );
  }, [input, conversation, sending, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    clearLocalConversation();
    setConversation(null);
    setMessages([]);
    setStaffName('');
    setFormMessage('');
    setFormSubject('');
    setPhase('form');
  };

  // ==================================================
  // Render
  // ==================================================

  if (phase === 'loading') {
    return (
      <div className="support-panel">
        <div className="support-empty">
          <div className="support-spinner" />
          <p>Đang tải cuộc hội thoại...</p>
        </div>
      </div>
    );
  }

  if (phase === 'closed') {
    return (
      <div className="support-panel">
        <div className="support-empty">
          <p>Cuộc hội thoại đã kết thúc.</p>
          <button className="support-primary-btn" onClick={startNewChat}>
            Bắt đầu chat mới
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'form') {
    return (
      <div className="support-panel">
        <form className="support-form" onSubmit={handleSubmitForm}>
          <div className="support-form-intro">
            <p>Đội ngũ TechMart sẽ trả lời bạn trong vài phút. Vui lòng mô tả vấn đề:</p>
          </div>
          {!isLoggedIn && (
            <>
              <input
                className="support-field"
                placeholder="Tên của bạn"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <input
                className="support-field"
                type="email"
                placeholder="Email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </>
          )}
          <input
            className="support-field"
            placeholder="Chủ đề (vd: Đơn ORD-... chưa về)"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
          />
          <textarea
            className="support-field support-field-area"
            placeholder="Mô tả chi tiết..."
            rows={3}
            value={formMessage}
            onChange={(e) => setFormMessage(e.target.value)}
            required
          />
          {errorMsg && <div className="support-error">{errorMsg}</div>}
          <button type="submit" className="support-primary-btn" disabled={sending}>
            {sending ? 'Đang gửi...' : 'Bắt đầu chat'}
          </button>
          {isLoggedIn && user && (
            <p className="support-form-hint">
              Bạn đang đăng nhập với <b>{user.fullName}</b>
            </p>
          )}
        </form>
      </div>
    );
  }

  // phase === 'chat'
  const statusLine =
    conversation?.status === 'assigned' && staffName
      ? `${staffName} đang hỗ trợ bạn`
      : conversation?.status === 'assigned'
        ? 'Nhân viên đang hỗ trợ bạn'
        : 'Đang chờ nhân viên tham gia...';

  return (
    <div className="support-panel">
      <div className="support-status-banner">
        <span className="support-status-dot" />
        <span>{statusLine}</span>
      </div>
      <div className="support-messages">
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
              <div className={`support-bubble ${isMine ? 'mine' : 'other'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="support-input-area">
        <textarea
          ref={inputRef}
          className="support-textarea"
          placeholder="Nhập tin nhắn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending || conversation?.status === 'closed'}
        />
        <button
          className="support-send-btn"
          onClick={handleSendMessage}
          disabled={sending || !input.trim()}
          aria-label="Gửi"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {errorMsg && <div className="support-error support-error-inline">{errorMsg}</div>}
    </div>
  );
}
