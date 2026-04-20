import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  reply: string;
  timestamp: string;
}

const API_URL = import.meta.env.VITE_API_URL;
console.log("ChatBot API_URL:", API_URL); // thêm dòng này
const QUICK_QUESTIONS = [
  "Kiểm tra đơn hàng",
  "Chính sách đổi trả",
  "Phương thức thanh toán",
  "Khuyến mãi hiện có",
];

const BOT_AVATAR = (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
    <rect width="36" height="36" rx="10" fill="url(#botGrad)" />
    <circle cx="13" cy="16" r="3" fill="white" opacity="0.9" />
    <circle cx="23" cy="16" r="3" fill="white" opacity="0.9" />
    <path d="M12 23 Q18 27 24 23" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    <rect x="15" y="7" width="6" height="3" rx="1.5" fill="white" opacity="0.6" />
    <line x1="18" y1="10" x2="18" y2="13" stroke="white" strokeWidth="1.5" opacity="0.6" />
    <defs>
      <linearGradient id="botGrad" x1="0" y1="0" x2="36" y2="36">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Xin chào! 👋 Tôi là trợ lý AI của shop. Tôi có thể giúp bạn về sản phẩm, đơn hàng, hoặc bất kỳ thắc mắc nào khác!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const historyForAPI = messages
        .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory: historyForAPI,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Lỗi không xác định");
        }

        const data: ChatResponse = await res.json();
        const botMessage: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date(data.timestamp),
        };
        setMessages((prev) => [...prev, botMessage]);

        if (!isOpen) setHasNewMessage(true);
      } catch (error) {
        const errMessage: Message = {
          role: "assistant",
          content:
            error instanceof Error
              ? `⚠️ ${error.message}`
              : "⚠️ Có lỗi xảy ra. Vui lòng thử lại sau.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* ===== STYLES ===== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

        .chatbot-root * {
          box-sizing: border-box;
          font-family: 'Be Vietnam Pro', sans-serif;
        }

        /* Toggle Button */
        .chatbot-toggle {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          z-index: 9999;
        }
        .chatbot-toggle:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(99, 102, 241, 0.65);
        }
        .chatbot-toggle:active { transform: scale(0.96); }

        .chatbot-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: pulse-badge 1.5s infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        /* Chat Window */
        .chatbot-window {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 380px;
          height: 560px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          transform-origin: bottom right;
          animation: chatSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 480px) {
          .chatbot-window {
            width: calc(100vw - 16px);
            height: calc(100dvh - 100px);
            right: 8px;
            bottom: 84px;
            border-radius: 16px;
          }
        }

        /* Header */
        .chatbot-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .chatbot-header-info { flex: 1; }
        .chatbot-header-name {
          color: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          margin: 0;
        }
        .chatbot-header-status {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }
        .chatbot-status-dot {
          width: 7px; height: 7px;
          background: #4ade80;
          border-radius: 50%;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .chatbot-status-text {
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          font-weight: 500;
        }
        .chatbot-close {
          background: rgba(255,255,255,0.15);
          border: none;
          border-radius: 8px;
          width: 32px; height: 32px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          color: white;
          flex-shrink: 0;
        }
        .chatbot-close:hover { background: rgba(255,255,255,0.28); }

        /* Messages Area */
        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f8f9ff;
          scroll-behavior: smooth;
        }
        .chatbot-messages::-webkit-scrollbar { width: 4px; }
        .chatbot-messages::-webkit-scrollbar-track { background: transparent; }
        .chatbot-messages::-webkit-scrollbar-thumb { background: #d1d5f0; border-radius: 2px; }

        /* Message Bubbles */
        .chatbot-msg-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .chatbot-msg-row.user { flex-direction: row-reverse; }

        .chatbot-avatar {
          width: 32px; height: 32px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
        }

        .chatbot-bubble-wrap { max-width: 75%; display: flex; flex-direction: column; gap: 3px; }
        .chatbot-msg-row.user .chatbot-bubble-wrap { align-items: flex-end; }

        .chatbot-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
          animation: bubbleIn 0.2s ease;
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chatbot-bubble.assistant {
          background: white;
          color: #1e1e2e;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .chatbot-bubble.user {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-radius: 16px 4px 16px 16px;
        }
        .chatbot-time {
          font-size: 10.5px;
          color: #9ca3af;
          font-weight: 500;
          padding: 0 4px;
        }

        /* Typing indicator */
        .chatbot-typing {
          display: flex; gap: 5px; align-items: center;
          padding: 12px 14px;
          background: white;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          width: fit-content;
        }
        .chatbot-typing span {
          width: 7px; height: 7px;
          background: #6366f1;
          border-radius: 50%;
          animation: typing 1.2s infinite;
          opacity: 0.5;
        }
        .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* Quick Questions */
        .chatbot-quick {
          padding: 10px 16px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          background: #f8f9ff;
          border-top: 1px solid #ede9fe;
          flex-shrink: 0;
        }
        .chatbot-quick-btn {
          background: white;
          border: 1.5px solid #ede9fe;
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11.5px;
          font-weight: 600;
          color: #6366f1;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Be Vietnam Pro', sans-serif;
          white-space: nowrap;
        }
        .chatbot-quick-btn:hover {
          background: #ede9fe;
          border-color: #6366f1;
        }

        /* Input Area */
        .chatbot-input-area {
          padding: 12px 14px;
          background: white;
          border-top: 1px solid #f0f0f5;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .chatbot-textarea {
          flex: 1;
          border: 1.5px solid #e5e7f0;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13.5px;
          font-family: 'Be Vietnam Pro', sans-serif;
          resize: none;
          outline: none;
          min-height: 42px;
          max-height: 120px;
          line-height: 1.5;
          color: #1e1e2e;
          background: #fafafe;
          transition: border-color 0.15s;
          overflow-y: auto;
        }
        .chatbot-textarea:focus {
          border-color: #6366f1;
          background: white;
        }
        .chatbot-textarea::placeholder { color: #b0b0c0; }

        .chatbot-send {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, opacity 0.15s;
          box-shadow: 0 2px 8px rgba(99,102,241,0.35);
        }
        .chatbot-send:hover:not(:disabled) { transform: scale(1.05); }
        .chatbot-send:active:not(:disabled) { transform: scale(0.95); }
        .chatbot-send:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* ===== TOGGLE BUTTON ===== */}
      <div className="chatbot-root">
        <button
          className="chatbot-toggle"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Mở chat hỗ trợ"
        >
          {hasNewMessage && <span className="chatbot-badge" />}
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" fill="white" />
            </svg>
          )}
        </button>

        {/* ===== CHAT WINDOW ===== */}
        {isOpen && (
          <div className="chatbot-window" ref={chatWindowRef}>
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-avatar">{BOT_AVATAR}</div>
              <div className="chatbot-header-info">
                <p className="chatbot-header-name">Trợ lý AI Shop</p>
                <div className="chatbot-header-status">
                  <span className="chatbot-status-dot" />
                  <span className="chatbot-status-text">Đang hoạt động</span>
                </div>
              </div>
              <button
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chatbot-msg-row ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="chatbot-avatar">{BOT_AVATAR}</div>
                  )}
                  <div className="chatbot-bubble-wrap">
                    <div className={`chatbot-bubble ${msg.role}`}>
                      {msg.content}
                    </div>
                    <span className="chatbot-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="chatbot-msg-row assistant">
                  <div className="chatbot-avatar">{BOT_AVATAR}</div>
                  <div className="chatbot-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            <div className="chatbot-quick">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="chatbot-quick-btn"
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="chatbot-input-area">
              <textarea
                ref={inputRef}
                className="chatbot-textarea"
                placeholder="Nhập tin nhắn... (Enter để gửi)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="chatbot-send"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                aria-label="Gửi tin nhắn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}