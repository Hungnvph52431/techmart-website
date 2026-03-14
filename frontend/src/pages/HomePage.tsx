import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/features/products/components/ProductCard';
import { productService } from '@/services/product.service';
import { Product } from '@/types';
import { ChevronRight, Zap, Award, Smartphone, Laptop, Tablet, Watch, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featured, newest] = await Promise.all([
          productService.getAll({ featured: true }),
          productService.getAll({}), // Assuming latest products by default or can filter
        ]);
        setFeaturedProducts(featured.slice(0, 10));
        setNewProducts(newest.slice(0, 10));
      } catch (error) {
        console.error('Error fetching home page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = [
    { name: 'iPhone', icon: <Smartphone className="w-8 h-8" />, path: '/products?category=iPhone', color: 'bg-blue-50 text-blue-600' },
    { name: 'Samsung', icon: <Smartphone className="w-8 h-8" />, path: '/products?category=Samsung', color: 'bg-orange-50 text-orange-600' },
    { name: 'Xiaomi', icon: <Smartphone className="w-8 h-8" />, path: '/products?category=Xiaomi', color: 'bg-orange-50 text-orange-600' },
    { name: 'Laptop', icon: <Laptop className="w-8 h-8" />, path: '/products?category=Laptop', color: 'bg-purple-50 text-purple-600' },
    { name: 'Tablet', icon: <Tablet className="w-8 h-8" />, path: '/products?category=Tablet', color: 'bg-green-50 text-green-600' },
    { name: 'Smartwatch', icon: <Watch className="w-8 h-8" />, path: '/products?category=Watch', color: 'bg-red-50 text-red-600' },
    { name: 'Phụ kiện', icon: <Headphones className="w-8 h-8" />, path: '/products?category=Accessory', color: 'bg-yellow-50 text-yellow-600' },
  ];

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Hero Section - FPT Shop Style */}
        <section className="bg-white py-4 border-b">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Main Banner */}
              <div className="lg:col-span-8 rounded-xl overflow-hidden shadow-sm relative group">
                <div className="h-[300px] md:h-[400px] bg-gradient-to-r from-blue-600 to-primary-700 flex items-center justify-between px-8 md:px-16 text-white">
                  <div className="max-w-md z-10">
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
                      Khuyến mãi tháng 3
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                      iPhone 15 Pro Max <br />
                      <span className="text-yellow-400">Giá Sốc Cuối Tuần</span>
                    </h2>
                    <p className="text-lg opacity-90 mb-8 hidden md:block">
                      Giảm thêm 2 triệu khi thu cũ đổi mới. Trả góp 0% lãi suất.
                    </p>
                    <Link
                      to="/products/iphone-15-pro-max"
                      className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all transform hover:-translate-y-1"
                    >
                      Mua ngay
                    </Link>
                  </div>
                  <div className="hidden md:block transform transition-transform group-hover:scale-105 duration-500">
                    <img 
                      src="/images/products/iphone-15-pro-max-1.jpg" 
                      alt="iPhone 15 Pro Max" 
                      className="h-80 w-auto object-contain drop-shadow-2xl"
                      onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400/transparent/white?text=iPhone+15')}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sidebar Banners */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="flex-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-6 text-white flex flex-col justify-center shadow-sm">
                  <h3 className="text-xl font-bold mb-2">Galaxy S24 Ultra</h3>
                  <p className="text-sm opacity-90 mb-4">Nhận ngay bộ quà 5 triệu</p>
                  <Link to="/products/samsung-galaxy-s24-ultra" className="text-sm font-bold underline">Xem chi tiết</Link>
                </div>
                <div className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white flex flex-col justify-center shadow-sm">
                  <h3 className="text-xl font-bold mb-2">MacBook Air M2</h3>
                  <p className="text-sm opacity-90 mb-4">Ưu đãi học sinh, sinh viên</p>
                  <Link to="/products/macbook-air-m2" className="text-sm font-bold underline">Sắm ngay</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6">
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={cat.path}
                    className="flex flex-col items-center group"
                  >
                    <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center mb-3 transition-all transform group-hover:-translate-y-2 group-hover:shadow-md`}>
                      {cat.icon}
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-primary-600">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hot Sale Section */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Zap className="fill-current text-yellow-400" />
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider italic">Săn Deal Giá Sốc</h2>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm font-medium opacity-80 uppercase">Kết thúc sau:</span>
                  <div className="flex gap-2 font-mono text-xl font-bold">
                    <span className="bg-white/20 px-2 rounded">02</span>:
                    <span className="bg-white/20 px-2 rounded">15</span>:
                    <span className="bg-white/20 px-2 rounded">45</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse bg-gray-100 h-64 rounded-xl"></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {featuredProducts.slice(0, 5).map((product) => (
                      <ProductCard key={product.productId} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Brands / Highlights */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Award className="text-primary-600 w-8 h-8" />
                <h2 className="text-2xl font-bold text-gray-800">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?featured=true" className="text-primary-600 font-semibold flex items-center gap-1 hover:underline">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} className="animate-pulse bg-gray-100 h-80 rounded-xl"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.productId} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Services / Benefits */}
        <section className="py-12 border-t">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-50">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Giao hàng 2h</h4>
                  <p className="text-xs text-gray-500">Tại các thành phố lớn</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-50">
                <div className="bg-green-100 p-3 rounded-full text-green-600">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Bảo hành 24 tháng</h4>
                  <p className="text-xs text-gray-500">Chính hãng 100%</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-50">
                <div className="bg-red-100 p-3 rounded-full text-red-600">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Thu cũ đổi mới</h4>
                  <p className="text-xs text-gray-500">Trợ giá lên đến 2 triệu</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-50">
                <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Trả góp 0%</h4>
                  <p className="text-xs text-gray-500">Xét duyệt nhanh chóng</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

