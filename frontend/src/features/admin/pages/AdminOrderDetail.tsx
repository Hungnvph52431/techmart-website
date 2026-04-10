import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  Package,
  Clock,
  CreditCard,
  RotateCcw,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { adminOrderService } from '@/services/admin/order.service';

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Admin KHÔNG được chuyển sang completed — chỉ khách hàng xác nhận nhận hàng mới được
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],       // ❌ Admin không được chuyển → completed (khách tự xác nhận)
  completed: [],
  cancelled: [],
  returned: [],
};

// Chuỗi auto-process: admin chỉ đi tối đa đến delivered
const AUTO_PROCESS_CHAIN: Record<string, string[]> = {
  pending: ['confirmed', 'shipping', 'delivered'],
  confirmed: ['shipping', 'delivered'],
  shipping: ['delivered'],
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn/trả',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-sky-100 text-sky-800 border-sky-200',
  shipping: 'bg-violet-100 text-violet-800 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-lime-100 text-lime-800 border-lime-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  returned: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'failed'],
  paid: [],
  failed: ['pending'],
  refunded: [],
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Ship COD',
  online: 'Chuyển khoản / QR',
  vnpay: 'VNPay',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  wallet: 'Ví TechMart',
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  received: 'Đã nhận hàng',
  refunded: 'Đã hoàn tiền',
  closed: 'Đã đóng',
};

const RETURN_STATUS_STYLES: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  rejected: 'bg-rose-100 text-rose-800',
  received: 'bg-violet-100 text-violet-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-600',
};

const EVENT_LABELS: Record<string, string> = {
  order_created: 'Đơn hàng được tạo',
  status_changed: 'Thay đổi trạng thái đơn hàng',
  payment_status_changed: 'Thay đổi trạng thái thanh toán',
  payment_received: 'Nhận thanh toán',
  payment_refunded: 'Hoàn tiền',
  order_cancelled: 'Đơn hàng bị hủy',
  return_requested: 'Yêu cầu hoàn/trả hàng',
  return_approved: 'Yêu cầu hoàn/trả được duyệt',
  return_rejected: 'Yêu cầu hoàn/trả bị từ chối',
  return_received: 'Đã nhận hàng hoàn trả',
  return_refunded: 'Hoàn tiền thành công',
  return_closed: 'Đóng yêu cầu hoàn trả',
};

const ACTOR_ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  warehouse: 'Kho vận',
  system: 'Hệ thống',
};

const getTimelineEventLabel = (event: any) =>
  event.eventLabel || EVENT_LABELS[event.eventType] || event.eventType;

const getTimelineStatusLabel = (event: any, value?: string) => {
  if (!value) return '';

  if (event.eventType === 'payment_status_changed') {
    return PAYMENT_STATUS_LABELS[value] || value;
  }

  if (String(event.eventType || '').startsWith('return_')) {
    return RETURN_STATUS_LABELS[value] || value;
  }

  return STATUS_LABELS[value] || PAYMENT_STATUS_LABELS[value] || RETURN_STATUS_LABELS[value] || value;
};

const getTimelineStatusBadgeClass = (event: any, value?: string) => {
  if (!value) return 'bg-gray-100 text-gray-700';

  if (event.eventType === 'payment_status_changed') {
    if (value === 'paid') return 'bg-emerald-100 text-emerald-800';
    if (value === 'failed') return 'bg-rose-100 text-rose-800';
    if (value === 'refunded') return 'bg-blue-100 text-blue-800';
    return 'bg-amber-100 text-amber-800';
  }

  return STATUS_STYLES[value] || RETURN_STATUS_STYLES[value] || 'bg-gray-100 text-gray-700';
};

