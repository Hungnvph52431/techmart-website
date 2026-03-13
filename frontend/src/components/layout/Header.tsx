import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export const Header = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { getTotalItems, items, getTotalPrice } = useCartStore();
  const navigate = useNavigate();

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
            <div className="relative group">
              <Link to="/cart" className="relative flex items-center py-2">
                <ShoppingCart className="h-6 w-6 text-gray-700 hover:text-primary-600 transition-colors" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-sm">
                    {getTotalItems()}
                  </span>
                )}
              </Link>

              {/* Mini Cart Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-xl py-2 hidden group-hover:block border border-gray-100 z-50 transition-all duration-200 origin-top">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
                  </div>
                ) : (
                  <>
                    <h3 className="px-4 py-2 font-bold text-gray-800 border-b border-gray-100">Sản phẩm mới thêm</h3>
                    <div className="max-h-64 overflow-y-auto px-4 py-2">
                      {items.slice(-3).reverse().map((item) => (
                        <div key={item.product.productId} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                          <img src={item.product.mainImage || '/placeholder.jpg'} alt={item.product.name} className="w-12 h-12 object-cover rounded shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={item.product.name}>{item.product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Số lượng: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">
                              {(item.product.salePrice || item.product.price).toLocaleString('vi-VN')}₫
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
                      <div className="flex justify-between mb-3 text-sm">
                        <span className="text-gray-600">Tổng cộng (chưa gồm phí ship):</span>
                        <span className="font-bold text-red-600 text-base">{getTotalPrice().toLocaleString('vi-VN')}₫</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => navigate('/cart')} className="w-full px-4 py-2 text-sm font-medium text-center text-primary-600 bg-white border border-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          Xem giỏ hàng
                        </button>
                        <button onClick={() => navigate('/checkout')} className="w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary-600 hover:bg-primary-700 shadow flex items-center justify-center rounded-lg transition-colors">
                          Thanh toán
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isAuthenticated() ? (
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  <User className="h-6 w-6 text-gray-700" />
                  <span className="text-sm">{user?.fullName}</span>
                </button>
                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                  <div className="bg-white rounded-md shadow-lg py-1 border border-gray-100">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Thông tin cá nhân
                    </Link>
                    <Link
                      to="/orders"
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
                </div>
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
