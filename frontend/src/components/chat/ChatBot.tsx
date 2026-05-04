import { useState, useRef, useEffect, useCallback } from "react";
import SupportChatPanel from "./SupportChatPanel";

type ChatTab = "ai" | "staff";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolStatus?: string; // hiển thị khi AI đang gọi tool (vd "Đang tìm sản phẩm...")
}

const API_URL = import.meta.env.VITE_API_URL;

// Map tool name → mô tả thân thiện cho user
const TOOL_LABELS: Record<string, string> = {
  search_products: "Đang tìm sản phẩm phù hợp",
  get_product_detail: "Đang xem chi tiết sản phẩm",
  lookup_order: "Đang tra đơn hàng",
  get_active_coupons: "Đang tìm mã giảm giá",
  get_categories: "Đang kiểm tra danh mục",
};

function describeTools(names: string[]): string {
  const labels = names.map((n) => TOOL_LABELS[n] || "Đang xử lý");
  const unique = Array.from(new Set(labels));
  return unique.join(" · ") + "...";
}

const QUICK_QUESTIONS = [
  "Kiểm tra đơn hàng",
  "Chính sách đổi trả",
  "Phương thức thanh toán",
  "Khuyến mãi hiện có",
];

// Robot avatar
const BOT_AVATAR = (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
    <rect width="36" height="36" rx="10" fill="url(#botGrad)" />
    <rect x="9" y="14" width="18" height="11" rx="3" fill="white" fillOpacity="0.92"/>
    <circle cx="14" cy="19" r="2.5" fill="url(#botGrad)"/>
    <circle cx="22" cy="19" r="2.5" fill="url(#botGrad)"/>
    <circle cx="14.8" cy="18.2" r="0.8" fill="white"/>
    <circle cx="22.8" cy="18.2" r="0.8" fill="white"/>
    <rect x="17" y="9" width="2" height="5" rx="1" fill="white" fillOpacity="0.8"/>
    <circle cx="18" cy="8.5" r="1.5" fill="white" fillOpacity="0.95"/>
    <rect x="13" y="22" width="10" height="1.5" rx="0.75" fill="url(#botGrad)" fillOpacity="0.6"/>
    <defs>
      <linearGradient id="botGrad" x1="0" y1="0" x2="36" y2="36">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
  </svg>
);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>("ai");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Xin chào! 👋 Tôi là trợ lý AI của TechMart. Mình có thể giúp bạn chọn điện thoại, laptop, tra đơn hàng hay thắc mắc về chính sách. Bạn đang cần gì nhỉ?",
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

  const appendAssistantDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (!last || last.role !== "assistant") return prev;
      copy[copy.length - 1] = {
        ...last,
        content: last.content + delta,
        toolStatus: undefined,
      };
      return copy;
    });
  }, []);

  const setAssistantToolStatus = useCallback((status: string | undefined) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (!last || last.role !== "assistant") return prev;
      copy[copy.length - 1] = { ...last, toolStatus: status };
      return copy;
    });
  }, []);

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

      // Thêm user message + bubble assistant rỗng (sẽ fill dần)
      const placeholderAssistant: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch(`${API_URL}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory: historyForAPI,
          }),
        });

        if (!res.ok || !res.body) {
          let errMsg = "Lỗi không xác định";
          try {
            const err = await res.json();
            errMsg = err.error || errMsg;
          } catch { /* not JSON */ }
          throw new Error(errMsg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let gotAnyContent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";

          for (const frame of frames) {
            if (!frame.startsWith("data: ")) continue;
            const payload = frame.slice(6).trim();
            if (!payload) continue;

            try {
              const event = JSON.parse(payload);
              if (event.type === "content") {
                gotAnyContent = true;
                appendAssistantDelta(event.delta);
              } else if (event.type === "tool_start") {
                setAssistantToolStatus(describeTools(event.names || []));
              } else if (event.type === "error") {
                appendAssistantDelta(`⚠️ ${event.message}`);
              }
              // "done" không cần handle đặc biệt
            } catch {
              // ignore bad JSON
            }
          }
        }

        if (!gotAnyContent) {
          appendAssistantDelta("Mình chưa nhận được phản hồi. Bạn thử lại nhé 😊");
        }

        if (!isOpen) setHasNewMessage(true);
      } catch (error) {
        const msg =
          error instanceof Error
            ? `⚠️ ${error.message}`
            : "⚠️ Có lỗi xảy ra. Vui lòng thử lại sau.";
        appendAssistantDelta(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isOpen, appendAssistantDelta, setAssistantToolStatus]
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
        .chatbot-root * {
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }

        /* ── Toggle Wrapper + Pulse Ring ── */
        .chatbot-toggle-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
        }
        .chatbot-toggle-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          opacity: 0.22;
          animation: pulseRing 2.5s ease-out infinite;
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.22; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .chatbot-toggle {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 24px rgba(37,99,235,0.55), 0 2px 8px rgba(124,58,237,0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          z-index: 1;
        }
        .chatbot-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 32px rgba(37,99,235,0.7), 0 3px 12px rgba(124,58,237,0.5);
        }
        .chatbot-toggle:active { transform: scale(0.95); }

        .chatbot-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: pulse-badge 1.5s infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }

        /* ── Chat Window ── */
        .chatbot-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 390px;
          height: 580px;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(37,99,235,0.1), 0 4px 20px rgba(124,58,237,0.07);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          transform-origin: bottom right;
          animation: chatSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: scale(0.82) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 480px) {
          .chatbot-window {
            width: calc(100vw - 16px);
            height: calc(100dvh - 104px);
            right: 8px;
            bottom: 88px;
            border-radius: 20px;
          }
        }

        /* ── Header ── */
        .chatbot-header {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #7c3aed 100%);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 11px;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .chatbot-header::before {
          content: '';
          position: absolute;
          top: 0; left: -70%;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent);
          animation: headerShimmer 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes headerShimmer {
          0%   { left: -70%; }
          100% { left: 130%; }
        }
        .chatbot-header-info { flex: 1; min-width: 0; }
        .chatbot-header-name {
          color: white;
          font-size: 14.5px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .chatbot-header-status {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }
        .chatbot-status-dot {
          width: 6px; height: 6px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(74,222,128,0.8);
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .chatbot-status-text {
          color: rgba(255,255,255,0.82);
          font-size: 11.5px;
          font-weight: 500;
        }
        .chatbot-close {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          width: 30px; height: 30px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, transform 0.2s;
          color: white;
          flex-shrink: 0;
        }
        .chatbot-close:hover { background: rgba(255,255,255,0.24); transform: rotate(90deg); }

        /* ── Messages Area ── */
        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f0f4fb;
          scroll-behavior: smooth;
        }
        .chatbot-messages::-webkit-scrollbar { width: 3px; }
        .chatbot-messages::-webkit-scrollbar-track { background: transparent; }
        .chatbot-messages::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 2px; }

        /* ── Bubbles ── */
        .chatbot-msg-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .chatbot-msg-row.user { flex-direction: row-reverse; }

        .chatbot-avatar {
          width: 30px; height: 30px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }

        .chatbot-bubble-wrap { max-width: 76%; display: flex; flex-direction: column; gap: 3px; }
        .chatbot-msg-row.user .chatbot-bubble-wrap { align-items: flex-end; }

        .chatbot-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.6;
          word-break: break-word;
          animation: bubbleIn 0.22s ease;
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chatbot-bubble.assistant {
          background: white;
          color: #1e1e2e;
          border-radius: 4px 18px 18px 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          border: 1px solid rgba(37,99,235,0.07);
        }
        .chatbot-bubble.user {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #7c3aed 100%);
          color: white;
          border-radius: 18px 4px 18px 18px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.4);
        }
        .chatbot-time {
          font-size: 10px;
          color: #9ca3af;
          font-weight: 500;
          padding: 0 4px;
        }

        /* ── Typing indicator ── */
        .chatbot-typing {
          display: flex; gap: 5px; align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 4px 18px 18px 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          width: fit-content;
        }
        .chatbot-typing span {
          width: 7px; height: 7px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border-radius: 50%;
          animation: typing 1.2s infinite;
          opacity: 0.6;
        }
        .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .chatbot-tool-status {
          margin-left: 6px;
          font-size: 11.5px;
          color: #2563eb;
          font-weight: 600;
          animation: toolStatusIn 0.2s ease;
        }
        @keyframes toolStatusIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ── Streaming caret ── */
        .chatbot-caret {
          display: inline-block;
          width: 2px;
          height: 13px;
          background: #7c3aed;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: caretBlink 1s infinite;
        }
        @keyframes caretBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* ── Quick Questions ── */
        .chatbot-quick {
          padding: 10px 14px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          background: #f0f4fb;
          border-top: 1px solid rgba(37,99,235,0.1);
          flex-shrink: 0;
        }
        .chatbot-quick-btn {
          background: white;
          border: 1.5px solid rgba(37,99,235,0.2);
          border-radius: 20px;
          padding: 5px 13px;
          font-size: 11.5px;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(37,99,235,0.07);
        }
        .chatbot-quick-btn:hover {
          background: linear-gradient(135deg, #eff6ff, #f5f3ff);
          border-color: #7c3aed;
          color: #7c3aed;
          box-shadow: 0 2px 8px rgba(124,58,237,0.15);
          transform: translateY(-1px);
        }
        .chatbot-quick-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* ── Input Area ── */
        .chatbot-input-area {
          padding: 10px 12px;
          background: white;
          border-top: 1px solid #eef0f8;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .chatbot-textarea {
          flex: 1;
          border: 1.5px solid #e2e8f5;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 13.5px;
          font-family: 'Inter', sans-serif;
          resize: none;
          outline: none;
          min-height: 42px;
          max-height: 110px;
          line-height: 1.5;
          color: #1e1e2e;
          background: #f8faff;
          transition: border-color 0.15s, box-shadow 0.15s;
          overflow-y: auto;
        }
        .chatbot-textarea:focus {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .chatbot-textarea::placeholder { color: #b0b8cc; }

        .chatbot-send {
          width: 42px; height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 3px 10px rgba(37,99,235,0.4);
        }
        .chatbot-send:hover:not(:disabled) { transform: scale(1.07) translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.5); }
        .chatbot-send:active:not(:disabled) { transform: scale(0.94); }
        .chatbot-send:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        /* ── Tabs ── */
        .chatbot-tabs {
          display: flex;
          background: white;
          border-bottom: 1px solid #e8ecf8;
          padding: 6px 8px;
          gap: 4px;
          flex-shrink: 0;
        }
        .chatbot-tab {
          flex: 1;
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12.5px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .chatbot-tab:hover { background: #f0f4ff; color: #374151; }
        .chatbot-tab.active {
          background: linear-gradient(135deg, #eff6ff, #f5f3ff);
          color: #2563eb;
          box-shadow: 0 1px 6px rgba(37,99,235,0.15);
        }

        /* ── Support Panel ── */
        .support-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f0f4fb;
          overflow: hidden;
        }
        .support-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }
        .support-spinner {
          width: 28px; height: 28px;
          border: 3px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .support-empty-icon {
          width: 58px; height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 26px;
          font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(16,185,129,0.3);
        }
        .support-empty-title {
          margin: 0;
          font-size: 14.5px;
          font-weight: 700;
          color: #1e1e2e;
        }
        .support-empty-sub {
          margin: 0;
          font-size: 12.5px;
          color: #6b7280;
        }
        .support-primary-btn {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 22px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 3px 12px rgba(37,99,235,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
          margin-top: 4px;
        }
        .support-primary-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(37,99,235,0.4); }
        .support-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Guest fields */
        .support-guest-fields {
          display: flex;
          gap: 6px;
          padding: 8px 12px;
          background: #fffbeb;
          border-top: 1px solid #fde68a;
        }
        .support-guest-field {
          flex: 1;
          border: 1.5px solid #fcd34d;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12.5px;
          font-family: 'Inter', sans-serif;
          outline: none;
          background: white;
          transition: border-color 0.15s;
          min-width: 0;
        }
        .support-guest-field:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
        .support-guest-field::placeholder { color: #b0b8cc; }

        /* Staff avatar */
        .support-staff-avatar {
          width: 30px; height: 30px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          font-size: 14px;
          font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          align-self: flex-end;
          letter-spacing: -0.5px;
          box-shadow: 0 2px 8px rgba(37,99,235,0.28);
        }

        /* Bubble wrap */
        .support-bubble-wrap {
          max-width: 78%;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .support-msg-row.mine .support-bubble-wrap {
          align-items: flex-end;
        }
        .support-msg-time {
          font-size: 10px;
          color: #9ca3af;
          padding: 0 4px;
        }

        /* Quick replies */
        .support-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 4px 0 4px 38px;
        }
        .support-quick-chip {
          background: white;
          border: 1.5px solid rgba(37,99,235,0.2);
          border-radius: 16px;
          padding: 6px 13px;
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(37,99,235,0.07);
        }
        .support-quick-chip:hover:not(:disabled) {
          background: linear-gradient(135deg, #eff6ff, #f5f3ff);
          border-color: #7c3aed;
          color: #7c3aed;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(124,58,237,0.15);
        }
        .support-quick-chip:disabled { opacity: 0.5; cursor: not-allowed; }

        .support-error-inline {
          margin: 6px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          color: #b91c1c;
        }

        .support-status-banner {
          background: linear-gradient(90deg, #eff6ff, #f0fdf4);
          border-bottom: 1px solid #dbeafe;
          padding: 7px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #1e40af;
          font-weight: 600;
          flex-shrink: 0;
        }
        .support-status-dot {
          width: 6px; height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(16,185,129,0.8);
          animation: blink 2s infinite;
        }

        .support-messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .support-messages::-webkit-scrollbar { width: 3px; }
        .support-messages::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 2px; }
        .support-msg-row {
          display: flex;
          gap: 6px;
          align-items: flex-end;
        }
        .support-msg-row.mine { justify-content: flex-end; }
        .support-msg-row.other { justify-content: flex-start; }
        .support-bubble {
          max-width: 78%;
          padding: 9px 13px;
          border-radius: 14px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
          animation: bubbleIn 0.22s ease;
        }
        .support-bubble.mine {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #7c3aed 100%);
          color: white;
          border-radius: 16px 4px 16px 16px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.35);
        }
        .support-bubble.other {
          background: white;
          color: #1e1e2e;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid rgba(37,99,235,0.07);
        }
        .support-system-msg {
          align-self: center;
          background: rgba(37,99,235,0.06);
          color: #4b5563;
          font-size: 11.5px;
          padding: 5px 14px;
          border-radius: 12px;
          font-style: italic;
        }

        .support-input-area {
          padding: 10px 12px;
          background: white;
          border-top: 1px solid #eef0f8;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .support-textarea {
          flex: 1;
          border: 1.5px solid #e2e8f5;
          border-radius: 14px;
          padding: 9px 14px;
          font-size: 13.5px;
          font-family: 'Inter', sans-serif;
          resize: none;
          outline: none;
          min-height: 40px;
          max-height: 100px;
          line-height: 1.5;
          background: #f8faff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .support-textarea:focus { border-color: #2563eb; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .support-textarea::placeholder { color: #b0b8cc; }
        .support-send-btn {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(37,99,235,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .support-send-btn:hover:not(:disabled) { transform: scale(1.07) translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,0.45); }
        .support-send-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
      `}</style>

      {/* ===== TOGGLE BUTTON ===== */}
      <div className="chatbot-root">
        <div className="chatbot-toggle-wrapper">
          <div className="chatbot-toggle-ring" />
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
        </div>

        {/* ===== CHAT WINDOW ===== */}
        {isOpen && (
          <div className="chatbot-window" ref={chatWindowRef}>
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-avatar">{BOT_AVATAR}</div>
              <div className="chatbot-header-info">
                <p className="chatbot-header-name">
                  {tab === "ai" ? "TechMart AI" : "Hỗ trợ viên TechMart"}
                </p>
                <div className="chatbot-header-status">
                  <span className="chatbot-status-dot" />
                  <span className="chatbot-status-text">
                    {tab === "ai" ? "Trả lời tức thì" : "Chat trực tiếp với nhân viên"}
                  </span>
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

            {/* Tab Bar */}
            <div className="chatbot-tabs">
              <button
                className={`chatbot-tab ${tab === "ai" ? "active" : ""}`}
                onClick={() => setTab("ai")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="8" width="18" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="13" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="13" r="1.5" fill="currentColor"/>
                  <path d="M10 5h4M12 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Trợ lý AI
              </button>
              <button
                className={`chatbot-tab ${tab === "staff" ? "active" : ""}`}
                onClick={() => setTab("staff")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                Nhân viên
              </button>
            </div>

            {tab === "staff" ? (
              <SupportChatPanel active={isOpen && tab === "staff"} />
            ) : (
              <>
            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg, i) => {
                const isEmptyAssistant =
                  msg.role === "assistant" && msg.content.length === 0;
                return (
                  <div key={i} className={`chatbot-msg-row ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="chatbot-avatar">{BOT_AVATAR}</div>
                    )}
                    <div className="chatbot-bubble-wrap">
                      {isEmptyAssistant ? (
                        <div className="chatbot-typing">
                          <span /><span /><span />
                          {msg.toolStatus && (
                            <span className="chatbot-tool-status">{msg.toolStatus}</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className={`chatbot-bubble ${msg.role}`}>
                            {msg.content}
                            {msg.role === "assistant" && isLoading && i === messages.length - 1 && (
                              <span className="chatbot-caret" />
                            )}
                          </div>
                          <span className="chatbot-time">{formatTime(msg.timestamp)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

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
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
