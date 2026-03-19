import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Wallet, X, Flame } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { productService } from '@/services/product.service';
import { categoryService, type Category } from '@/services/category.service';
import type { Product } from '@/types';

export const Header = () => {
  const navigate = useNavigate();
  // Lấy dữ liệu từ Auth Store (Giữ logic của Khanh)
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  
  // Lấy dữ liệu từ Cart Store (Tích hợp thêm Mini Cart của Tuấn Anh)
  const { getTotalItems, items, getTotalPrice } = useCartStore();
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // SỬA LỖI 2339: Ưu tiên fullName
  const displayName = user?.fullName || user?.email || 'Tài khoản';

  // Load categories 1 lần
  useEffect(() => {
    categoryService.getAll().then(setAllCategories).catch(() => {});
  }, []);

  // Logic đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!value.trim()) {
      setSuggestedProducts([]);
      setSuggestedCategories([]);
      setSearchOpen(false);
      return;
    }

    setSearchOpen(true);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const keyword = value.trim().toLowerCase();
        // Lọc category theo tên
        const matchedCats = allCategories.filter(c =>
          c.name.toLowerCase().includes(keyword)
        ).slice(0, 5);
        setSuggestedCategories(matchedCats);

        // Gọi API search sản phẩm
        const result = await productService.getAll({ search: value.trim(), limit: 6 });
        const products = Array.isArray(result) ? result : result.products || result.data || [];
        setSuggestedProducts(products.slice(0, 6));
      } catch {
        setSuggestedProducts([]);
        setSuggestedCategories([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [allCategories]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSuggestedProducts([]);
    setSuggestedCategories([]);
    setSearchOpen(false);
    inputRef.current?.focus();
  };

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
          <div ref={searchRef} className="flex-1 max-w-xl mx-8 hidden md:block relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                placeholder="Tìm kiếm iPhone, Samsung..."
                className="w-full px-4 py-2 pl-10 pr-10 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm font-bold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </form>

            {/* Search Dropdown */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[70vh] overflow-y-auto">

                {/* Gợi ý danh mục */}
                {suggestedCategories.length > 0 && (
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-black text-gray-800">Có phải bạn muốn tìm</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedCategories.map((cat) => (
                        <button
                          key={cat.categoryId}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            navigate(`/products?categorySlug=${cat.slug}`);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all text-left"
                        >
                          {cat.imageUrl && (
                            <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 object-contain rounded-lg bg-gray-50" />
                          )}
                          <span className="text-sm font-bold text-gray-700 line-clamp-1">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sản phẩm gợi ý */}
                {suggestedProducts.length > 0 && (
                  <div className="px-4 pt-3 pb-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-black text-gray-800">Sản phẩm gợi ý</span>
                    </div>
                    <div className="space-y-1">
                      {suggestedProducts.map((product) => (
                        <button
                          key={product.productId}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            navigate(`/products/${product.slug || product.productId}`);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all text-left"
                        >
                          <img
                            src={product.mainImage || '/placeholder.jpg'}
                            alt={product.name}
                            className="w-12 h-12 object-contain rounded-lg bg-gray-50 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 line-clamp-1">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-black text-red-600">
                                {(product.salePrice || product.price).toLocaleString('vi-VN')}đ
                              </span>
                              {product.salePrice && product.salePrice < product.price && (
                                <span className="text-xs text-gray-400 line-through">
                                  {product.price.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading */}
                {searchLoading && suggestedProducts.length === 0 && suggestedCategories.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400 font-bold">Đang tìm kiếm...</p>
                  </div>
                )}

                {/* Không có kết quả */}
                {!searchLoading && suggestedProducts.length === 0 && suggestedCategories.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400 font-bold">Không tìm thấy kết quả</p>
                  </div>
                )}

                {/* Xem tất cả */}
                {suggestedProducts.length > 0 && (
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all border-t border-gray-100 text-center"
                  >
                    Xem tất cả kết quả cho "{searchQuery}"
                  </button>
                )}
              </div>
            )}
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
                    {user?.role === 'admin' || user?.role === 'staff' || user?.role === 'warehouse' ? (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-5 py-3 text-xs font-bold text-blue-700 hover:bg-blue-50 hover:text-blue-600 transition-colors uppercase"
                        >
                          Trang quản trị
                        </Link>
                        <div className="border-t border-gray-50 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-5 py-3 text-xs font-black text-red-600 hover:bg-red-50 transition-colors uppercase"
                        >
                          Đăng xuất
                        </button>
                      </>
                    ) : (
                      <>
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
                        <Link
                          to="/wallet"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center justify-between px-5 py-3 text-xs font-bold text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <span className="flex items-center gap-2 uppercase">
                            <Wallet className="h-3.5 w-3.5" />
                            Ví TechMart
                          </span>
                          <span className="font-black">
                            {(user?.walletBalance ?? 0).toLocaleString('vi-VN')}₫
                          </span>
                        </Link>
                        <div className="border-t border-gray-50 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-5 py-3 text-xs font-black text-red-600 hover:bg-red-50 transition-colors uppercase"
                        >
                          Đăng xuất
                        </button>
                      </>
                    )}
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