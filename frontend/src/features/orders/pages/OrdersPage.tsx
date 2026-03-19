import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Package, Truck, RotateCcw, ShoppingBag, CheckCircle2, Star } from 'lucide-react';
import { orderService } from '@/services/order.service';
import api from '@/services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping:  'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned:  'Đã hoàn/trả',
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  shipping:  'bg-sky-100 text-sky-700 border-sky-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-lime-100 text-lime-700 border-lime-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  returned:  'bg-gray-100 text-gray-600 border-gray-200',
};

// ✅ Bỏ "processing" khỏi filters vì đã remove khỏi luồng
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'completed' | 'cancelled' | 'returned';

const FILTERS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all',       label: 'Tất cả' },
  { value: 'pending',   label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping',  label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'returned',  label: 'Đã hoàn/trả' },
];

export const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  // ✅ confirmingId: track đơn nào đang xác nhận nhận hàng
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders('all');
      setOrders(data as any[]);
    } catch {
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchOrders(); }, []);

  // ✅ Xác nhận đã nhận hàng ngay từ danh sách
  const handleConfirmDelivered = async (e: React.MouseEvent, orderId: number) => {
    e.preventDefault(); // Ngăn Link navigate khi bấm nút
    e.stopPropagation();
    try {
      setConfirmingId(orderId);
      await orderService.confirmDelivered(orderId);
      toast.success('🎉 Xác nhận nhận hàng thành công!');
      await fetchOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xác nhận');
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredOrders = useMemo(() =>
    filter === 'all' ? orders : orders.filter(o => o.status === filter),
    [filter, orders]
  );

  const summary = useMemo(() => ({
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    shipping:  orders.filter(o => o.status === 'shipping').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Đang tải đơn hàng...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Thống kê nhanh ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { icon: <ShoppingBag size={20} className="text-slate-500" />, label: 'Tổng đơn',   value: summary.total,     color: 'text-slate-800' },
          { icon: <Package     size={20} className="text-amber-500" />, label: 'Chờ xử lý', value: summary.pending,   color: 'text-amber-600' },
          { icon: <Truck       size={20} className="text-sky-500"   />, label: 'Đang giao',  value: summary.shipping,  color: 'text-sky-600'   },
          { icon: <CheckCircle2 size={20} className="text-emerald-500" />, label: 'Đã giao', value: summary.delivered, color: 'text-emerald-600' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setFilter(opt.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              filter === opt.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}>
            {opt.label}
            {opt.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                {orders.filter(o => o.status === opt.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Danh sách ── */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Package size={40} className="mx-auto mb-4 text-gray-200" />
          <h2 className="text-lg font-semibold text-gray-700">Chưa có đơn hàng phù hợp</h2>
          <p className="mt-1 text-sm text-gray-400">Khi bạn đặt hàng thành công, lịch sử sẽ hiện ở đây.</p>
          <Link to="/products"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors">
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => {
            const oid        = order.orderId ?? order.order_id;
            const code       = order.orderCode ?? order.order_code ?? `#${oid}`;
            const status     = order.status ?? 'pending';
            const total      = Number(order.total ?? order.totalAmount ?? 0);
            const date       = order.orderDate ?? order.created_at ?? '';
            const itemCount  = order.itemCount ?? order.items?.length ?? 0;
            const isShipping = status === 'shipping';
            const canReview  = ['delivered', 'completed'].includes(status);

            return (
              <div key={oid} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-800">{code}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {ORDER_STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{date ? formatDate(date) : '—'}</span>
                </div>

                {/* Body */}
                <Link to={`/orders/${oid}`} className="block px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{itemCount} sản phẩm</p>
                      {order.shipping?.fullAddress && (
                        <p className="text-xs text-gray-400 truncate max-w-sm">📍 {order.shipping.fullAddress}</p>
                      )}
                    </div>
                    <p className="text-lg font-black text-blue-600">{formatCurrency(total)}</p>
                  </div>
                </Link>

                {/* Actions */}
                {(isShipping || canReview) && (
                  <div className="flex gap-2 px-5 pb-4">
                    {/* ✅ Nút "Đã nhận hàng" ngay trong danh sách */}
                    {isShipping && (
                      <button
                        onClick={e => handleConfirmDelivered(e, oid)}
                        disabled={confirmingId === oid}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm shadow-emerald-100">
                        <CheckCircle2 size={14} />
                        {confirmingId === oid ? 'Đang xác nhận...' : 'Đã nhận hàng'}
                      </button>
                    )}

                    {/* Nút đánh giá */}
                    {canReview && (
                      <Link to={`/orders/${oid}`}
                        onClick={() => {/* sẽ mở modal từ OrderDetailPage */}}
                        className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-yellow-500 transition-colors">
                        <Star size={13} className="fill-current" /> Đánh giá
                      </Link>
                    )}

                    <Link to={`/orders/${oid}`}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors ml-auto">
                      Xem chi tiết →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};