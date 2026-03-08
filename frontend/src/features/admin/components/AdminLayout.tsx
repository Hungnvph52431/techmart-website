import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
// Sử dụng Lucide React để giao diện xịn như các web thương mại điện tử lớn
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Ticket, 
  LogOut, 
  ExternalLink,
  User as UserIcon
} from 'lucide-react';

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
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* --- TOP HEADER --- */}
      <header className="h-16 bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="h-full flex items-center justify-between px-6">
          <Link to="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              TechMart Admin
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <UserIcon size={16} />
              <span className="font-medium">{user.fullName || user.email}</span>
            </div>
            
            <Link to="/" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 text-sm transition-colors">
              <ExternalLink size={16} /> Xem trang web
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 text-sm font-semibold"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* --- SIDEBAR --- */}
        <aside className="w-64 bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto p-4">
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">Chính</p>
            
            <SidebarLink to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/admin')} />
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mt-6 mb-2">Quản lý nội dung</p>
            
            <SidebarLink to="/admin/products" icon={<Package size={20} />} label="Sản phẩm" active={isActive('/admin/products')} />
            <SidebarLink to="/admin/orders" icon={<ShoppingCart size={20} />} label="Đơn hàng" active={isActive('/admin/orders')} />
            <SidebarLink to="/admin/users" icon={<Users size={20} />} label="Người dùng" active={isActive('/admin/users')} />
            
            {/* MỤC VOUCHER */}
            <SidebarLink to="/admin/vouchers" icon={<Ticket size={20} />} label="Quản lý Voucher" active={isActive('/admin/vouchers')} />
          </nav>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Component con để code Sidebar gọn hơn
const SidebarLink = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`}>{icon}</span>
    <span className="font-semibold text-sm">{label}</span>
  </Link>
);