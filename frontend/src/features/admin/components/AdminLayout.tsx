import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="text-2xl font-bold text-blue-600">
              TechMart Admin
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              👤 {user.fullName || user.email}
            </span>
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900"
            >
              → Xem trang web
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-screen shadow-sm p-6">
          <nav className="space-y-2">
            <Link
              to="/admin"
              className={`block px-4 py-3 rounded-lg transition-colors ${location.pathname === '/admin'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              📊 Dashboard
            </Link>
            <Link
              to="/admin/categories"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/admin/categories')
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              🏷️ Danh mục
            </Link>

            <Link
              to="/admin/products"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/admin/products')
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              📦 Sản phẩm
            </Link>
            <Link
              to="/admin/orders"
              className={`block px-4 py-3 rounded-lg transition-colors ${isActive('/admin/orders')
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              🛒 Đơn hàng
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
