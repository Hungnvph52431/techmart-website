import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RotateCcw, ChevronDown, ChevronUp, CheckCircle2, XCircle, PackageCheck, Wallet, X, ImageIcon } from 'lucide-react';
import { orderService } from '@/services/order.service';
import type { OrderReturnView, ReturnStatus } from '@/types/order';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${BACKEND_URL}${url}`;
};

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
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
                {['Mã yêu cầu', 'Đơn hàng', 'Khách hàng', 'Lý do', 'Thanh toán', 'Ngày gửi', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map(item => {
                const ext = item as any;
                const isExpanded = expandedId === item.orderReturnId;
                const images = item.evidenceImages || [];

                // Flow steps cho trạng thái hoàn trả
                const FLOW_STEPS = [
                  { key: 'requested', label: 'Yêu cầu', date: item.requestedAt, icon: <RotateCcw size={12} /> },
                  { key: 'approved',  label: 'Duyệt',   date: item.approvedAt,  icon: <CheckCircle2 size={12} /> },
                  { key: 'received',  label: 'Nhận hàng', date: item.receivedAt, icon: <PackageCheck size={12} /> },
                  { key: 'refunded',  label: 'Hoàn tiền', date: item.refundedAt, icon: <Wallet size={12} /> },
                ];
                const statusOrder = ['requested', 'approved', 'received', 'refunded', 'closed'];
                const currentIdx = statusOrder.indexOf(item.status);

                return (
                <React.Fragment key={item.orderReturnId}>
                <tr className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : item.orderReturnId)}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-gray-400" />}
                      <span className="font-mono font-bold text-gray-800 text-xs">{item.requestCode}</span>
                    </div>
                    {images.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-bold mt-0.5">
                        <ImageIcon size={10} /> {images.length} ảnh
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Link to={`/admin/orders/${item.orderId}`} onClick={e => e.stopPropagation()}
                      className="font-bold text-blue-600 hover:underline text-xs">
                      {ext.orderCode || `#${item.orderId}`}
                    </Link>
                    {ext.orderTotal > 0 && (
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {Number(ext.orderTotal).toLocaleString('vi-VN')}₫
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs font-bold text-gray-800">{ext.customerName || '—'}</p>
                    {ext.customerPhone && (
                      <p className="text-[10px] text-gray-400">{ext.customerPhone}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-[180px]">
                    <p className="text-gray-700 truncate text-xs">{item.reason}</p>
                    {item.customerNote && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.customerNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ext.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      ext.paymentStatus === 'refunded' ? 'bg-violet-100 text-violet-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ext.paymentStatus === 'paid' ? 'Đã TT' : ext.paymentStatus === 'refunded' ? 'Đã hoàn' : ext.paymentStatus || '—'}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{ext.paymentMethod?.toUpperCase() || ''}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs">{formatDate(item.requestedAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
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
                      {(item.status === 'refunded' || item.status === 'rejected' || item.status === 'closed') && (
                        <span className="text-xs text-gray-400 italic">Hoàn tất</span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Detail Row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="px-4 py-0">
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
                        {/* Trạng thái hoàn trả vật lý - Flow Steps */}
                        {item.status !== 'rejected' && (
                        <div>
                          <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3">Tiến trình hoàn trả</p>
                          <div className="flex items-center gap-1">
                            {FLOW_STEPS.map((step, idx) => {
                              const stepIdx = statusOrder.indexOf(step.key);
                              const isCompleted = stepIdx <= currentIdx;
                              const isCurrent = step.key === item.status;
                              return (
                                <React.Fragment key={step.key}>
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    isCurrent ? 'bg-blue-600 text-white' :
                                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-gray-100 text-gray-400'
                                  }`}>
                                    {step.icon}
                                    <span>{step.label}</span>
                                    {step.date && <span className="text-[10px] opacity-70 ml-1">{formatDate(step.date)}</span>}
                                  </div>
                                  {idx < FLOW_STEPS.length - 1 && (
                                    <div className={`w-6 h-0.5 ${stepIdx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                        )}
                        {item.status === 'rejected' && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-rose-700">Yêu cầu bị từ chối</p>
                            {item.adminNote && <p className="text-xs text-rose-600 mt-1">Lý do: {item.adminNote}</p>}
                          </div>
                        )}

                        {/* Bằng chứng hình ảnh */}
                        <div>
                          <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-2">
                            <ImageIcon size={12} className="inline mr-1" />
                            Bằng chứng từ khách hàng ({images.length} file)
                          </p>
                          {images.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                              {images.map((img, idx) => {
                                const url = getImageUrl(img);
                                const isVideo = img.match(/\.(mp4|mov|avi|webm)$/i);
                                return (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                    className="block w-28 h-28 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-colors shadow-sm">
                                    {isVideo ? (
                                      <video src={url} className="w-full h-full object-cover" muted />
                                    ) : (
                                      <img src={url} alt={`Bằng chứng ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} />
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Không có ảnh bằng chứng</p>
                          )}
                        </div>

                        {/* Lý do + ghi chú */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Lý do hoàn trả</p>
                            <p className="text-sm text-gray-800">{item.reason}</p>
                          </div>
                          {item.customerNote && (
                            <div>
                              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Ghi chú khách hàng</p>
                              <p className="text-sm text-gray-700">{item.customerNote}</p>
                            </div>
                          )}
                          {item.adminNote && (
                            <div>
                              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Ghi chú admin</p>
                              <p className="text-sm text-gray-700">{item.adminNote}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
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
