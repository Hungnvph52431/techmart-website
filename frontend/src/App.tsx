import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- PAGES CÔNG KHAI ---
import { HomePage } from '@/pages/HomePage';
import { ProductListPage } from '@/features/products/pages/ProductListPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { CartPage } from '@/features/cart/components/CartPage';
import { CheckoutPage } from '@/features/orders/pages/CheckoutPage';

// --- AUTH & ACCOUNT ---
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage'; //
import { ProfilePage } from '@/features/account/pages/ProfilePage'; //

// --- HỆ THỐNG ĐƠN HÀNG (KHÁCH HÀNG) ---
import { CustomerRouteGuard } from '@/features/orders/components/CustomerRouteGuard';
import { CustomerOrdersLayout } from '@/features/orders/components/CustomerOrdersLayout';
import { OrdersPage } from '@/features/orders/pages/OrdersPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';

// --- QUẢN TRỊ (ADMIN) ---
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard';
import { AdminCategories } from '@/features/admin/pages/AdminCategories';
import { AdminProducts } from '@/features/admin/pages/AdminProducts';
import { AdminProductFormPage } from '@/features/admin/pages/AdminProductFormPage';
import { AdminOrders } from '@/features/admin/pages/AdminOrders';
import { AdminUsers } from '@/features/admin/pages/AdminUsers';
import { AdminAttributes } from '@/features/admin/pages/AdminAttributes';
import { AdminVoucher } from '@/features/admin/pages/AdminVouchers';
import { AdminBanners } from '@/features/admin/pages/AdminBanners';
import { AdminOrderDetail } from './features/admin/pages/AdminOrderDetail';
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <Routes>
        {/* --- 1. ROUTES CHO NGƯỜI DÙNG --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Bảo vệ các route cần đăng nhập (Đơn hàng & Profile) */}
        <Route element={<CustomerRouteGuard />}>
          <Route path="/orders" element={<CustomerOrdersLayout />}>
            <Route index element={<OrdersPage />} />
            <Route path=":id" element={<OrderDetailPage />} />
          </Route>
          
          {/* Khanh ưu tiên chuyển Profile về trang Đơn hàng */}
          {/* Nếu muốn dùng trang Profile của Tuấn Anh, hãy đổi Navigate thành <ProfilePage /> */}
          <Route path="/profile" element={<ProfilePage />} /> 
        </Route>

        {/* --- 2. ROUTES CHO ADMIN --- */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="attributes" element={<AdminAttributes />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="banners" element={<AdminBanners />} />
          
          
          {/* Chốt dùng AdminProductFormPage cho đồng bộ */}
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/edit/:id" element={<AdminProductFormPage />} />          
          <Route path="orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vouchers" element={<AdminVoucher />} />
        </Route>

        {/* Điều hướng mặc định nếu gõ sai URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;