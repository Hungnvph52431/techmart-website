import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  CalendarDays,
  Eye,
  RotateCcw,
  Warehouse,
  Crown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

import { productService } from '@/services/product.service';
import { userService } from '@/services/user.service';
import { adminOrderService } from '@/services/admin/order.service';
import { ProductStats, UserStats, OrderStats } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatShort = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN') + 'đ';
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý', confirmed: 'Đã xác nhận', shipping: 'Đang giao',
  delivered: 'Đã giao', completed: 'Hoàn thành', cancelled: 'Đã hủy', returned: 'Hoàn trả',
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', shipping: '#06B6D4',
  delivered: '#10B981', completed: '#84CC16', cancelled: '#EF4444', returned: '#6B7280',
};
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-cyan-100 text-cyan-700', delivered: 'bg-green-100 text-green-700',
  completed: 'bg-lime-100 text-lime-700', cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
};
const PAYMENT_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', failed: 'bg-red-100 text-red-700',
};
const PAYMENT_LABELS: Record<string, string> = {
  cod: 'COD', vnpay: 'VNPay', bank_transfer: 'Chuyển khoản', momo: 'MoMo', zalopay: 'ZaloPay', wallet: 'Ví TechMart',
};
const MEMBERSHIP_LABELS: Record<string, string> = {
  bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng', platinum: 'Bạch kim',
};
const MEMBERSHIP_COLORS: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700', silver: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-100 text-yellow-700', platinum: 'bg-purple-100 text-purple-700',
};

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
};

// --- Trend Badge Component ---
const TrendBadge = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
  if (previous === 0 && current === 0) return <span className="text-[10px] text-gray-400">--</span>;
  if (previous === 0) return <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> Mới</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[10px] text-gray-400 font-bold flex items-center gap-0.5"><Minus size={10} /> 0%{suffix}</span>;
  if (pct > 0) return <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> +{pct}%{suffix}</span>;
  return <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5"><ArrowDownRight size={10} /> {pct}%{suffix}</span>;
};

