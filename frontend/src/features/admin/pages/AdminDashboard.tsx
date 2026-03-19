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
import { Doughnut } from 'react-chartjs-2'; // Đã xóa Bar vì không dùng
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  ArrowRight, // Đã xóa AlertTriangle vì không dùng
  PlusCircle,
  ListOrdered,
  Settings
} from 'lucide-react';

import { productService } from '@/services/product.service';
import { userService } from '@/services/user.service';
import { orderService } from '@/services/order.service';
import { ProductStats, UserStats, OrderStats } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- HELPERS ---
// Đã xóa formatCurrency để tránh lỗi unused

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn trả',
};

const ORDER_STATUS_COLORS = ['#F59E0B', '#3B82F6', '#06B6D4', '#10B981', '#84CC16', '#EF4444', '#6B7280'];
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
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
      <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu TechMart...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
      <p className="font-bold mb-2">⚠️ {error}</p>
      <button onClick={() => window.location.reload()} className="text-sm underline">Thử lại ngay</button>
    </div>
  );

  const doughnutData = {
    labels: Object.keys(orderStats?.ordersByStatus || {}).map(k => ORDER_STATUS_LABELS[k] || k),
    datasets: [{
      data: Object.values(orderStats?.ordersByStatus || {}),
      backgroundColor: ORDER_STATUS_COLORS,
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          Cập nhật mới nhất: {new Date().toLocaleTimeString('vi-VN')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Doanh thu" 
          value={formatShortCurrency(orderStats?.totalRevenue || 0)} 
          sub={`Tháng này: ${formatShortCurrency(orderStats?.revenueThisMonth || 0)}`}
          icon={<TrendingUp className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard 
          label="Đơn hàng" 
          value={orderStats?.totalOrders || 0} 
          sub={`Chờ xử lý: ${orderStats?.ordersByStatus.pending || 0}`}
          icon={<ShoppingCart className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard 
          label="Sản phẩm" 
          value={productStats?.totalProducts || 0} 
          sub={`Hết hàng: ${productStats?.outOfStockCount || 0}`}
          icon={<Package className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard 
          label="Người dùng" 
          value={userStats?.totalUsers || 0} 
          sub={`Hoạt động: ${userStats?.activeUsers || 0}`}
          icon={<Users className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Trạng thái đơn hàng</h2>
          <div className="aspect-square relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
            <div className="absolute text-center">
              <p className="text-xs text-gray-400 font-bold uppercase">Tổng đơn</p>
              <p className="text-2xl font-black text-gray-800">{orderStats?.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">Đơn hàng mới nhất</h2>
            <Link to="/admin/orders" className="text-blue-600 text-sm font-bold flex items-center gap-1">
              Tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-50 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Mã đơn</th>
                  <th className="pb-3 font-bold">Khách hàng</th>
                  <th className="pb-3 font-bold">Tổng tiền</th>
                  <th className="pb-3 font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(orderStats?.recentOrders || []).map(order => (
                  <tr key={order.orderId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 font-mono text-xs text-blue-600 font-bold">{order.orderCode}</td>
                    <td className="py-4 text-sm text-gray-600">{order.shippingName}</td>
                    <td className="py-4 text-sm font-bold text-gray-800">{formatShortCurrency(order.totalAmount || 0)}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[order.status || 'pending'] || 'bg-gray-100 text-gray-600'}`}>
                        {ORDER_STATUS_LABELS[order.status || 'pending'] || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Lối tắt quản lý</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction to="/admin/products/new" icon={<PlusCircle size={20} />} label="Thêm sản phẩm" color="bg-blue-600" />
          <QuickAction to="/admin/orders" icon={<ListOrdered size={20} />} label="Xử lý đơn hàng" color="bg-emerald-600" />
          <QuickAction to="/admin/users" icon={<Users size={20} />} label="Khách hàng" color="bg-orange-600" />
          <QuickAction to="/admin/categories" icon={<Settings size={20} />} label="Cài đặt danh mục" color="bg-gray-800" />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <div className={`p-2.5 ${color} rounded-xl`}>{icon}</div>
    </div>
    <p className="text-3xl font-black text-gray-800">{value}</p>
    <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
  </div>
);

const QuickAction = ({ to, icon, label, color }: any) => (
  <Link to={to} className={`${color} text-white p-4 rounded-xl flex items-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-gray-100`}>
    {icon}
    <span className="font-bold text-sm">{label}</span>
  </Link>
);