// frontend/src/features/products/pages/HomePage.tsx
// THAY THẾ HOÀN TOÀN FILE CŨ

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/features/products/components/ProductCard';
import { productService } from '@/services/product.service';
import { bannerService } from '@/services/banner.service';
import { Product } from '@/types';
import { Banner } from '@/types/banner';
import { 
  ChevronRight, ChevronLeft,
  Zap, Award, Smartphone, Laptop, Tablet, Watch, Headphones 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Feedback } from '@/components/common/Feedback';

// Helper lấy URL ảnh đúng (hỗ trợ cả local upload lẫn URL đầy đủ)
const getImageUrl = (url: string) =>
  url?.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${url}` : url;

// --- HERO BANNER SLIDER (home_slider) ---
const HeroBannerSlider = ({ banners }: { banners: Banner[] }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    // Fallback hardcode nếu chưa có banner trong DB
    return (
      <div className="h-[300px] md:h-[450px] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-[32px] flex items-center px-8 md:px-16 text-white shadow-2xl shadow-blue-100">
        <div>
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            TechMart Exclusive
          </span>
          <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase italic">
            iPhone 15 <br /><span className="text-yellow-400">Pro Max</span>
          </h2>
          <Link to="/products" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-2xl font-black uppercase text-sm">
            Mua ngay
          </Link>
        </div>
      </div>
    );
  }

  const banner = banners[current];

  return (
    <div className="relative rounded-[32px] overflow-hidden shadow-2xl shadow-blue-100 group h-[300px] md:h-[450px]">
      {/* Ảnh banner */}
      <img
        src={getImageUrl(banner.imageUrl)}
        alt={banner.title}
        className="w-full h-full object-cover transition-opacity duration-500"
        onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/900x450/1e40af/ffffff?text=Banner'; }}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center px-8 md:px-16">
        <div className="max-w-md text-white">
          <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase italic leading-tight drop-shadow-lg">
            {banner.title}
          </h2>
          {banner.linkUrl && (
            <Link
              to={banner.linkUrl}
              className="inline-block bg-white text-gray-900 px-10 py-4 rounded-2xl font-black uppercase text-sm hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95"
            >
              Xem ngay
            </Link>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(i => (i - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrent(i => (i + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- SMALL BANNER CARD (home_middle) ---
const SmallBannerCard = ({ banner }: { banner: Banner }) => (
  <Link
    to={banner.linkUrl || '#'}
    className="flex-1 rounded-[28px] overflow-hidden shadow-lg relative group min-h-[160px] block"
  >
    <img
      src={getImageUrl(banner.imageUrl)}
      alt={banner.title}
      className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
      onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x200/7c3aed/ffffff?text=Banner'; }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 p-6 text-white z-10">
      <h3 className="text-xl font-black uppercase italic mb-1 tracking-tight">{banner.title}</h3>
      <span className="text-xs font-black uppercase tracking-widest border-b-2 border-white pb-0.5">Xem chi tiết</span>
    </div>
  </Link>
);

// --- HOMEPAGE ---
export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [sliderBanners, setSliderBanners] = useState<Banner[]>([]);
  const [middleBanners, setMiddleBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featuredData, newestData, sliders, middles] = await Promise.all([
          productService.getAll({ featured: true }),
          productService.getAll({}),
          bannerService.getActive('home_slider'),
          bannerService.getActive('home_middle'),
        ]);

        const featuredList = Array.isArray(featuredData) ? featuredData : ((featuredData as any)?.products || []);
        const newestList = Array.isArray(newestData) ? newestData : ((newestData as any)?.products || []);

        setFeaturedProducts(featuredList.slice(0, 10));
        setNewProducts(newestList.slice(0, 10));
        setSliderBanners(sliders);
        setMiddleBanners(middles);
      } catch (error) {
        console.error('Lỗi tải trang chủ:', error);
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

        {/* --- HERO BANNER SECTION --- */}
        <section className="bg-white py-6 border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* Slider lớn bên trái */}
              <div className="lg:col-span-8">
                <HeroBannerSlider banners={sliderBanners} />
              </div>

              {/* Banner nhỏ bên phải */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {middleBanners.length > 0 ? (
                  middleBanners.slice(0, 2).map(b => <SmallBannerCard key={b.bannerId} banner={b} />)
                ) : (
                  // Fallback nếu chưa có banner middle
                  <>
                    <BannerCardFallback title="Galaxy S24 Ultra" sub="Tặng bộ quà 5 triệu" color="from-orange-500 to-red-600" to="/products/samsung-galaxy-s24-ultra" />
                    <BannerCardFallback title="MacBook Air M3" sub="Hỗ trợ học sinh 15%" color="from-indigo-600 to-purple-700" to="/products/macbook-air-m3" />
                  </>
                )}
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
                    <span className="text-xs font-black text-gray-700 uppercase tracking-tighter group-hover:text-blue-600">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- HOT SALE --- */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-[32px] shadow-xl border border-red-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 p-5 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Zap className="fill-current text-yellow-400 animate-bounce" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider italic">Săn Deal Giá Sốc</h2>
                </div>
              </div>
              <div className="p-8">
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse bg-gray-100 h-80 rounded-[24px]" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {featuredProducts.slice(0, 5).map(product => (
                      <ProductCard key={product.productId} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* --- SẢN PHẨM NỔI BẬT --- */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Award className="text-blue-600 w-10 h-10" />
                <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?featured=true" className="text-blue-600 font-black uppercase text-xs tracking-widest flex items-center gap-1 hover:underline">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* --- MỚI CẬP BẾN --- */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Smartphone className="text-white w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Mới cập bến</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {newProducts.length > 0 ? (
                newProducts.map(product => (
                  <ProductCard key={`new-${product.productId}`} product={product} />
                ))
              ) : (
                <p className="col-span-full text-center text-gray-400 italic">Đang cập nhật sản phẩm mới...</p>
              )}
            </div>
          </div>
        </section>

        {/* --- LỢI ÍCH --- */}
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
      <Feedback/>
      <Faq/>
    </Layout>
  );
};

// --- SUB-COMPONENTS ---
const BannerCardFallback = ({ title, sub, color, to }: any) => (
  <div className={`flex-1 bg-gradient-to-br ${color} rounded-[28px] p-8 text-white flex flex-col justify-center shadow-lg relative overflow-hidden group`}>
    <div className="z-10">
      <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tight">{title}</h3>
      <p className="text-sm opacity-90 font-bold mb-5">{sub}</p>
      <Link to={to} className="text-xs font-black uppercase tracking-widest border-b-2 border-white pb-1">Xem chi tiết</Link>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-150 transition-transform duration-700">
      <Smartphone size={120} />
    </div>
  </div>
);

const BenefitItem = ({ icon, title, sub }: any) => (
  <div className="flex items-center gap-5 p-6 rounded-[24px] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all">
    <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 shadow-sm">{icon}</div>
    <div>
      <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">{title}</h4>
      <p className="text-xs text-gray-400 font-bold">{sub}</p>
    </div>
  </div>
);