const fmt = (n: number) => n?.toLocaleString('vi-VN') + '₫';
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    type: 'status' | 'payment' | 'auto';
    nextValue: string;
    label: string;
  }>({ show: false, type: 'status', nextValue: '', label: '' });

  const [cancelDialog, setCancelDialog] = useState<{
    show: boolean;
    reason: string;
    adminNote: string;
  }>({ show: false, reason: '', adminNote: '' });

  // Return modal state
  const [returnModal, setReturnModal] = useState<{
    type: 'review' | 'receive' | 'refund' | 'close' | null;
    returnId: number | null;
    adminNote: string;
  }>({ type: null, returnId: null, adminNote: '' });

  const loadDetail = async () => {
    try {
      setLoading(true);
      const [detailData, timelineData, returnsData] = await Promise.allSettled([
        adminOrderService.getById(orderId),
        adminOrderService.getTimeline(orderId),
        adminOrderService.getReturns(orderId),
      ]);

      const base = detailData.status === 'fulfilled' ? detailData.value : null;
      if (!base) {
        toast.error('Không tìm thấy đơn hàng');
        navigate('/admin/orders');
        return;
      }

      setDetail({
        ...base,
        timeline: timelineData.status === 'fulfilled' ? timelineData.value : [],
        returns: returnsData.status === 'fulfilled' ? returnsData.value : [],
      });
    } catch {
      toast.error('Lỗi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [orderId]);

  // ── Đổi trạng thái đơn ──────────────────────────────────────────────────────
  const handleUpdateStatus = async (nextStatus: string, note?: string) => {
    try {
      setSubmitting('status');
      await adminOrderService.updateStatus(orderId, nextStatus as any, note);
      toast.success(`Chuyển sang: ${STATUS_LABELS[nextStatus]}`);
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCancelOrder = async () => {
    const reason = cancelDialog.reason.trim();

    if (!reason) {
      toast.error('Vui lòng nhập lý do hủy đơn');
      return;
    }

    try {
      setSubmitting('cancel');
      await adminOrderService.cancel(orderId, {
        reason,
        adminNote: cancelDialog.adminNote.trim() || undefined,
      });
      toast.success('Đã hủy đơn và thông báo cho khách hàng');
      setCancelDialog({ show: false, reason: '', adminNote: '' });
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể hủy đơn hàng');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Auto process: chạy qua từng bước đến delivered ──────────────────────────
  const handleAutoProcess = async () => {
    const chain = AUTO_PROCESS_CHAIN[detail?.order?.status];
    if (!chain?.length) return;

    try {
      setSubmitting('auto');
      for (const step of chain) {
        await adminOrderService.updateStatus(orderId, step as any);
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success('Đã xử lý đơn hàng thành công!');
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Xử lý tự động thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Đổi trạng thái thanh toán ────────────────────────────────────────────────
  const handleUpdatePayment = async (nextStatus: string) => {
    try {
      setSubmitting('payment');
      await adminOrderService.updatePaymentStatus(orderId, nextStatus as any);
      toast.success(`Thanh toán: ${PAYMENT_STATUS_LABELS[nextStatus]}`);
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cập nhật thanh toán thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Xử lý hoàn trả ──────────────────────────────────────────────────────────
  const handleReturnAction = async () => {
    const { type, returnId, adminNote } = returnModal;
    if (!type || !returnId) return;

    try {
      setSubmitting('return');
      const payload = { adminNote: adminNote.trim() || undefined };

      if (type === 'review') {
        // Không dùng ở đây, dùng reviewReturn riêng
      } else if (type === 'receive') {
        await adminOrderService.receiveReturn(orderId, returnId, payload);
        toast.success('Đã xác nhận nhận hàng hoàn trả');
      } else if (type === 'refund') {
        await adminOrderService.refundReturn(orderId, returnId, payload);
        toast.success('Đã hoàn tiền thành công');
      } else if (type === 'close') {
        await adminOrderService.closeReturn(orderId, returnId, payload);
        toast.success('Đã đóng yêu cầu hoàn trả');
      }

      setReturnModal({ type: null, returnId: null, adminNote: '' });
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  const handleReviewReturn = async (returnId: number, decision: 'approved' | 'rejected', note?: string) => {
    try {
      setSubmitting(`review-${returnId}`);
      await adminOrderService.reviewReturn(orderId, returnId, { decision, adminNote: note });
      toast.success(decision === 'approved' ? 'Đã duyệt yêu cầu hoàn trả' : 'Đã từ chối yêu cầu hoàn trả');
      await loadDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Loading / Not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xl font-black text-blue-600 uppercase italic animate-pulse">
          Đang tải đơn hàng...
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const order = detail.order || detail;
  const items = detail.items || [];
  const timeline: any[] = detail.timeline || [];
  const returns: any[] = detail.returns || [];
  const returnedOrderDetailIds = new Set<number>(
    returns
      .filter((r: any) => r.status !== 'rejected')
      .flatMap((r: any) => (r.items || []).map((i: any) => i.orderDetailId)),
  );
  const refundedOrderDetailIds = new Set<number>(
    returns
      .filter((r: any) => r.status === 'refunded' || r.status === 'closed')
      .flatMap((r: any) => (r.items || []).map((i: any) => i.orderDetailId)),
  );
  const rejectedOrderDetailIds = new Set<number>(
    returns
      .filter((r: any) => r.status === 'rejected')
      .flatMap((r: any) => (r.items || []).map((i: any) => i.orderDetailId)),
  );

  const allowedStatuses = ORDER_STATUS_TRANSITIONS[order.status] || [];
  // Ẩn button cập nhật thanh toán khi đã hủy, hoặc khi đã hoàn trả + đã refunded
  const hasActiveReturn = returns.some((r: any) =>
  ['requested', 'approved', 'received'].includes(r.status)
);

const isCodUnpaid = order.paymentMethod === 'cod' && order.paymentStatus === 'pending';

const allowedPayments = (() => {
  if (order.status === 'cancelled') return [];
  if (order.status === 'returned' && order.paymentStatus === 'refunded') return [];
  // COD chưa thanh toán + đơn đã hoàn/trả → ẩn 2 nút (không có tiền để xử lý)
  if (order.status === 'returned' && isCodUnpaid) return [];
  if (hasActiveReturn) return [];
  return PAYMENT_STATUS_TRANSITIONS[order.paymentStatus] || [];
})();
  const ordererName = order.customer?.name || order.customerName || '—';
  const ordererEmail = order.customer?.email || order.customerEmail || '—';
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">
              #{order.orderCode}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${STATUS_STYLES[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            {returns.some((r: any) => r.status === 'requested') && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                Chờ duyệt hoàn trả
              </span>
            )}
            {returns.some((r: any) => r.status === 'approved') && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-sky-100 text-sky-700 border border-sky-200">
                Đã duyệt — chờ nhận hàng
              </span>
            )}
            {returns.some((r: any) => r.status === 'received') && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-violet-100 text-violet-700 border border-violet-200">
                Đã nhận — chờ hoàn tiền
              </span>
            )}
            {returns.some((r: any) => r.status === 'refunded') && !returns.some((r: any) => ['requested', 'approved', 'received'].includes(r.status)) && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                Đã hoàn tiền
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400 font-bold uppercase">
            Đặt lúc {fmtDate(order.orderDate || order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadDetail}
            disabled={!!submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={submitting ? 'animate-spin' : ''} />
            Làm mới
          </button>

        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        {/* CỘT TRÁI */}
        <div className="space-y-6">

          {/* SẢN PHẨM */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                <Package size={16} className="text-blue-500" /> Sản phẩm trong đơn
              </h2>
              <span className="text-sm font-black text-red-500">{fmt(order.total || order.totalAmount)}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.length > 0 ? items.map((item: any) => {
                const isItemReturned = returnedOrderDetailIds.has(item.orderDetailId);
                const isItemRefunded = refundedOrderDetailIds.has(item.orderDetailId);
                const isItemRejected = rejectedOrderDetailIds.has(item.orderDetailId);
                return (
                <div key={item.orderDetailId} className={`flex gap-4 px-6 py-4 ${isItemReturned ? 'opacity-50 bg-gray-50' : ''}`}>
                  <img
                    src={getImageUrl(item.productImage)}
                    alt={item.productName}
                    className="h-16 w-16 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 truncate">{item.productName}</p>
                      {isItemReturned && !isItemRefunded && (
                        <span className="inline-flex rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 flex-shrink-0">
                          Đang hoàn hàng
                        </span>
                      )}
                      {isItemRefunded && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 flex-shrink-0">
                          Đã hoàn hàng
                        </span>
                      )}
                      {isItemRejected && !isItemReturned && (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">
                          Từ chối hoàn hàng
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.variantName || item.sku || `SKU #${item.productId}`}</p>
                    <p className="text-xs text-gray-500 mt-1">SL: {item.quantity} × {fmt(item.price)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-gray-800">{fmt(item.subtotal)}</p>
                  </div>
                </div>
                );
              }) : (
                <div className="px-6 py-8 text-center text-sm text-gray-400">Không có dữ liệu sản phẩm</div>
              )}
            </div>
            {/* Tổng kết */}
            <div className="px-6 py-4 bg-gray-50 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Tạm tính</span><span>{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Phí vận chuyển</span><span>{fmt(order.shippingFee)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center gap-1.5">
                    Giảm giá
                    {order.couponCode && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                        {order.couponCode}
                      </span>
                    )}
                  </span>
                  <span>- {fmt(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-gray-800 text-base border-t border-gray-200 pt-2 mt-2">
                <span>Tổng cộng</span><span className="text-red-600">{fmt(order.total || order.totalAmount)}</span>
              </div>
            </div>
          </section>

          {/* TIMELINE */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-violet-500" /> Lịch sử xử lý
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có sự kiện nào</p>
              ) : timeline.map((event: any, i: number) => (
                <div key={event.orderEventId || i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">
                      {getTimelineEventLabel(event)}
                    </p>
                    {(event.fromStatus || event.toStatus) && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                        {event.fromStatus && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTimelineStatusBadgeClass(event, event.fromStatus)}`}>
                            {event.fromLabel || getTimelineStatusLabel(event, event.fromStatus)}
                          </span>
                        )}
                        {event.fromStatus && event.toStatus && <ChevronRight size={10} />}
                        {event.toStatus && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTimelineStatusBadgeClass(event, event.toStatus)}`}>
                            {event.toLabel || getTimelineStatusLabel(event, event.toStatus)}
                          </span>
                        )}
                      </p>
                    )}
                    {(event.actorDisplayName || event.actorName || event.actorRole) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(() => {
                          const actorName =
                            event.actorDisplayName ||
                            event.actorName ||
                            ACTOR_ROLE_LABELS[event.actorRole] ||
                            'Không xác định';
                          const actorRole =
                            event.actorDisplayRole ||
                            ACTOR_ROLE_LABELS[event.actorRole] ||
                            event.actorRole;

                          return (
                            <>
                        Người thao tác:{' '}
                        <span className="font-semibold text-gray-700">
                              {actorName}
                        </span>
                              {actorRole && actorRole !== actorName && (
                          <span className="text-gray-400">
                                  {' '}· {actorRole}
                          </span>
                              )}
                        {event.actorEmail && (
                          <span className="text-gray-400">
                            {' '}· {event.actorEmail}
                          </span>
                        )}
                            </>
                          );
                        })()}
                      </p>
                    )}
                    {(event.displayNote || event.note) && <p className="text-xs text-gray-500 mt-0.5 italic">"{event.displayNote || event.note}"</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{fmtDate(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* HOÀN TRẢ */}
          {returns.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                  <RotateCcw size={16} className="text-rose-500" /> Yêu cầu hoàn/trả hàng
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {returns.map((ret: any) => (
                  <div key={ret.orderReturnId} className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-800">{ret.requestCode}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Yêu cầu lúc {fmtDate(ret.requestedAt)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${RETURN_STATUS_STYLES[ret.status]}`}>
                        {RETURN_STATUS_LABELS[ret.status]}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">Lý do:</span> {ret.reason}
                    </p>

                    {ret.items?.length > 0 && (
                      <div className="space-y-2">
                        {ret.items.map((item: any) => (
                          <div key={item.orderReturnItemId} className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                            <span className="font-bold">{item.productName || `SP #${item.productId}`}</span>
                            {' '} — SL: {item.quantity}
                            {item.reason && ` | ${item.reason}`}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ảnh bằng chứng từ khách hàng */}
                    {ret.evidenceImages?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1.5">Ảnh bằng chứng ({ret.evidenceImages.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {ret.evidenceImages.map((img: string, idx: number) => (
                            <a key={idx} href={getImageUrl(img)} target="_blank" rel="noopener noreferrer"
                              className="block w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-100 hover:border-blue-400 transition-colors">
                              <img src={getImageUrl(img)} alt={`evidence-${idx}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ACTION BUTTONS theo trạng thái */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ret.status === 'requested' && (
                        <>
                          <button
                            onClick={() => handleReviewReturn(ret.orderReturnId, 'approved')}
                            disabled={!!submitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle size={13} /> Duyệt
                          </button>
                          <button
                            onClick={() => handleReviewReturn(ret.orderReturnId, 'rejected')}
                            disabled={!!submitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-60"
                          >
                            <XCircle size={13} /> Từ chối
                          </button>
                        </>
                      )}
                      {ret.status === 'approved' && (
                        <button
                          onClick={() => setReturnModal({ type: 'receive', returnId: ret.orderReturnId, adminNote: '' })}
                          disabled={!!submitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase hover:bg-violet-700 disabled:opacity-60"
                        >
                          <Truck size={13} /> Xác nhận nhận hàng
                        </button>
                      )}
                      {ret.status === 'received' && !isCodUnpaid && (
                        <button
                          onClick={() => setReturnModal({ type: 'refund', returnId: ret.orderReturnId, adminNote: '' })}
                          disabled={!!submitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-60"
                        >
                          <CreditCard size={13} /> Hoàn tiền
                        </button>
                      )}
                      {/* COD chưa thanh toán + đã nhận hàng → đóng luôn, không cần hoàn tiền */}
                      {ret.status === 'received' && isCodUnpaid && (
                        <button
                          onClick={() => setReturnModal({ type: 'close', returnId: ret.orderReturnId, adminNote: '' })}
                          disabled={!!submitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-60"
                        >
                          <AlertCircle size={13} /> Đóng yêu cầu
                        </button>
                      )}
                      {(ret.status === 'refunded' || ret.status === 'rejected') && ret.status !== 'closed' && (
                        <button
                          onClick={() => setReturnModal({ type: 'close', returnId: ret.orderReturnId, adminNote: '' })}
                          disabled={!!submitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-60"
                        >
                          <AlertCircle size={13} /> Đóng yêu cầu
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-6">

          {/* ĐỔI TRẠNG THÁI ĐƠN */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider">
              Trạng thái đơn hàng:{' '}
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase align-middle ${STATUS_STYLES[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </h2>
            {allowedStatuses.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Chuyển sang:</p>
                {allowedStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (s === 'cancelled') {
                        setCancelDialog({ show: true, reason: '', adminNote: '' });
                        return;
                      }

                      setConfirmDialog({ show: true, type: 'status', nextValue: s, label: STATUS_LABELS[s] });
                    }}
                    disabled={!!submitting}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-black uppercase border transition-all disabled:opacity-60 hover:shadow-sm ${STATUS_STYLES[s]}`}
                  >
                    {submitting === 'cancel' && s === 'cancelled'
                      ? 'Đang hủy...'
                      : submitting === 'status'
                      ? 'Đang xử lý...'
                      : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center italic pt-2 border-t border-gray-50">Trạng thái cuối — không thể thay đổi</p>
            )}
          </section>

          {/* ĐỔI TRẠNG THÁI THANH TOÁN */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
              <CreditCard size={15} className="text-emerald-500" /> Thanh toán
            </h2>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Phương thức</span>
              <span className="font-bold text-gray-800">{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Trạng thái</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                order.paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-800' :
                order.paymentStatus === 'failed' ? 'bg-rose-100 text-rose-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
              </span>
            </div>
            {allowedPayments.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Cập nhật:</p>
                <div className="flex flex-wrap gap-2">
                  {allowedPayments.map((s) => (
                    <button
                      key={s}
                      onClick={() => setConfirmDialog({ show: true, type: 'payment', nextValue: s, label: PAYMENT_STATUS_LABELS[s] })}
                      disabled={!!submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-60"
                    >
                      <ChevronRight size={12} />
                      {PAYMENT_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* THÔNG TIN GIAO HÀNG */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider">Thông tin giao hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="pb-3 border-b border-gray-50">
                <p className="text-gray-500 mb-1">Người đặt đơn</p>
                <p className="font-bold text-gray-800">{ordererName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ordererEmail}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Người nhận</span>
                <span className="font-bold text-gray-800">{order.shipping?.name || order.shippingName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Điện thoại</span>
                <span className="font-bold text-gray-800">{order.shipping?.phone || order.shippingPhone}</span>
              </div>
              <div className="pt-1">
                <p className="text-gray-500 mb-1">Địa chỉ</p>
                <p className="font-medium text-gray-700 text-xs leading-relaxed">
                  {order.shipping?.fullAddress || order.shippingAddress || '—'}
                </p>
              </div>
            </div>
          </section>

          {/* GHI CHÚ */}
          {(order.customerNote || order.cancelReason) && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider">Ghi chú</h2>
              {order.customerNote && (
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-800">Khách hàng:</span> {order.customerNote}
                </p>
              )}
              {order.cancelReason && (
                <p className="text-sm text-rose-600">
                  <span className="font-bold">Lý do hủy:</span> {order.cancelReason}
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {cancelDialog.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-gray-800 text-lg uppercase">Hủy đơn hàng</h3>
            <p className="text-sm text-gray-600">
              Vui lòng nhập lý do hủy để khách hàng nhận được thông báo chính xác.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                Lý do hủy <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
                rows={4}
                placeholder="Ví dụ: Sản phẩm tạm hết hàng, không thể đáp ứng đơn đúng thời gian..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                Ghi chú nội bộ
              </label>
              <textarea
                value={cancelDialog.adminNote}
                onChange={(e) => setCancelDialog((prev) => ({ ...prev, adminNote: e.target.value }))}
                rows={3}
                placeholder="Không bắt buộc. Chỉ dùng cho vận hành nội bộ."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setCancelDialog({ show: false, reason: '', adminNote: '' })}
                disabled={submitting === 'cancel'}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                Đóng
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={submitting === 'cancel'}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 disabled:opacity-60"
              >
                {submitting === 'cancel' ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHUYỂN TRẠNG THÁI */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-black text-gray-800 text-lg">Xác nhận thay đổi</h3>
            <p className="text-sm text-gray-600">
              Bạn có muốn chuyển {confirmDialog.type === 'payment' ? 'trạng thái thanh toán' : 'trạng thái đơn hàng'} sang{' '}
              <span className="font-bold text-blue-600">{confirmDialog.label}</span> không?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmDialog({ show: false, type: 'status', nextValue: '', label: '' })}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  setConfirmDialog({ show: false, type: 'status', nextValue: '', label: '' });
                  if (confirmDialog.type === 'auto') {
                    await handleAutoProcess();
                  } else if (confirmDialog.type === 'payment') {
                    await handleUpdatePayment(confirmDialog.nextValue);
                  } else {
                    await handleUpdateStatus(confirmDialog.nextValue);
                  }
                }}
                disabled={!!submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 disabled:opacity-60"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN ACTION HOÀN TRẢ */}
      {returnModal.type && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-gray-800 text-lg uppercase">
              {returnModal.type === 'receive' && 'Xác nhận nhận hàng hoàn trả'}
              {returnModal.type === 'refund' && 'Xác nhận hoàn tiền'}
              {returnModal.type === 'close' && 'Đóng yêu cầu hoàn trả'}
            </h3>
            <textarea
              value={returnModal.adminNote}
              onChange={(e) => setReturnModal((prev) => ({ ...prev, adminNote: e.target.value }))}
              rows={3}
              placeholder="Ghi chú admin (tùy chọn)..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReturnModal({ type: null, returnId: null, adminNote: '' })}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleReturnAction}
                disabled={submitting === 'return'}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-black uppercase hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting === 'return' ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
