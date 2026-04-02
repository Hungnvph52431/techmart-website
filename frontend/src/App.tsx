import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- PAGES CÔNG KHAI ---
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { PolicyPage } from '@/pages/PolicyPage';
import { ShippingPage } from '@/pages/ShippingPage';
import { ReturnPage } from '@/pages/ReturnPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { FAQPage } from '@/pages/FAQPage';
import { ProductListPage } from '@/features/products/pages/ProductListPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { CartPage } from '@/features/cart/pages/CartPage';
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
import { PaymentResultPage } from '@/features/payment/pages/PaymentResultPage';
// --- QUẢN TRỊ (ADMIN) ---
import { AdminReviews } from '@/features/admin/pages/AdminReviews';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard';
import { AdminCategories } from '@/features/admin/pages/AdminCategories';
import { AdminProducts } from '@/features/admin/pages/AdminProducts';
import { AdminProductFormPage } from '@/features/admin/pages/AdminProductFormPage';
import { AdminOrders } from '@/features/admin/pages/AdminOrders';
import { AdminUsers } from '@/features/admin/pages/AdminUsers';
import { AdminAttributes } from '@/features/admin/pages/AdminAttributes';
import { AdminVoucher } from '@/features/admin/pages/AdminVouchers';
import { AdminBrands } from '@/features/admin/pages/AdminBrands';
import { AdminBanners } from '@/features/admin/pages/AdminBanners';
import { AdminOrderDetail } from './features/admin/pages/AdminOrderDetail';
import { AdminReturns } from '@/features/admin/pages/AdminReturns';
import { WalletPage } from '@/features/wallet/pages/WalletPage';
import { AdminWalletTopups } from '@/features/admin/pages/AdminWalletTopups';
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <Routes>
        {/* --- 1. ROUTES CHO NGƯỜI DÙNG --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/return" element={<ReturnPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        {/* Bảo vệ các route cần đăng nhập (Đơn hàng & Profile) */}
        <Route element={<CustomerRouteGuard />}>
          <Route path="/orders" element={<CustomerOrdersLayout />}>
            <Route index element={<OrdersPage />} />
            <Route path=":id" element={<OrderDetailPage />} />
          </Route>

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wallet" element={<WalletPage />} />
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
          <Route path="brands" element={<AdminBrands />} />
          <Route path="vouchers" element={<AdminVoucher />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="returns" element={<AdminReturns />} />
          <Route path="wallet-topups" element={<AdminWalletTopups />} />
        </Route>

        {/* Điều hướng mặc định nếu gõ sai URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;