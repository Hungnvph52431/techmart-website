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
import { Doughnut, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  ListOrdered,
  Settings,
  AlertTriangle,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  CalendarDays,
  Eye,
} from 'lucide-react';

import { productService } from '@/services/product.service';
import { userService } from '@/services/user.service';
import { orderService } from '@/services/order.service';
import { ProductStats, UserStats } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} triệu`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN') + 'đ';
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Hoàn trả',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  shipping: '#06B6D4',
  delivered: '#10B981',
  completed: '#84CC16',
  cancelled: '#EF4444',
  returned: '#6B7280',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  completed: 'bg-lime-100 text-lime-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
};

const PAYMENT_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
};

export const AdminDashboard = () => {
  const [orderStats, setOrderStats] = useState<any>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        const [oStats, pStats, uStats] = await Promise.all([
          orderService.getStats(),
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
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
      <p className="font-bold mb-2">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm underline">Thử lại</button>
    </div>
  );

  const statusEntries = Object.entries(orderStats?.ordersByStatus || {}).filter(([, v]) => (v as number) > 0);
  const doughnutData = {
    labels: statusEntries.map(([k]) => ORDER_STATUS_LABELS[k] || k),
    datasets: [{
      data: statusEntries.map(([, v]) => v),
      backgroundColor: statusEntries.map(([k]) => ORDER_STATUS_COLORS[k] || '#ccc'),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  // Revenue chart (7 ngày)
  const revenueByDay = orderStats?.revenueByDay || [];
  const lineData = {
    labels: revenueByDay.map((d: any) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [{
      label: 'Doanh thu',
      data: revenueByDay.map((d: any) => d.revenue),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#3B82F6',
    }],
  };

  const pendingCount = orderStats?.ordersByStatus?.pending || 0;
  const shippingCount = orderStats?.ordersByStatus?.shipping || 0;
  const cancelledCount = orderStats?.ordersByStatus?.cancelled || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động kinh doanh TechMart</p>
        </div>
        <div className="text-xs text-gray-400 bg-white px-4 py-2 rounded-lg shadow-sm border flex items-center gap-2">
          <CalendarDays size={14} />
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Alert: Đơn cần xử lý */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Có {pendingCount} đơn hàng đang chờ xử lý!</p>
              <p className="text-xs text-amber-600">Vui lòng xác nhận đơn hàng sớm để đảm bảo trải nghiệm khách hàng.</p>
            </div>
          </div>
          <Link to="/admin/orders?status=pending" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700 transition whitespace-nowrap">
            Xử lý ngay
          </Link>
        </div>
      )}

      {/* Stat Cards - 2x3 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Tổng doanh thu"
          value={formatShortCurrency(orderStats?.totalRevenue || 0)}
          sub={`Hôm nay: ${formatShortCurrency(orderStats?.revenueToday || 0)}`}
          icon={<DollarSign size={20} />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Doanh thu tháng này"
          value={formatShortCurrency(orderStats?.revenueThisMonth || 0)}
          sub={`Trung bình/đơn: ${formatShortCurrency(orderStats?.avgOrderValue || 0)}`}
          icon={<TrendingUp size={20} />}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Tổng đơn hàng"
          value={orderStats?.totalOrders || 0}
          sub={`Hôm nay: ${orderStats?.ordersToday || 0} đơn`}
          icon={<ShoppingCart size={20} />}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Sản phẩm"
          value={productStats?.totalProducts || 0}
          sub={`Đang bán: ${productStats?.activeProducts || 0}`}
          icon={<Package size={20} />}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          alert={productStats?.outOfStockCount ? `${productStats.outOfStockCount} hết hàng` : undefined}
        />
        <StatCard
          label="Khách hàng"
          value={userStats?.totalUsers || 0}
          sub={`Hoạt động: ${userStats?.activeUsers || 0}`}
          icon={<Users size={20} />}
          iconColor="text-pink-600"
          iconBg="bg-pink-50"
        />
        <StatCard
          label="Đơn đang giao"
          value={shippingCount}
          sub={`Đã hủy: ${cancelledCount}`}
          icon={<Truck size={20} />}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ doanh thu 7 ngày */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            Doanh thu 7 ngày gần nhất
          </h2>
          {revenueByDay.length > 0 ? (
            <div className="h-64">
              <Line data={lineData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx: any) => formatCurrency(ctx.parsed.y),
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (v: any) => formatShortCurrency(v),
                      font: { size: 11 },
                    },
                    grid: { color: '#f3f4f6' },
                  },
                  x: {
                    ticks: { font: { size: 11 } },
                    grid: { display: false },
                  },
                },
              }} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Biểu đồ trạng thái đơn hàng */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart size={16} className="text-violet-600" />
            Trạng thái đơn hàng
          </h2>
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <Doughnut data={doughnutData} options={{
              cutout: '70%',
              plugins: { legend: { display: false } },
            }} />
            <div className="absolute text-center">
              <p className="text-xs text-gray-400 font-bold">TỔNG</p>
              <p className="text-2xl font-black text-gray-800">{orderStats?.totalOrders}</p>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {statusEntries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ORDER_STATUS_COLORS[key] }}></span>
                  <span className="text-gray-600">{ORDER_STATUS_LABELS[key]}</span>
                </div>
                <span className="font-bold text-gray-800">{val as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Orders + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Đơn hàng mới nhất */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              Đơn hàng mới nhất
            </h2>
            <Link to="/admin/orders" className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          {(orderStats?.recentOrders?.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 border-b uppercase tracking-wider">
                    <th className="pb-3 font-bold">Mã đơn</th>
                    <th className="pb-3 font-bold">Khách hàng</th>
                    <th className="pb-3 font-bold">Tổng tiền</th>
                    <th className="pb-3 font-bold">Thanh toán</th>
                    <th className="pb-3 font-bold">Trạng thái</th>
                    <th className="pb-3 font-bold">Thời gian</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orderStats.recentOrders.map((order: any) => (
                    <tr key={order.orderId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 font-mono text-xs text-blue-600 font-bold">{order.orderCode}</td>
                      <td className="py-3">
                        <p className="text-sm font-medium text-gray-800">{order.shippingName}</p>
                        <p className="text-[10px] text-gray-400">{order.shippingPhone}</p>
                      </td>
                      <td className="py-3 text-sm font-bold text-gray-800">{formatCurrency(order.totalAmount || 0)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYMENT_BADGE[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {order.paymentStatus === 'paid' ? 'Đã TT' : order.paymentStatus === 'pending' ? 'Chưa TT' : order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-gray-400">{timeAgo(order.createdAt)}</td>
                      <td className="py-3">
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

        {/* Sidebar: Cảnh báo + Top SP + Quick Actions */}
        <div className="space-y-6">
          {/* Sản phẩm hết hàng / sắp hết */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Cảnh báo tồn kho
            </h2>
            {(productStats?.lowStockProducts?.length || 0) > 0 ? (
              <div className="space-y-2">
                {productStats!.lowStockProducts.slice(0, 5).map(p => (
                  <div key={p.productId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-xs text-gray-700 font-medium truncate flex-1 mr-2">{p.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.stockQuantity === 0 ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'}`}>
                      {p.stockQuantity === 0 ? 'Hết hàng' : `Còn ${p.stockQuantity}`}
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

          {/* Top sản phẩm bán chạy */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" />
              Top bán chạy
            </h2>
            {(productStats?.topSellingProducts?.length || 0) > 0 ? (
              <div className="space-y-2">
                {productStats!.topSellingProducts.slice(0, 5).map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700 font-medium truncate flex-1">{p.name}</span>
                    <span className="text-xs font-bold text-blue-600">{p.soldQuantity} sold</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có dữ liệu</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/admin/products/new" icon={<PlusCircle size={16} />} label="Thêm SP" color="bg-blue-600" />
              <QuickAction to="/admin/orders" icon={<ListOrdered size={16} />} label="Đơn hàng" color="bg-emerald-600" />
              <QuickAction to="/admin/users" icon={<Users size={16} />} label="Khách hàng" color="bg-orange-600" />
              <QuickAction to="/admin/categories" icon={<Settings size={16} />} label="Danh mục" color="bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment method breakdown */}
      {orderStats?.paymentMethodStats && Object.keys(orderStats.paymentMethodStats).length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            Phương thức thanh toán
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(orderStats.paymentMethodStats).map(([method, count]) => (
              <div key={method} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-gray-800">{count as number}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">{method === 'cod' ? 'COD' : method === 'vnpay' ? 'VNPay' : method === 'bank_transfer' ? 'Chuyển khoản' : method === 'wallet' ? 'Ví TechMart' : method}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, sub, icon, iconColor, iconBg, alert }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <div className={`p-2 ${iconBg} rounded-xl`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
    <p className="text-2xl font-black text-gray-800">{value}</p>
    <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{sub}</p>
    {alert && (
      <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
        <XCircle size={10} /> {alert}
      </p>
    )}
  </div>
);

const QuickAction = ({ to, icon, label, color }: any) => (
  <Link to={to} className={`${color} text-white p-3 rounded-xl flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-xs font-bold`}>
    {icon}
    <span>{label}</span>
  </Link>
);
