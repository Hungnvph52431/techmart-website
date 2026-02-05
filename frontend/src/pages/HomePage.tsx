import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/features/products/components/ProductCard';
import { productService } from '@/services/product.service';
import { Product } from '@/types';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const data = await productService.getAll({ featured: true });
        setFeaturedProducts(data.slice(0, 8));
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Chào mừng đến với TechMart</h1>
          <p className="text-xl mb-8">
            Điện thoại chính hãng - Giá tốt nhất - Bảo hành uy tín
          </p>
          <Link
            to="/products"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Mua sắm ngay
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Danh mục sản phẩm</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['iPhone', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo'].map((brand) => (
              <Link
                key={brand}
                to={`/products?category=${brand}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
              >
                <div className="text-4xl mb-2">📱</div>
                <h3 className="font-semibold">{brand}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Sản phẩm nổi bật</h2>
            <Link
              to="/products?featured=true"
              className="flex items-center text-primary-600 hover:text-primary-700"
            >
              Xem tất cả
              <ChevronRight className="h-5 w-5 ml-1" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚚</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Giao hàng toàn quốc</h3>
              <p className="text-gray-600">Miễn phí vận chuyển cho đơn hàng trên 5 triệu</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Bảo hành chính hãng</h3>
              <p className="text-gray-600">12 tháng bảo hành đổi mới cho mọi sản phẩm</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Thanh toán linh hoạt</h3>
              <p className="text-gray-600">Hỗ trợ nhiều hình thức thanh toán tiện lợi</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};
