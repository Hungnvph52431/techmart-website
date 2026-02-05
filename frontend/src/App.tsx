import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from '@/pages/HomePage';
import { ProductListPage } from '@/features/products/pages/ProductListPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { CartPage } from '@/features/cart/components/CartPage';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </Router>
  );
}

export default App;
