import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { orderService, OrderStats } from '@/services/order.service';
import { productService, ProductStats } from '@/services/product.service';
import { userService, UserStats } from '@/services/user.service';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn trả',
};

const ORDER_STATUS_COLORS = [
  '#F59E0B', // pending - yellow
  '#3B82F6', // confirmed - blue
  '#8B5CF6', // processing - purple
  '#06B6D4', // shipping - cyan
  '#10B981', // delivered - green
  '#EF4444', // cancelled - red
  '#6B7280', // returned - gray
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

const PAYMENT_METHOD_COLORS = ['#3B82F6', '#10B981', '#EC4899', '#EF4444', '#F59E0B'];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipping: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};

const MEMBERSHIP_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-400',
  platinum: 'bg-cyan-400',
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const AdminDashboard = () => {
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
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
        console.error('Failed to fetch stats:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 text-lg font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Doughnut chart: order status ──────────────────────────────────────────
  const statusKeys = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled', 'returned'] as const;
  const statusValues = statusKeys.map(k => orderStats?.ordersByStatus[k] ?? 0);
  const doughnutData = {
    labels: statusKeys.map(k => ORDER_STATUS_LABELS[k]),
    datasets: [{
      data: statusValues,
      backgroundColor: ORDER_STATUS_COLORS,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // ── Bar chart: payment method revenue ─────────────────────────────────────
  const paymentKeys = ['cod', 'bank_transfer', 'momo', 'vnpay', 'zalopay'] as const;
  const paymentValues = paymentKeys.map(k => orderStats?.paymentMethodStats[k] ?? 0);
  const barData = {
    labels: paymentKeys.map(k => PAYMENT_METHOD_LABELS[k]),
    datasets: [{
      label: 'Doanh thu (VNĐ)',
      data: paymentValues,
      backgroundColor: PAYMENT_METHOD_COLORS,
      borderRadius: 6,
    }],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatShortCurrency(value),
        },
      },
    },
  };

  // ── Membership stats ──────────────────────────────────────────────────────
  const totalMembership = Object.values(userStats?.usersByMembership ?? {}).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* ── Row 1: KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Doanh thu</p>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatShortCurrency(orderStats?.totalRevenue ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Tháng này: {formatShortCurrency(orderStats?.revenueThisMonth ?? 0)}
          </p>
          <p className="text-xs text-gray-400">
            Trung bình đơn: {formatShortCurrency(orderStats?.avgOrderValue ?? 0)}
          </p>
        </div>

        {/* Total orders */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Đơn hàng</p>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{orderStats?.totalOrders ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            Chờ xử lý: <span className="text-yellow-600 font-semibold">{orderStats?.ordersByStatus.pending ?? 0}</span>
          </p>
          <Link to="/admin/orders" className="text-blue-500 text-xs hover:underline flex items-center gap-1 mt-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Total products */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Sản phẩm</p>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{productStats?.totalProducts ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            Đang bán: <span className="text-green-600 font-semibold">{productStats?.activeProducts ?? 0}</span>
            {' · '}Hết hàng: <span className="text-red-500 font-semibold">{productStats?.outOfStockCount ?? 0}</span>
          </p>
          <Link to="/admin/products" className="text-blue-500 text-xs hover:underline flex items-center gap-1 mt-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Total users */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Người dùng</p>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{userStats?.totalUsers ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            Hoạt động: <span className="text-green-600 font-semibold">{userStats?.activeUsers ?? 0}</span>
            {' · '}Bị khóa: <span className="text-red-500 font-semibold">{userStats?.bannedUsers ?? 0}</span>
          </p>
          <Link to="/admin/users" className="text-blue-500 text-xs hover:underline flex items-center gap-1 mt-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Row 2: Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Doughnut: order status */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Phân bổ trạng thái đơn hàng</h2>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 flex-shrink-0">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  cutout: '65%',
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <ul className="space-y-2 flex-1">
              {statusKeys.map((key, i) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ORDER_STATUS_COLORS[i] }} />
                    <span className="text-gray-600">{ORDER_STATUS_LABELS[key]}</span>
                  </span>
                  <span className="font-semibold text-gray-800">{statusValues[i]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bar: payment method revenue */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Doanh thu theo phương thức thanh toán</h2>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* ── Row 3: Tables ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent orders table */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Đơn hàng gần đây</h2>
            <Link to="/admin/orders" className="text-blue-500 text-xs hover:underline flex items-center gap-1">
              Tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">Mã đơn</th>
                  <th className="pb-2 font-medium">Khách hàng</th>
                  <th className="pb-2 font-medium text-right">Tổng</th>
                  <th className="pb-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(orderStats?.recentOrders ?? []).map(order => (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="py-2 text-blue-600 font-mono text-xs">{order.orderCode}</td>
                    <td className="py-2 text-gray-700 truncate max-w-[120px]">{order.shippingName}</td>
                    <td className="py-2 text-right text-gray-800 font-medium">{formatShortCurrency(order.total)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(orderStats?.recentOrders ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">Chưa có đơn hàng</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top selling products */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Top sản phẩm bán chạy</h2>
            <Link to="/admin/products" className="text-blue-500 text-xs hover:underline flex items-center gap-1">
              Tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {(productStats?.topSellingProducts ?? []).map((p, idx) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                  {idx + 1}
                </span>
                {p.mainImage && (
                  <img src={p.mainImage} alt={p.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">Đã bán: {p.soldQuantity} · Tồn: <span className={p.stockQuantity < 10 ? 'text-red-500 font-semibold' : 'text-green-600'}>{p.stockQuantity}</span></p>
                </div>
              </div>
            ))}
            {(productStats?.topSellingProducts ?? []).length === 0 && (
              <p className="text-center text-gray-400 py-6">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Low stock + User membership ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock alert */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className={`w-5 h-5 ${(productStats?.lowStockCount ?? 0) > 0 ? 'text-orange-500' : 'text-green-500'}`} />
            <h2 className="text-base font-semibold text-gray-700">Cảnh báo tồn kho thấp</h2>
            {(productStats?.lowStockCount ?? 0) > 0 && (
              <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {productStats?.lowStockCount} sản phẩm
              </span>
            )}
          </div>
          {(productStats?.lowStockCount ?? 0) === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-2xl">✅</span>
              <p className="text-sm text-green-700 font-medium">Tất cả sản phẩm đều có tồn kho ổn định</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(productStats?.lowStockProducts ?? []).map(p => (
                <div key={p.productId} className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                  <span className="text-sm text-gray-700 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-orange-600 ml-2 flex-shrink-0">
                    Còn {p.stockQuantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User membership stats */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Thống kê khách hàng theo hạng</h2>
          <div className="space-y-3">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map(tier => {
              const count = userStats?.usersByMembership[tier] ?? 0;
              const pct = totalMembership > 0 ? Math.round((count / totalMembership) * 100) : 0;
              return (
                <div key={tier}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${MEMBERSHIP_COLORS[tier]}`} />
                      <span className="text-gray-700">{MEMBERSHIP_LABELS[tier]}</span>
                    </span>
                    <span className="text-gray-600 font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${MEMBERSHIP_COLORS[tier]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
            {Object.entries(userStats?.usersByRole ?? {}).map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <span className="text-gray-500 capitalize">{role}</span>
                <span className="font-semibold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 5: Quick Actions ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/admin/products/new"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <Package className="w-4 h-4" /> Thêm sản phẩm mới
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            <ShoppingCart className="w-4 h-4" /> Xem đơn hàng
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
          >
            <Users className="w-4 h-4" /> Quản lý người dùng
          </Link>
        </div>
      </div>
    </div>
  );
};