export const AdminDashboard = () => {
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type ChartRange = 'today' | '7d' | 'month' | 'custom';
  const [chartRange, setChartRange] = useState<ChartRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);

        const today = new Date().toISOString().slice(0, 10);
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (chartRange === 'today') {
          startDate = today; endDate = today;
        } else if (chartRange === '7d') {
          const from = new Date(); from.setDate(from.getDate() - 6);
          startDate = from.toISOString().slice(0, 10); endDate = today;
        } else if (chartRange === 'month') {
          const now = new Date();
          startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          endDate = today;
        } else if (chartRange === 'custom') {
          if (!customStart || !customEnd) { setLoading(false); return; }
          startDate = customStart; endDate = customEnd;
        }

        const [oStats, pStats, uStats] = await Promise.all([
          adminOrderService.getStats(startDate, endDate),
          productService.getStats(),
          userService.getUserStats(),
        ]);
        setOrderStats(oStats);
        setProductStats(pStats);
        setUserStats(uStats);
      } catch (err) {
        console.error('Lỗi tải Dashboard:', err);
        setError('Không thể kết nối với máy chủ Backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllStats();
  }, [chartRange, customStart, customEnd]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
      <p className="font-bold mb-2">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm underline">Thử lại</button>
    </div>
  );

  const o = orderStats!;
  const p = productStats!;
  const u = userStats!;

  const pendingCount = o.ordersByStatus?.pending || 0;
  const statusEntries = Object.entries(o.ordersByStatus || {}).filter(([, v]) => v > 0);

  // Chart data
  const doughnutData = {
    labels: statusEntries.map(([k]) => ORDER_STATUS_LABELS[k] || k),
    datasets: [{
      data: statusEntries.map(([, v]) => v),
      backgroundColor: statusEntries.map(([k]) => ORDER_STATUS_COLORS[k] || '#ccc'),
      borderWidth: 0, hoverOffset: 8,
    }],
  };

  const revenueByDay = o.revenueByDay || [];
  const lineData = {
    labels: revenueByDay.map((d) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [{
      label: 'Doanh thu',
      data: revenueByDay.map((d) => d.revenue),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#fff', pointBorderWidth: 2,
    }],
  };

  const categoryData = {
    labels: (p.categoryBreakdown || []).map(c => c.categoryName),
    datasets: [{
      label: 'Đã bán',
      data: (p.categoryBreakdown || []).map(c => c.totalSold),
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  return (
    <div className="space-y-8">
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard TechMart</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan kinh doanh theo thời gian thực</p>
        </div>
        <div className="text-xs text-gray-400 bg-white px-4 py-2 rounded-xl shadow-sm border flex items-center gap-2">
          <CalendarDays size={14} />
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ============ CẢNH BÁO ============ */}
      {(pendingCount > 0 || (o.returnStats?.pending || 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingCount > 0 && (
            <Link to="/admin/orders?status=pending" className="flex-1 min-w-[280px] bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:bg-amber-100 transition">
              <div className="bg-amber-100 p-2 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div>
              <div className="flex-1">
                <p className="font-bold text-amber-800 text-sm">{pendingCount} đơn chờ xử lý</p>
                <p className="text-[10px] text-amber-600">Cần xác nhận sớm</p>
              </div>
              <ArrowRight size={16} className="text-amber-400" />
            </Link>
          )}
          {(o.returnStats?.pending || 0) > 0 && (
            <Link to="/admin/returns" className="flex-1 min-w-[280px] bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 hover:bg-orange-100 transition">
              <div className="bg-orange-100 p-2 rounded-lg"><RotateCcw size={18} className="text-orange-600" /></div>
              <div className="flex-1">
                <p className="font-bold text-orange-800 text-sm">{o.returnStats.pending} yêu cầu hoàn trả</p>
                <p className="text-[10px] text-orange-600">Đang chờ duyệt</p>
              </div>
              <ArrowRight size={16} className="text-orange-400" />
            </Link>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 1: DOANH THU & TÀI CHÍNH                            */}
      {/* ============================================================ */}
      <section>
        <SectionTitle icon={<DollarSign size={18} />} title="Doanh thu & Tài chính" color="text-emerald-600" />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard
            label="Doanh thu hôm nay"
            value={formatShort(o.revenueToday)}
            trend={<TrendBadge current={o.revenueToday} previous={o.revenueYesterday} suffix=" vs hôm qua" />}
            icon={<DollarSign size={18} />}
            iconColor="text-emerald-600" iconBg="bg-emerald-50"
          />
          <KpiCard
            label="Doanh thu tháng này"
            value={formatShort(o.revenueThisMonth)}
            trend={<TrendBadge current={o.revenueThisMonth} previous={o.revenueLastMonth} suffix=" vs tháng trước" />}
            icon={<TrendingUp size={18} />}
            iconColor="text-blue-600" iconBg="bg-blue-50"
          />
          <KpiCard
            label="Giá trị đơn TB"
            value={formatShort(o.avgOrderValue)}
            trend={<span className="text-[10px] text-gray-400">trên {o.totalOrders} đơn</span>}
            icon={<BarChart3 size={18} />}
            iconColor="text-violet-600" iconBg="bg-violet-50"
          />
          <KpiCard
            label="Tổng doanh thu"
            value={formatShort(o.totalRevenue)}
            trend={<span className="text-[10px] text-gray-400">tất cả thời gian</span>}
            icon={<Crown size={18} />}
            iconColor="text-amber-600" iconBg="bg-amber-50"
          />
        </div>

        {/* Revenue Chart + Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-600" /> Biểu đồ doanh thu
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {(['today', '7d', 'month', 'custom'] as const).map((key) => (
                  <button key={key}
                    onClick={() => setChartRange(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      chartRange === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {key === 'today' ? 'Hôm nay' : key === '7d' ? '7 ngày' : key === 'month' ? 'Tháng này' : 'Tùy chỉnh'}
                  </button>
                ))}
                {chartRange === 'custom' && (
                  <div className="flex items-center gap-1">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                    <span className="text-[10px] text-gray-400">→</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                      className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  </div>
                )}
              </div>
            </div>
            {revenueByDay.length > 0 ? (
              <div className="h-64">
                <Line data={lineData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => formatCurrency(ctx.parsed.y) } },
                  },
                  scales: {
                    y: { ticks: { callback: (v: any) => formatShort(v), font: { size: 11 } }, grid: { color: '#f3f4f6' } },
                    x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                  },
                }} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={14} className="text-green-600" />
              Phương thức thanh toán
            </h3>
            <div className="space-y-3">
              {Object.entries(o.paymentMethodStats || {}).map(([method, count]) => {
                const revenue = o.paymentMethodRevenue?.[method] || 0;
                const pct = o.totalOrders > 0 ? Math.round((count / o.totalOrders) * 100) : 0;
                return (
                  <div key={method} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{PAYMENT_LABELS[method] || method}</span>
                      <span className="text-[10px] text-gray-400">{count} đơn ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatShort(revenue)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: ĐƠN HÀNG & VẬN HÀNH                             */}
      {/* ============================================================ */}
      <section>
        <SectionTitle icon={<ShoppingCart size={18} />} title="Đơn hàng & Vận hành" color="text-violet-600" />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard
            label="Đơn hôm nay"
            value={o.ordersToday}
            trend={<span className="text-[10px] text-gray-400">tháng này: {o.ordersThisMonth}</span>}
            icon={<ShoppingCart size={18} />}
            iconColor="text-violet-600" iconBg="bg-violet-50"
          />
          <KpiCard
            label="Đang giao hàng"
            value={o.ordersByStatus?.shipping || 0}
            trend={<span className="text-[10px] text-cyan-600 font-bold">đang vận chuyển</span>}
            icon={<Truck size={18} />}
            iconColor="text-cyan-600" iconBg="bg-cyan-50"
          />
          <KpiCard
            label="Tỷ lệ hoàn thành"
            value={`${o.completionRate != null ? o.completionRate : 0}%`}
            trend={<span className="text-[10px] text-gray-400">hủy: {o.cancellationRate != null ? o.cancellationRate : 0}%</span>}
            icon={<CheckCircle size={18} />}
            iconColor="text-green-600" iconBg="bg-green-50"
          />
          <KpiCard
            label="Hoàn trả"
            value={o.returnStats?.total || 0}
            trend={
              (o.returnStats?.pending || 0) > 0
                ? <span className="text-[10px] text-orange-600 font-bold">{o.returnStats.pending} chờ duyệt</span>
                : <span className="text-[10px] text-green-600 font-bold">Không có chờ duyệt</span>
            }
            icon={<RotateCcw size={18} />}
            iconColor="text-orange-600" iconBg="bg-orange-50"
          />
        </div>

        {/* Donut + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Donut */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Phân bổ trạng thái</h3>
            <div className="relative flex items-center justify-center" style={{ height: 180 }}>
              <Doughnut data={doughnutData} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
              <div className="absolute text-center">
                <p className="text-[10px] text-gray-400 font-bold">TỔNG</p>
                <p className="text-2xl font-black text-gray-800">{o.totalOrders}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {statusEntries.map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ORDER_STATUS_COLORS[key] }} />
                    <span className="text-gray-600">{ORDER_STATUS_LABELS[key]}</span>
                  </div>
                  <span className="font-bold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock size={14} className="text-orange-500" />
                Đơn hàng mới nhất
              </h3>
              <Link to="/admin/orders" className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                Xem tất cả <ArrowRight size={12} />
              </Link>
            </div>
            {(o.recentOrders?.length || 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-gray-400 border-b uppercase tracking-wider">
                      <th className="pb-3 font-bold">Mã đơn</th>
                      <th className="pb-3 font-bold">Khách hàng</th>
                      <th className="pb-3 font-bold">Tổng tiền</th>
                      <th className="pb-3 font-bold">TT</th>
                      <th className="pb-3 font-bold">Trạng thái</th>
                      <th className="pb-3 font-bold">Thời gian</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {o.recentOrders.map((order: any) => (
                      <tr key={order.orderId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 font-mono text-xs text-blue-600 font-bold">{order.orderCode}</td>
                        <td className="py-2.5">
                          <p className="text-xs font-medium text-gray-800">{order.shippingName}</p>
                          <p className="text-[10px] text-gray-400">{order.shippingPhone}</p>
                        </td>
                        <td className="py-2.5 text-xs font-bold text-gray-800">{formatCurrency(order.totalAmount || 0)}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PAYMENT_BADGE[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                            {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'pending' ? 'Chưa' : order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-[10px] text-gray-400">{timeAgo(order.createdAt)}</td>
                        <td className="py-2.5">
                          <Link to={`/admin/orders/${order.orderId}`} className="text-gray-400 hover:text-blue-600">
                            <Eye size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">Chưa có đơn hàng nào</div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3: SẢN PHẨM & KHO HÀNG                              */}
      {/* ============================================================ */}
      <section>
        <SectionTitle icon={<Package size={18} />} title="Sản phẩm & Kho hàng" color="text-orange-600" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard
            label="Tổng sản phẩm"
            value={p.totalProducts}
            trend={<span className="text-[10px] text-gray-400">đang bán: {p.activeProducts}</span>}
            icon={<Package size={18} />}
            iconColor="text-orange-600" iconBg="bg-orange-50"
            alert={p.outOfStockCount > 0 ? `${p.outOfStockCount} hết hàng` : undefined}
          />
          <KpiCard
            label="Tổng tồn kho"
            value={`${(p.totalStockUnits || 0).toLocaleString('vi-VN')} SP`}
            trend={<span className="text-[10px] text-gray-400">giá trị: {formatShort(p.totalInventoryValue || 0)}</span>}
            icon={<Warehouse size={18} />}
            iconColor="text-indigo-600" iconBg="bg-indigo-50"
          />
          <KpiCard
            label="Đã bán ra"
            value={`${(p.totalSoldUnits || 0).toLocaleString('vi-VN')} SP`}
            trend={<span className="text-[10px] text-gray-400">tổng lượt bán</span>}
            icon={<TrendingUp size={18} />}
            iconColor="text-green-600" iconBg="bg-green-50"
          />
          <KpiCard
            label="Sắp hết hàng"
            value={p.lowStockCount || p.lowStockProducts?.length || 0}
            trend={
              (p.lowStockCount || p.lowStockProducts?.length || 0) > 0
                ? <span className="text-[10px] text-red-500 font-bold">cần nhập thêm</span>
                : <span className="text-[10px] text-green-600 font-bold">ổn định</span>
            }
            icon={<AlertTriangle size={18} />}
            iconColor="text-red-600" iconBg="bg-red-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Category Chart */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-blue-600" />
              Bán theo danh mục
            </h3>
            {(p.categoryBreakdown?.length || 0) > 0 ? (
              <div className="h-52">
                <Bar data={categoryData} options={{
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { color: '#f3f4f6' } },
                    y: { ticks: { font: { size: 10 } }, grid: { display: false } },
                  },
                }} />
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
            )}
          </div>

          {/* Top bán chạy */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-500" />
              Top bán chạy
            </h3>
            {(p.topSellingProducts?.length || 0) > 0 ? (
              <div className="space-y-2">
                {p.topSellingProducts.slice(0, 5).map((prod, i) => (
                  <div key={prod.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-700 font-medium truncate block">{prod.name}</span>
                      <span className="text-[10px] text-gray-400">{formatShort(prod.price || 0)}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 whitespace-nowrap">{prod.soldQuantity} sold</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có dữ liệu</p>
            )}
          </div>

          {/* Cảnh báo tồn kho */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              Cảnh báo tồn kho
            </h3>
            {(p.lowStockProducts?.length || 0) > 0 ? (
              <div className="space-y-2">
                {p.lowStockProducts.slice(0, 6).map(prod => (
                  <div key={prod.productId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-xs text-gray-700 font-medium truncate flex-1 mr-2">{prod.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prod.stockQuantity === 0 ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'}`}>
                      {prod.stockQuantity === 0 ? 'Hết hàng' : `Còn ${prod.stockQuantity}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-2 py-4 justify-center">
                <CheckCircle size={14} className="text-green-500" /> Tồn kho ổn định
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4: KHÁCH HÀNG                                        */}
      {/* ============================================================ */}
      <section>
        <SectionTitle icon={<Users size={18} />} title="Khách hàng" color="text-pink-600" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Customer KPIs */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Tổng quan khách hàng</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Tổng tài khoản</span>
                <span className="text-lg font-black text-gray-800">{u.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Đang hoạt động</span>
                <span className="text-lg font-black text-green-600">{u.activeUsers}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Theo vai trò</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(u.usersByRole || {}).map(([role, count]) => (
                    <span key={role} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                      {role === 'customer' ? 'Khách hàng' : role === 'admin' ? 'Admin' : role === 'staff' ? 'Nhân viên' : role}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Membership breakdown */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Crown size={14} className="text-yellow-500" />
              Hạng thành viên
            </h3>
            {Object.keys(u.usersByMembership || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(u.usersByMembership).map(([level, count]) => {
                  const pct = u.totalUsers > 0 ? Math.round((count / u.totalUsers) * 100) : 0;
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${MEMBERSHIP_COLORS[level] || 'bg-gray-100 text-gray-600'}`}>
                          {MEMBERSHIP_LABELS[level] || level}
                        </span>
                        <span className="text-xs text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có dữ liệu</p>
            )}
          </div>

          {/* Top khách hàng tháng này */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Crown size={14} className="text-amber-500" />
              Top khách hàng tháng này
            </h3>
            {(o.topCustomers?.length || 0) > 0 ? (
              <div className="space-y-2">
                {o.topCustomers.map((cust, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 font-bold truncate">{cust.name}</p>
                      <p className="text-[10px] text-gray-400">{cust.orderCount} đơn</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">{formatShort(cust.totalSpent)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có đơn hàng tháng này</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

// ============ SUB-COMPONENTS ============

const SectionTitle = ({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
    <span className={color}>{icon}</span>
    <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wide">{title}</h2>
  </div>
);

const KpiCard = ({ label, value, trend, icon, iconColor, iconBg, alert }: {
  label: string; value: string | number; trend: React.ReactNode;
  icon: React.ReactNode; iconColor: string; iconBg: string; alert?: string;
}) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <div className={`p-1.5 ${iconBg} rounded-xl`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
    <p className="text-xl font-black text-gray-800">{value}</p>
    <div className="mt-1">{trend}</div>
    {alert && (
      <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
        <XCircle size={10} /> {alert}
      </p>
    )}
  </div>
);