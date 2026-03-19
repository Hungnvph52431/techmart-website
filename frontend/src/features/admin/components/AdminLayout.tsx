import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { 
  LayoutDashboard,
  Image,
  Package,
  ShoppingCart,
  Users,
  Ticket,
  LogOut,
  ExternalLink,
  User as UserIcon,
  Layers,
  Settings2,
  Star,
  RotateCcw,
  Wallet,
} from 'lucide-react';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  // Kiểm tra quyền truy cập Admin
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
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  if (!user || user.role !== 'admin') return null;

  // FIX LỖI 2339: Sử dụng fullName từ Store
  const displayName = user.fullName || user.email;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* --- TOP HEADER --- */}
      <header className="h-16 bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="h-full flex items-center justify-between px-6">
          <Link to="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 uppercase italic">
              TechMart Admin
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tighter">
              <UserIcon size={14} />
              <span>{displayName}</span>
            </div>
            
            <Link to="/" className="text-gray-400 hover:text-blue-600 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors">
              <ExternalLink size={14} /> Xem Store
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 text-[10px] font-black uppercase tracking-widest"
            >
              <LogOut size={14} /> Thoát
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* --- SIDEBAR (PHÂN LOẠI CHUYÊN NGHIỆP) --- */}
        <aside className="w-64 bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto p-4">
          <nav className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-3 mt-2">Tổng quan</p>
            <SidebarLink to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" active={isActive('/admin')} />
            
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-8 mb-3">Cấu hình TechMart</p>
            <SidebarLink to="/admin/categories" icon={<Layers size={18} />} label="Danh mục" active={isActive('/admin/categories')} />
            <SidebarLink to="/admin/attributes" icon={<Settings2 size={18} />} label="Thuộc tính" active={isActive('/admin/attributes')} />

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-8 mb-3">Quản lý bán hàng</p>
            <SidebarLink to="/admin/products" icon={<Package size={18} />} label="Sản phẩm" active={isActive('/admin/products')} />
            <SidebarLink to="/admin/orders" icon={<ShoppingCart size={18} />} label="Đơn hàng" active={isActive('/admin/orders')} />
            <SidebarLink to="/admin/users" icon={<Users size={18} />} label="Khách hàng" active={isActive('/admin/users')} />
            
            {/* Tích hợp Voucher từ bản của Khanh */}
            <SidebarLink to="/admin/vouchers" icon={<Ticket size={18} />} label="Mã giảm giá" active={isActive('/admin/vouchers')} />
            <SidebarLink to="/admin/banners" icon={<Image size={18} />} label="Banner" active={isActive('/admin/banners')} />
            <SidebarLink to="/admin/reviews" icon={<Star size={18} />} label="Đánh giá" active={isActive('/admin/reviews')} />
            <SidebarLink to="/admin/returns" icon={<RotateCcw size={18} />} label="Hoàn/Trả hàng" active={isActive('/admin/returns')} />
            <SidebarLink to="/admin/wallet-topups" icon={<Wallet size={18} />} label="Lịch sử nạp ví" active={isActive('/admin/wallet-topups')} />
          </nav>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Component con SidebarLink để tái sử dụng logic giao diện
const SidebarLink = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group mb-1 ${
      active
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
        : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`}>{icon}</span>
    <span className="font-bold text-xs uppercase tracking-tight">{label}</span>
  </Link>
);