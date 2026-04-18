import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Wallet, X, Flame, UserCircle, Package, LogOut, Shield, Truck, ShieldCheck, Phone, RefreshCw, FileText, BadgeCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCheckoutSessionStore } from '@/store/checkoutSessionStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { productService } from '@/services/product.service';
import { categoryService, type Category } from '@/services/category.service';
import type { Product } from '@/types';

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const Header = () => {
  const navigate = useNavigate();
  // Lấy dữ liệu từ Auth Store (Giữ logic của Khanh)
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const hydrateWishlist = useWishlistStore((state) => state.hydrateWishlist);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  // Lấy dữ liệu từ Cart Store (Tích hợp thêm Mini Cart của Tuấn Anh)
  const { getTotalItems, items, getTotalPrice } = useCartStore();
  const { clearDirectCheckout } = useCheckoutSessionStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
  const authenticated = isAuthenticated();

  // Load categories 1 lần
  useEffect(() => {
    categoryService.getAll().then(setAllCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (authenticated && user?.userId) {
      hydrateWishlist(user.userId).catch(() => {});
      return;
    }

    clearWishlist();
  }, [authenticated, clearWishlist, hydrateWishlist, user?.userId]);

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
    clearWishlist();
    clearAuth();
    navigate('/');
  };

  return (
    <>
      {/* Trust bar - brand blue marquee */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white hidden sm:block overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-8 text-xs gap-4">
            {/* Left: scrolling marquee */}
            <div className="flex-1 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap w-max">
                {[...Array(2)].flatMap((_, dup) => [
                  { icon: <BadgeCheck size={13} className="text-amber-300" />, text: 'Sản phẩm Chính hãng - Xuất VAT đầy đủ' },
                  { icon: <Truck size={13} className="text-cyan-300" />, text: 'Giao nhanh - Miễn phí cho đơn 300K' },
                  { icon: <RefreshCw size={13} className="text-emerald-300" />, text: 'Thu cũ giá ngon - Lên đời tiết kiệm' },
                  { icon: <ShieldCheck size={13} className="text-pink-300" />, text: 'Bảo hành chính hãng 24 tháng' },
                ].map((item, i) => (
                  <span key={`${dup}-${i}`} className="flex items-center gap-1.5 px-5 font-medium">
                    {item.icon}
                    <span>{item.text}</span>
                    <span className="ml-4 text-white/40">•</span>
                  </span>
                )))}
              </div>
            </div>

            {/* Right: fixed links */}
            <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-white/25">
              <Link to="/orders" className="flex items-center gap-1.5 font-medium hover:text-amber-300 transition-colors">
                <FileText size={13} /> Tra cứu đơn hàng
              </Link>
              <span className="text-white/40">|</span>
              <a href="tel:1900xxxx" className="flex items-center gap-1.5 font-semibold hover:text-amber-300 transition-colors">
                <Phone size={13} /> 1900 xxxx
              </a>
            </div>
          </div>
        </div>
      </div>

    <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 h-16">
          {/* Logo with icon */}
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
              <span className="text-white font-black text-lg leading-none">T</span>
            </div>
            <span className="text-xl font-black tracking-tight hidden sm:block">
              <span className="text-blue-600">Tech</span><span className="text-gray-900">Mart</span>
            </span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="flex-1 max-w-2xl hidden md:block relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                placeholder="Bạn đang tìm gì hôm nay?"
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
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
                            <img src={getImageUrl(cat.imageUrl)} alt={cat.name} className="w-10 h-10 object-contain rounded-lg bg-gray-50" />
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
                            src={getImageUrl(product.mainImage)}
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

          {/* Mobile search button */}
          <button
            onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
            className="md:hidden p-2 hover:bg-gray-50 rounded-full transition-colors"
            aria-label="Tìm kiếm"
          >
            <Search className="h-5 w-5 text-gray-700" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">

            {authenticated ? (
              <div className="relative group">
                <Link to="/cart" className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors flex items-center">
                  <ShoppingCart className="h-5 w-5 text-gray-700" />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>

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
                              src={getImageUrl(item.product.mainImage)}
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
                          <button onClick={() => { clearDirectCheckout(); navigate('/checkout'); }} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-xl transition-all">
                            Thanh toán
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Link
                to="/orders"
                className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors flex items-center"
                aria-label="Tra cứu đơn hàng"
                title="Tra cứu đơn hàng"
              >
                <Package className="h-5 w-5 text-gray-700" />
              </Link>
            )}

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 mx-1" />

            {/* --- KHỐI TÀI KHOẢN (USER MENU) --- */}
            {isAuthenticated() ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                >
                  <User className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-semibold text-gray-800 hidden md:block max-w-[140px] truncate">
                    {displayName}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
                    {/* User greeting */}
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                      <p className="text-sm font-black text-gray-800">Xin chào, {displayName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{user?.email}</p>
                    </div>

                    {user?.role === 'shipper' ? (
                      <div className="py-2">
                        <Link
                          to="/shipper/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Trang Shipper
                        </Link>
                        <div className="border-t border-gray-100 mx-4 my-1" />
                      </div>
                    ) : null}
                    {user?.role === 'admin' || user?.role === 'staff' ? (
                      <div className="py-2">
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Trang quản trị
                        </Link>
                        <div className="border-t border-gray-100 mx-4 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full text-left px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Đăng xuất
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Wallet card */}
                        <Link
                          to="/wallet"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block mx-4 mt-4 mb-2 p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                                <Wallet className="h-4 w-4 text-orange-600" />
                              </div>
                              <span className="text-xs font-bold text-orange-700 uppercase">Ví TechMart</span>
                            </div>
                            <span className="text-base font-black text-orange-600">
                              {(user?.walletBalance ?? 0).toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        </Link>

                        {/* Menu items */}
                        <div className="py-2">
                          <Link
                            to="/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <UserCircle className="h-4 w-4 text-gray-400" />
                            Truy cập cá nhân
                          </Link>
                          <Link
                            to="/orders"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Package className="h-4 w-4 text-gray-400" />
                            Đơn hàng của tôi
                          </Link>
                        </div>

                        <div className="border-t border-gray-100 mx-4" />
                        <div className="py-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full text-left px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <form onSubmit={(e) => { handleSearchSubmit(e); setMobileSearchOpen(false); }} className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm kiếm iPhone, Samsung..."
                className="w-full px-4 py-2.5 pl-10 pr-10 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm font-bold"
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={handleSearchClear} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </form>
            <button
              onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }}
              className="text-sm font-bold text-gray-500 px-2 py-2 shrink-0"
            >
              Huỷ
            </button>
          </div>

          {/* Mobile search results */}
          {searchQuery.trim() && (
            <div className="overflow-y-auto max-h-[calc(100vh-60px)]">
              {suggestedCategories.length > 0 && (
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-black text-gray-800">Có phải bạn muốn tìm</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestedCategories.map((cat) => (
                      <button key={cat.categoryId}
                        onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); navigate(`/products?categorySlug=${cat.slug}`); }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                        {cat.imageUrl && <img src={getImageUrl(cat.imageUrl)} alt={cat.name} className="w-10 h-10 object-contain rounded-lg bg-gray-50" />}
                        <span className="text-sm font-bold text-gray-700 line-clamp-1">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {suggestedProducts.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-black text-gray-800">Sản phẩm gợi ý</span>
                  </div>
                  <div className="space-y-1">
                    {suggestedProducts.map((product) => (
                      <button key={product.productId}
                        onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); navigate(`/products/${product.slug || product.productId}`); }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                        <img src={getImageUrl(product.mainImage)} alt={product.name} className="w-12 h-12 object-contain rounded-lg bg-gray-50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 line-clamp-1">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-black text-red-600">{(product.salePrice || product.price).toLocaleString('vi-VN')}đ</span>
                            {product.salePrice && product.salePrice < product.price && (
                              <span className="text-xs text-gray-400 line-through">{product.price.toLocaleString('vi-VN')}đ</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchLoading && suggestedProducts.length === 0 && suggestedCategories.length === 0 && (
                <div className="px-4 py-8 text-center"><p className="text-sm text-gray-400 font-bold">Đang tìm kiếm...</p></div>
              )}

              {!searchLoading && suggestedProducts.length === 0 && suggestedCategories.length === 0 && (
                <div className="px-4 py-8 text-center"><p className="text-sm text-gray-400 font-bold">Không tìm thấy kết quả</p></div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
    </>
  );
};
