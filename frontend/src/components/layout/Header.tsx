import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export const Header = () => {
  const navigate = useNavigate();
  // Lấy dữ liệu từ Auth Store (Giữ logic của Khanh)
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  
  // Lấy dữ liệu từ Cart Store (Tích hợp thêm Mini Cart của Tuấn Anh)
  const { getTotalItems, items, getTotalPrice } = useCartStore();
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // SỬA LỖI 2339: Ưu tiên fullName
  const displayName = user?.fullName || user?.email || 'Tài khoản';

  // Logic đóng menu khi click ra ngoài (Bản sắc của Khanh)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    clearAuth();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-black text-blue-600 uppercase italic tracking-tighter">
            TechMart
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm iPhone, Samsung..."
                className="w-full px-4 py-2 pl-10 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm font-bold"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-6">
            
            {/* --- KHỐI GIỎ HÀNG (MINI CART DROP DOWN) --- */}
            <div className="relative group">
              <Link to="/cart" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors flex items-center">
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">
                    {getTotalItems()}
                  </span>
                )}
              </Link>

              {/* Dropdown xem nhanh giỏ hàng */}
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-[24px] shadow-2xl py-2 hidden group-hover:block border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-100 mb-3" />
                    <p className="text-gray-400 font-bold uppercase italic text-[10px] tracking-widest">Giỏ hàng trống</p>
                  </div>
                ) : (
                  <>
                    <h3 className="px-5 py-3 font-black text-gray-800 uppercase italic text-xs border-b border-gray-50">Sản phẩm mới thêm</h3>
                    <div className="max-h-64 overflow-y-auto px-5 py-2">
                      {items.slice(-3).reverse().map((item) => (
                        <div key={item.product.productId} className="flex gap-4 py-4 border-b border-gray-50 last:border-0">
                          <img 
                            src={item.product.mainImage || '/placeholder.jpg'} 
                            alt={item.product.name} 
                            className="w-12 h-12 object-contain bg-gray-50 rounded-xl" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate uppercase">{item.product.name}</p>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Số lượng: {item.quantity}</p>
                          </div>
                          <p className="text-xs font-black text-red-600">
                            {(item.product.salePrice || item.product.price).toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 bg-gray-50/50 rounded-b-[24px] border-t border-gray-100">
                      <div className="flex justify-between mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tạm tính:</span>
                        <span className="font-black text-red-600 text-sm">{getTotalPrice().toLocaleString('vi-VN')}₫</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => navigate('/cart')} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white border-2 border-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          Giỏ hàng
                        </button>
                        <button onClick={() => navigate('/checkout')} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-xl transition-all">
                          Thanh toán
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- KHỐI TÀI KHOẢN (USER MENU) --- */}
            {isAuthenticated() ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 py-1.5 px-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                >
                  <User className="h-6 w-6 text-gray-700" />
                  <span className="text-xs font-black text-gray-800 hidden md:block uppercase tracking-tighter">
                    {displayName}
                  </span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 animate-in fade-in zoom-in duration-150">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-5 py-3 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors uppercase"
                    >
                      Thông tin cá nhân
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-5 py-3 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors uppercase"
                    >
                      Đơn hàng của tôi
                    </Link>
                    <div className="border-t border-gray-50 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-5 py-3 text-xs font-black text-red-600 hover:bg-red-50 transition-colors uppercase"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};