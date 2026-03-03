import { useEffect, useState } from 'react';
import { productService } from '@/services/product.service';
import { orderService } from '@/services/order.service';
import { Link } from 'react-router-dom';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [products, orders] = await Promise.all([
        productService.getProducts(),
        orderService.getAll(),
      ]);

      const pendingOrders = orders.filter(
        (order: any) => order.status === 'pending'
      ).length;

      const revenue = orders
        .filter((order: any) => order.status === 'completed')
        .reduce((sum: number, order: any) => sum + Number(order.total_amount), 0);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders,
        revenue,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tổng sản phẩm</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.totalProducts}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
          <Link
            to="/admin/products"
            className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
          >
            Xem chi tiết →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tổng đơn hàng</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.totalOrders}
              </p>
            </div>
            <div className="text-4xl">🛒</div>
          </div>
          <Link
            to="/admin/orders"
            className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
          >
            Xem chi tiết →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đơn chờ xử lý</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats.pendingOrders}
              </p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
          <Link
            to="/admin/orders"
            className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
          >
            Xem chi tiết →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Doanh thu</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {(stats.revenue / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            {stats.revenue.toLocaleString('vi-VN')} VNĐ
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/products/new"
            className="flex items-center justify-center px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ➕ Thêm sản phẩm mới
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center justify-center px-6 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            📁 Quản lý danh mục
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center justify-center px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            📋 Xem đơn hàng
          </Link>
          <Link
            to="/admin/products"
            className="flex items-center justify-center px-6 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            📦 Quản lý sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
};
