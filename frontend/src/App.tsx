import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from '@/pages/HomePage';
import { ProductListPage } from '@/features/products/pages/ProductListPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { CartPage } from '@/features/cart/components/CartPage';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard';
import { AdminProducts } from '@/features/admin/pages/AdminProducts';
import { AdminOrders } from '@/features/admin/pages/AdminOrders';

// --- THÊM CÁC IMPORT MỚI TẠI ĐÂY ---
import { AdminVouchers } from '@/features/admin/pages/AdminVouchers';
import { AdminUsers } from '@/features/admin/pages/AdminUsers'; // Đảm bảo bạn đã tạo file này

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          
          {/* THÊM 2 ĐƯỜNG DẪN NÀY ĐỂ FIX LỖI SIDEBAR */}
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;