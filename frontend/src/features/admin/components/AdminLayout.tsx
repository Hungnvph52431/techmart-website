import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useRef, useState } from 'react';
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
  Menu,
  PanelLeftClose,
  Tag,
  Landmark,
  Bell,
} from 'lucide-react';
import { walletService, type AdminWithdrawalNotification } from '@/services/wallet.service';

const ALLOWED_ROLES = ['admin', 'staff', 'warehouse'];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<AdminWithdrawalNotification[]>([]);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isWarehouse = user.role === 'warehouse';
  const unreadNotificationCount = adminNotifications.filter((item) => !item.isRead).length;

  const roleLabel = isAdmin ? 'Admin' : isStaff ? 'Nhân viên' : 'Kho';
  const displayName = user.fullName || user.email;

  const formatNotificationTime = (value: string) =>
    new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;

    const loadNotifications = async (showLoading: boolean = false) => {
      try {
        if (showLoading) setNotificationsLoading(true);
        const items = await walletService.adminListWithdrawalNotifications();
        if (mounted) {
          setAdminNotifications(items);
        }
      } catch {
        if (mounted && showLoading) {
          setAdminNotifications([]);
        }
      } finally {
        if (mounted && showLoading) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications(true);
    const timer = window.setInterval(() => {
      void loadNotifications(false);
    }, 20000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [isAdmin]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  const handleNotificationClick = async (notification: AdminWithdrawalNotification) => {
    if (!notification.isRead) {
      try {
        await walletService.adminMarkWithdrawalNotificationRead(notification.notificationId);
        setAdminNotifications((prev) =>
          prev.map((item) =>
            item.notificationId === notification.notificationId ? { ...item, isRead: true } : item
          )
        );
      } catch {
        // Ignore read-state failure and still navigate to the target request.
      }
    }

    setNotificationsOpen(false);
    navigate(`/admin/wallet-withdrawals?focus=${notification.requestId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* --- TOP HEADER --- */}
      <header className="h-16 bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
              title={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 uppercase italic">
                TechMart Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {isAdmin && (
              <div ref={notificationRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-blue-200 hover:text-blue-600"
                  title="Thông báo yêu cầu rút ví"
                >
                  <Bell size={18} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[380px] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl shadow-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-700">Thông báo rút ví</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {unreadNotificationCount > 0
                            ? `${unreadNotificationCount} thông báo chưa đọc`
                            : 'Không có thông báo mới'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
                      >
                        Đóng
                      </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-2">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm font-bold text-gray-400">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          Đang tải thông báo...
                        </div>
                      ) : adminNotifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell size={28} className="mx-auto text-gray-200" />
                          <p className="mt-3 text-sm font-black text-gray-500">Chưa có yêu cầu rút ví mới</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">
                            Khi khách hàng gửi yêu cầu rút tiền, thông báo sẽ xuất hiện tại đây.
                          </p>
                        </div>
                      ) : (
                        adminNotifications.map((notification) => (
                          <button
                            key={notification.notificationId}
                            onClick={() => handleNotificationClick(notification)}
                            className={`mb-2 w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                              notification.isRead
                                ? 'border-gray-100 bg-white hover:bg-gray-50'
                                : 'border-blue-100 bg-blue-50/70 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-800">{notification.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs font-bold text-gray-500">{notification.message}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  <span>{notification.referenceCode}</span>
                                  <span>•</span>
                                  <span>{formatNotificationTime(notification.createdAt)}</span>
                                </div>
                              </div>
                              {!notification.isRead && (
                                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-5 py-3">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/admin/wallet-withdrawals');
                        }}
                        className="text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                      >
                        Xem tất cả yêu cầu rút ví
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tighter">
              <UserIcon size={14} />
              <span>{displayName}</span>
              <span className="text-gray-400">·</span>
              <span className="text-blue-500">{roleLabel}</span>
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
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-64px)] overflow-hidden transition-all duration-300 ease-in-out`}>
          <nav className={`w-64 p-4 space-y-1 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-3 mt-2">Tổng quan</p>
            <SidebarLink to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" active={isActive('/admin')} />

            {/* Cấu hình — Admin + Staff */}
            {(isAdmin || isStaff) && (<>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-8 mb-3">Cấu hình TechMart</p>
              <SidebarLink to="/admin/categories" icon={<Layers size={18} />} label="Danh mục" active={isActive('/admin/categories')} />
              <SidebarLink to="/admin/brands" icon={<Tag size={18} />} label="Thương hiệu" active={isActive('/admin/brands')} />
              {isAdmin && <SidebarLink to="/admin/attributes" icon={<Settings2 size={18} />} label="Thuộc tính" active={isActive('/admin/attributes')} />}
            </>)}

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mt-8 mb-3">Quản lý bán hàng</p>

            {/* Sản phẩm — Admin + Warehouse */}
            {(isAdmin || isWarehouse) && <SidebarLink to="/admin/products" icon={<Package size={18} />} label="Sản phẩm" active={isActive('/admin/products')} />}

            {/* Đơn hàng — tất cả */}
            <SidebarLink to="/admin/orders" icon={<ShoppingCart size={18} />} label="Đơn hàng" active={isActive('/admin/orders')} />

            {/* Khách hàng — Admin + Staff */}
            {(isAdmin || isStaff) && <SidebarLink to="/admin/users" icon={<Users size={18} />} label="Khách hàng" active={isActive('/admin/users')} />}

            {/* Đánh giá & Hoàn trả — Admin + Staff */}
            {(isAdmin || isStaff) && <>
              <SidebarLink to="/admin/reviews" icon={<Star size={18} />} label="Đánh giá" active={isActive('/admin/reviews')} />
              <SidebarLink to="/admin/returns" icon={<RotateCcw size={18} />} label="Hoàn/Trả hàng" active={isActive('/admin/returns')} />
            </>}

            {/* Admin only */}
            {isAdmin && <>
              <SidebarLink to="/admin/vouchers" icon={<Ticket size={18} />} label="Mã giảm giá" active={isActive('/admin/vouchers')} />
              <SidebarLink to="/admin/banners" icon={<Image size={18} />} label="Banner" active={isActive('/admin/banners')} />
              <SidebarLink to="/admin/wallet-topups" icon={<Wallet size={18} />} label="Lịch sử nạp ví" active={isActive('/admin/wallet-topups')} />
              <SidebarLink to="/admin/wallet-withdrawals" icon={<Landmark size={18} />} label="Yêu cầu rút ví" active={isActive('/admin/wallet-withdrawals')} />
            </>}
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
