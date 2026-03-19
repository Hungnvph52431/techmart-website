import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RotateCcw, ChevronDown, CheckCircle2, XCircle, PackageCheck, Wallet, X } from 'lucide-react';
import { orderService } from '@/services/order.service';
import type { OrderReturnView, ReturnStatus } from '@/types/order';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Chờ duyệt',
  approved:  'Đã duyệt',
  rejected:  'Từ chối',
  received:  'Đã nhận hàng',
  refunded:  'Đã hoàn tiền',
  closed:    'Đã đóng',
};

const STATUS_STYLE: Record<ReturnStatus, string> = {
  requested: 'bg-amber-100 text-amber-800',
  approved:  'bg-blue-100 text-blue-800',
  rejected:  'bg-rose-100 text-rose-800',
  received:  'bg-purple-100 text-purple-800',
  refunded:  'bg-emerald-100 text-emerald-800',
  closed:    'bg-gray-100 text-gray-600',
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',      label: 'Tất cả' },
  { value: 'requested', label: 'Chờ duyệt' },
  { value: 'approved',  label: 'Đã duyệt' },
  { value: 'received',  label: 'Đã nhận hàng' },
  { value: 'refunded',  label: 'Đã hoàn tiền' },
  { value: 'rejected',  label: 'Từ chối' },
  { value: 'closed',    label: 'Đã đóng' },
];

// ─── Action Modal ──────────────────────────────────────────────────────────────
const ActionModal = ({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: (note: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(note.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ghi chú admin (không bắt buộc)..."
          rows={3}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 ${confirmClass}`}>
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export const AdminReturns = () => {
  const [returns, setReturns]     = useState<OrderReturnView[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [modal, setModal]         = useState<{
    type: 'approve' | 'reject' | 'receive' | 'refund';
    item: OrderReturnView;
  } | null>(null);

  const load = async (status?: string) => {
    try {
      setLoading(true);
      const data = await orderService.adminGetAllReturns(
        status && status !== 'all' ? { status } : undefined
      );
      setReturns(data);
    } catch {
      toast.error('Không thể tải danh sách hoàn trả');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const handleAction = async (note: string) => {
    if (!modal) return;
    const { type, item } = modal;
    try {
      if (type === 'approve')
        await orderService.adminReviewReturn(item.orderId, item.orderReturnId, 'approved', note || undefined);
      else if (type === 'reject')
        await orderService.adminReviewReturn(item.orderId, item.orderReturnId, 'rejected', note || undefined);
      else if (type === 'receive')
        await orderService.adminReceiveReturn(item.orderId, item.orderReturnId, note || undefined);
      else if (type === 'refund')
        await orderService.adminRefundReturn(item.orderId, item.orderReturnId, note || undefined);

      toast.success('Cập nhật thành công');
      setModal(null);
      void load(filter);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // Thống kê nhanh
  const stats = {
    requested: returns.filter(r => r.status === 'requested').length,
    approved:  returns.filter(r => r.status === 'approved').length,
    received:  returns.filter(r => r.status === 'received').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase italic flex items-center gap-2">
            <RotateCcw size={24} className="text-orange-500" /> Quản lý Hoàn/Trả hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">Xem xét và xử lý các yêu cầu hoàn trả của khách hàng</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Chờ duyệt', value: stats.requested, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Chờ nhận hàng', value: stats.approved, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Chờ hoàn tiền', value: stats.received, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-600 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tight transition-all ${
              filter === opt.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Đang tải...
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <RotateCcw size={40} className="mb-3 opacity-30" />
            <p className="font-semibold">Không có yêu cầu hoàn trả nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Mã yêu cầu', 'Đơn hàng', 'Lý do', 'Ngày gửi', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map(item => (
                <tr key={item.orderReturnId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-gray-800 text-xs">{item.requestCode}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link to={`/admin/orders/${item.orderId}`}
                      className="font-bold text-blue-600 hover:underline text-xs">
                      #{item.orderId}
                    </Link>
                  </td>
                  <td className="px-5 py-4 max-w-[220px]">
                    <p className="text-gray-700 truncate">{item.reason}</p>
                    {item.customerNote && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.customerNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(item.requestedAt)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.status === 'requested' && (
                        <>
                          <button onClick={() => setModal({ type: 'approve', item })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                            <CheckCircle2 size={13} /> Duyệt
                          </button>
                          <button onClick={() => setModal({ type: 'reject', item })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 transition-colors">
                            <XCircle size={13} /> Từ chối
                          </button>
                        </>
                      )}
                      {item.status === 'approved' && (
                        <button onClick={() => setModal({ type: 'receive', item })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors">
                          <PackageCheck size={13} /> Đã nhận hàng
                        </button>
                      )}
                      {item.status === 'received' && (
                        <button onClick={() => setModal({ type: 'refund', item })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
                          <Wallet size={13} /> Hoàn tiền
                        </button>
                      )}
                      {(item.status === 'refunded' || item.status === 'rejected') && (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Action Modal */}
      {modal && (
        <ActionModal
          title={
            modal.type === 'approve' ? 'Duyệt yêu cầu hoàn trả' :
            modal.type === 'reject'  ? 'Từ chối yêu cầu hoàn trả' :
            modal.type === 'receive' ? 'Xác nhận đã nhận lại hàng' :
                                       'Xác nhận hoàn tiền'
          }
          description={
            modal.type === 'approve' ? `Duyệt yêu cầu ${modal.item.requestCode}. Khách sẽ được thông báo gửi hàng về.` :
            modal.type === 'reject'  ? `Từ chối yêu cầu ${modal.item.requestCode}. Vui lòng ghi rõ lý do.` :
            modal.type === 'receive' ? `Xác nhận đã nhận lại hàng từ khách hàng cho ${modal.item.requestCode}.` :
                                       `Xác nhận đã hoàn tiền cho yêu cầu ${modal.item.requestCode}.`
          }
          confirmLabel={
            modal.type === 'approve' ? 'Duyệt' :
            modal.type === 'reject'  ? 'Từ chối' :
            modal.type === 'receive' ? 'Đã nhận hàng' :
                                       'Đã hoàn tiền'
          }
          confirmClass={
            modal.type === 'approve' ? 'bg-blue-600 hover:bg-blue-700' :
            modal.type === 'reject'  ? 'bg-rose-600 hover:bg-rose-700' :
            modal.type === 'receive' ? 'bg-purple-600 hover:bg-purple-700' :
                                       'bg-emerald-600 hover:bg-emerald-700'
          }
          onConfirm={handleAction}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};
