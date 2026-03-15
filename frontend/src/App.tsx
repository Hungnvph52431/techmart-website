import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { AdminUsers } from '@/features/admin/pages/AdminUsers';
import { AdminCategories } from '@/features/admin/pages/AdminCategories';
import { AdminAttributes } from '@/features/admin/pages/AdminAttributes';
import { AdminProductFormPage } from '@/features/admin/pages/AdminProductFormPage';
import { CustomerRouteGuard } from '@/features/orders/components/CustomerRouteGuard';
import { CustomerOrdersLayout } from '@/features/orders/components/CustomerOrdersLayout';
import { OrdersPage } from '@/features/orders/pages/OrdersPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
import { AdminVoucher} from '@/features/admin/pages/AdminVouchers';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />

        <Route element={<CustomerRouteGuard />}>
          <Route path="/orders" element={<CustomerOrdersLayout />}>
            <Route index element={<OrdersPage />} />
            <Route path=":id" element={<OrderDetailPage />} />
          </Route>
          <Route path="/profile" element={<Navigate to="/orders" replace />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="attributes" element={<AdminAttributes />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vouchers" element={<AdminVoucher />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;