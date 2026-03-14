import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export const Header = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.name || (user as any)?.fullName || user?.email || 'Tai khoan';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) {
        return;
      }

      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
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
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen((previous) => !previous)}
                  className="flex items-center space-x-2"
                >
                  <User className="h-6 w-6 text-gray-700" />
                  <span className="text-sm">{displayName}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Thông tin cá nhân
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đơn hàng của tôi
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>

        {/* Categories */}
        <nav className="border-t border-gray-200 py-3">
          <ul className="flex space-x-6 text-sm">
            <li>
              <Link to="/" className="text-gray-700 hover:text-primary-600">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/products?category=iPhone" className="text-gray-700 hover:text-primary-600">
                iPhone
              </Link>
            </li>
            <li>
              <Link to="/products?category=Samsung" className="text-gray-700 hover:text-primary-600">
                Samsung
              </Link>
            </li>
            <li>
              <Link to="/products?category=Xiaomi" className="text-gray-700 hover:text-primary-600">
                Xiaomi
              </Link>
            </li>
            <li>
              <Link to="/products?category=OPPO" className="text-gray-700 hover:text-primary-600">
                OPPO
              </Link>
            </li>
            <li>
              <Link to="/products?featured=true" className="text-gray-700 hover:text-primary-600">
                Sản phẩm nổi bật
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};
