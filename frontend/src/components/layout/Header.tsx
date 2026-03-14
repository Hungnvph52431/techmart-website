import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export const Header = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { getTotalItems } = useCartStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-primary-600">
            TechMart
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-6">
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-6 w-6 text-gray-700 hover:text-primary-600" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {isAuthenticated() ? (
              <div className="relative group">
                {/* Thêm py-2 để tăng diện tích nhận chuột cho button */}
                <button className="flex items-center space-x-2 py-2 outline-none">
                  <User className="h-6 w-6 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">{user?.fullName}</span>
                </button>
                
                {/* FIX LỖI DROPDOWN: 
                  - Thay 'mt-2' bằng 'pt-2' để tạo cầu nối tàng hình.
                  - Dùng 'top-full' để menu bắt đầu ngay sát dưới nút User.
                */}
                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block animate-in fade-in zoom-in duration-150">
                  <div className="bg-white rounded-xl shadow-xl py-1 border border-gray-100 overflow-hidden">
                    <Link
                      to="/profile"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      Thông tin cá nhân
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      Đơn hàng của tôi
                    </Link>
                    
                    {/* Đường kẻ phân cách */}
                    <div className="border-t border-gray-50 my-1"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all active:scale-95"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>

        {/* Categories */}
        <nav className="border-t border-gray-100 py-3">
          <ul className="flex space-x-8 text-sm font-semibold">
            <li>
              <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/products?category=iPhone" className="text-gray-600 hover:text-primary-600 transition-colors">
                iPhone
              </Link>
            </li>
            <li>
              <Link to="/products?category=Samsung" className="text-gray-600 hover:text-primary-600 transition-colors">
                Samsung
              </Link>
            </li>
            <li>
              <Link to="/products?category=Xiaomi" className="text-gray-600 hover:text-primary-600 transition-colors">
                Xiaomi
              </Link>
            </li>
            <li>
              <Link to="/products?category=OPPO" className="text-gray-600 hover:text-primary-600 transition-colors">
                OPPO
              </Link>
            </li>
            <li>
              <Link to="/products?featured=true" className="text-blue-600 hover:text-blue-700 font-bold">
                Sản phẩm nổi bật
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};