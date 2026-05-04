// frontend/src/components/notifications/NotificationBell.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, Package, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { AppNotification, NotificationType } from '@/types/notification.type';
import { useAuthStore } from '@/store/authStore';

const POLL_MS = 30_000;

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
  order_created: <Package size={16} className="text-blue-600" />,
  order_status: <Package size={16} className="text-blue-600" />,
  order_cancelled: <AlertCircle size={16} className="text-red-500" />,
  return_created: <RefreshCw size={16} className="text-orange-500" />,
  return_approved: <Check size={16} className="text-green-600" />,
  return_rejected: <AlertCircle size={16} className="text-red-500" />,
  payment: <Check size={16} className="text-green-600" />,
  system: <Info size={16} className="text-slate-500" />,
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd} ngày trước`;
  return d.toLocaleDateString('vi-VN');
};

interface Props {
  /** Chế độ hiển thị: light (header user) | dark (admin) */
  variant?: 'light' | 'dark';
  /** Đường dẫn trang xem tất cả thông báo */
  viewAllHref?: string;
}

export const NotificationBell = ({ variant = 'light', viewAllHref = '/notifications' }: Props) => {
  const { isAuthenticated } = useAuthStore();
  const authed = isAuthenticated();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchCount = useCallback(async () => {
    if (!authed) return;
    try { setUnread(await notificationService.unreadCount()); } catch {}
  }, [authed]);

  const fetchList = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try { setItems(await notificationService.list(15)); } catch {} finally { setLoading(false); }
  }, [authed]);

  // Poll unread count every 30s
  useEffect(() => {
    if (!authed) { setUnread(0); return; }
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(t);
  }, [authed, fetchCount]);

  // Open dropdown → load list
  useEffect(() => { if (open) fetchList(); }, [open, fetchList]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleItemClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await notificationService.markRead(n.notificationId);
        setItems(prev => prev.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x));
        setUnread(c => Math.max(0, c - 1));
      } catch {}
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, id: number, wasUnread: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationService.delete(id);
      setItems(prev => prev.filter(x => x.notificationId !== id));
      if (wasUnread) setUnread(c => Math.max(0, c - 1));
    } catch {}
  };

  if (!authed) return null;

  const isDark = variant === 'dark';
  const btnClass = isDark
    ? 'relative p-2 rounded-xl hover:bg-slate-700 transition-colors text-slate-200'
    : 'relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={btnClass}
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Thông báo</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <Bell className="mx-auto mb-2 text-slate-200" size={36} />
                <p className="text-sm text-slate-400">Chưa có thông báo nào</p>
              </div>
            ) : (
              items.map(n => {
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {ICON_MAP[n.type] || <Info size={16} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                      <button
                        onClick={(e) => handleDelete(e, n.notificationId, !n.isRead)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link
                    key={n.notificationId}
                    to={n.link}
                    onClick={() => handleItemClick(n)}
                    className="block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.notificationId} onClick={() => handleItemClick(n)} className="cursor-pointer">
                    {inner}
                  </div>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <Link
              to={viewAllHref}
              onClick={() => setOpen(false)}
              className="block py-3 text-center text-sm font-semibold text-blue-600 border-t border-slate-100 hover:bg-slate-50 transition-colors"
            >
              Xem tất cả thông báo
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
