import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/features/products/components/ProductCard';
import { productService } from '@/services/product.service'; //
import { Product } from '@/types'; //
import { 
  ChevronRight, 
  Zap, 
  Award, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Watch, 
  Headphones 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]); // Biến gây lỗi
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Gọi đồng thời 2 API để tối ưu tốc độ
        const [featuredData, newestData] = await Promise.all([
          productService.getAll({ featured: true }),
          productService.getAll({}),
        ]);

        // Xử lý an toàn cho cấu trúc dữ liệu Backend
        const featuredList = Array.isArray(featuredData) ? featuredData : ((featuredData as any)?.products || []);
        const newestList = Array.isArray(newestData) ? newestData : ((newestData as any)?.products || []);

        setFeaturedProducts(featuredList.slice(0, 10));
        setNewProducts(newestList.slice(0, 10));
      } catch (error) {
        console.error('Lỗi tải dữ liệu trang chủ:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cấu hình danh mục icon
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
        
        {/* --- HERO SECTION: BANNER QUẢNG CÁO --- */}
        <section className="bg-white py-6 border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 rounded-[32px] overflow-hidden shadow-2xl shadow-blue-100 relative group">
                <div className="h-[300px] md:h-[450px] bg-gradient-to-br from-blue-700 via-primary-600 to-indigo-800 flex items-center justify-between px-8 md:px-16 text-white relative">
                  <div className="max-w-md z-10">
                    <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                      TechMart Exclusive
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black mb-4 leading-none uppercase italic tracking-tighter">
                      iPhone 15 <br />
                      <span className="text-yellow-400">Pro Max</span>
                    </h2>
                    <p className="text-lg opacity-80 mb-8 font-medium hidden md:block">
                      Giảm thêm 2 triệu khi thu cũ đổi mới. <br /> Trả góp 0% lãi suất.
                    </p>
                    <Link
                      to="/products/iphone-15-pro-max"
                      className="inline-block bg-white text-primary-600 px-10 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95"
                    >
                      Mua ngay
                    </Link>
                  </div>
                  {/* Ảnh sản phẩm Banner */}
                  <div className="hidden lg:block transform transition-transform group-hover:scale-110 duration-700">
                    <img 
                      src="/images/products/iphone-15-pro-max-1.jpg" 
                      alt="iPhone 15 Pro Max" 
                      className="h-96 w-auto object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"
                      onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x600/transparent/white?text=iPhone+15')}
                    />
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-4 flex flex-col gap-4">
                <BannerCard title="Galaxy S24 Ultra" sub="Tặng bộ quà 5 triệu" color="from-orange-500 to-red-600" to="/products/samsung-galaxy-s24-ultra" />
                <BannerCard title="MacBook Air M3" sub="Hỗ trợ học sinh 15%" color="from-indigo-600 to-purple-700" to="/products/macbook-air-m3" />
              </div>
            </div>
          </div>
        </section>

        {/* --- DANH MỤC ICON --- */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-8">
                {categories.map((cat) => (
                  <Link key={cat.name} to={cat.path} className="flex flex-col items-center group">
                    <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center mb-3 transition-all transform group-hover:-translate-y-2 group-hover:shadow-xl`}>
                      {cat.icon}
                    </div>
                    <span className="text-xs font-black text-gray-700 uppercase tracking-tighter group-hover:text-primary-600">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- HOT SALE: DEAL GIÁ SỐC --- */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-[32px] shadow-xl border border-red-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 p-5 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Zap className="fill-current text-yellow-400 animate-bounce" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider italic">Săn Deal Giá Sốc</h2>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-xs font-black opacity-80 uppercase tracking-widest">Kết thúc sau:</span>
                  <div className="flex gap-2 font-mono text-2xl font-black">
                    <span className="bg-white/20 px-3 py-1 rounded-xl">02</span>:
                    <span className="bg-white/20 px-3 py-1 rounded-xl">15</span>:
                    <span className="bg-white/20 px-3 py-1 rounded-xl">45</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse bg-gray-100 h-80 rounded-[24px]"></div>)}
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

        {/* --- FEATURED PRODUCTS --- */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Award className="text-primary-600 w-10 h-10" />
                <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?featured=true" className="text-primary-600 font-black uppercase text-xs tracking-widest flex items-center gap-1 hover:underline">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* --- DỊCH VỤ / LỢI ÍCH --- */}
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <BenefitItem icon={<Zap />} title="Giao hỏa tốc 2h" sub="Nội thành Ha Long & HN" />
              <BenefitItem icon={<Award />} title="Bảo hành 24 tháng" sub="Chính hãng 100%" />
              <BenefitItem icon={<Smartphone />} title="Thu cũ đổi mới" sub="Trợ giá tới 2 triệu" />
              <BenefitItem icon={<Zap />} title="Trả góp 0%" sub="Duyệt hồ sơ 15 phút" />
            </div>
          </div>
        </section>
      </div>
      {/* --- SECTION 1: SẢN PHẨM NỔI BẬT --- */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Award className="text-primary-600 w-10 h-10" />
                <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?featured=true" className="text-primary-600 font-black uppercase text-xs tracking-widest flex items-center gap-1 hover:underline">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 2: SẢN PHẨM MỚI VỀ (SỬA LỖI 6133) --- */}
        {/* Sử dụng biến newProducts tại đây để dập tắt cảnh báo TypeScript */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                   <Smartphone className="text-white w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Mới cập bến</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {newProducts.length > 0 ? (
                newProducts.map((product) => (
                  <ProductCard key={`new-${product.productId}`} product={product} />
                ))
              ) : (
                <p className="col-span-full text-center text-gray-400 italic">Đang cập nhật sản phẩm mới...</p>
              )}
            </div>
          </div>
        </section>

        {/* --- DỊCH VỤ / LỢI ÍCH --- */}
        {/* ... (giữ nguyên phần BenefitItem bên dưới) */}
    </Layout>
  );
};

// --- SUB-COMPONENTS ---
const BannerCard = ({ title, sub, color, to }: any) => (
  <div className={`flex-1 bg-gradient-to-br ${color} rounded-[28px] p-8 text-white flex flex-col justify-center shadow-lg relative overflow-hidden group`}>
    <div className="z-10">
      <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tight">{title}</h3>
      <p className="text-sm opacity-90 font-bold mb-5">{sub}</p>
      <Link to={to} className="text-xs font-black uppercase tracking-widest border-b-2 border-white pb-1 hover:opacity-70 transition-opacity">Xem chi tiết</Link>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-150 transition-transform duration-700">
       <Smartphone size={120} />
    </div>
  </div>
);

const BenefitItem = ({ icon, title, sub }: any) => (
  <div className="flex items-center gap-5 p-6 rounded-[24px] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all">
    <div className="bg-primary-100 p-4 rounded-2xl text-primary-600 shadow-sm">{icon}</div>
    <div>
      <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{title}</h4>
      <p className="text-xs text-gray-400 font-bold">{sub}</p>
    </div>
  </div>
);