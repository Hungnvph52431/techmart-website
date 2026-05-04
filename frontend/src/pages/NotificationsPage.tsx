// frontend/src/pages/NotificationsPage.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, Check, Package, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { AppNotification, NotificationType } from '@/types/notification.type';

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
  order_created: <Package size={18} className="text-blue-600" />,
  order_status: <Package size={18} className="text-blue-600" />,
  order_cancelled: <AlertCircle size={18} className="text-red-500" />,
  return_created: <RefreshCw size={18} className="text-orange-500" />,
  return_approved: <Check size={18} className="text-green-600" />,
  return_rejected: <AlertCircle size={18} className="text-red-500" />,
  payment: <Check size={18} className="text-green-600" />,
  system: <Info size={18} className="text-slate-500" />,
};

const formatTime = (iso: string) => new Date(iso).toLocaleString('vi-VN');

interface Props {
  /** Layout mode — embedded inside an existing AccountLayout or AdminLayout (no extra container) */
  embedded?: boolean;
}

export const NotificationsPage = ({ embedded = false }: Props) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = async () => {
    setLoading(true);
    try { setItems(await notificationService.list(100)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await notificationService.markRead(n.notificationId);
        setItems(prev => prev.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x));
      } catch {}
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await notificationService.delete(id);
      setItems(prev => prev.filter(x => x.notificationId !== id));
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    } catch {}
  };

  const filtered = filter === 'unread' ? items.filter(x => !x.isRead) : items;
  const unreadCount = items.filter(x => !x.isRead).length;

  const content = (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} thông báo · {unreadCount} chưa đọc</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter(f => f === 'all' ? 'unread' : 'all')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {filter === 'all' ? 'Chỉ chưa đọc' : 'Tất cả'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center">
          <Bell size={42} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 font-medium">Không có thông báo nào</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map(n => {
            const inner = (
              <div className={`flex gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {ICON_MAP[n.type] || <Info size={18} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  {n.message && <p className="text-sm text-slate-500 mt-1">{n.message}</p>}
                  <p className="text-xs text-slate-400 mt-1.5">{formatTime(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, n.notificationId)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex-shrink-0 self-start"
                  title="Xóa"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
            return (
              <li key={n.notificationId}>
                {n.link ? (
                  <Link to={n.link} onClick={() => handleClick(n)} className="block">{inner}</Link>
                ) : (
                  <div onClick={() => handleClick(n)} className="cursor-pointer">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4">{content}</div>
    </div>
  );
};

export default NotificationsPage;
