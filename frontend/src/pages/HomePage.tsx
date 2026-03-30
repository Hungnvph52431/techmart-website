import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/features/products/components/ProductCard';
import { productService } from '@/services/product.service';
import { bannerService } from '@/services/banner.service';
import { categoryService, type Category } from '@/services/category.service';
import { brandService, type Brand } from '@/services/brand.service';
import { Product } from '@/types';
import { Banner } from '@/types/banner';
import {
  ChevronRight, ChevronLeft,
  Zap, Award, Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const getImageUrl = (url: string) =>
  url?.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${url}` : url;

const CATEGORY_COLORS: string[] = [
  'bg-blue-50 text-blue-600',
  'bg-orange-50 text-orange-600',
  'bg-purple-50 text-purple-600',
  'bg-green-50 text-green-600',
  'bg-red-50 text-red-600',
  'bg-yellow-50 text-yellow-600',
  'bg-pink-50 text-pink-600',
  'bg-cyan-50 text-cyan-600',
  'bg-indigo-50 text-indigo-600',
  'bg-teal-50 text-teal-600',
];

// --- HERO BANNER SLIDER ---
const HeroBannerSlider = ({ banners }: { banners: Banner[] }) => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length > 1) {
      timerRef.current = setInterval(() => goTo((c: number) => (c + 1) % banners.length), 5000);
    }
  }, [banners.length]);

  const goTo = useCallback((next: number | ((c: number) => number)) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(prev => typeof next === 'function' ? next(prev) : next);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  useEffect(() => { resetTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [resetTimer]);

  const handlePrev = () => { goTo((c: number) => (c - 1 + banners.length) % banners.length); resetTimer(); };
  const handleNext = () => { goTo((c: number) => (c + 1) % banners.length); resetTimer(); };
  const handleDot = (i: number) => { goTo(i); resetTimer(); };

  if (banners.length === 0) {
    return (
      <div className="h-[300px] md:h-[420px] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-2xl flex items-center px-8 md:px-16 text-white">
        <div>
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-bold mb-4">TechMart Exclusive</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">iPhone 15 <br /><span className="text-yellow-400">Pro Max</span></h2>
          <Link to="/products" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">Mua ngay</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden group h-[300px] md:h-[420px]">
      {/* Slide track */}
      <div className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ width: `${banners.length * 100}%`, transform: `translateX(-${current * (100 / banners.length)}%)` }}>
        {banners.map((banner, i) => (
          <div key={banner.bannerId || i} className="relative h-full shrink-0" style={{ width: `${100 / banners.length}%` }}>
            <img src={getImageUrl(banner.imageUrl)} alt={banner.title}
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/900x420/1e40af/ffffff?text=Banner'; }} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center px-8 md:px-14">
              <div className="max-w-md text-white">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg">{banner.title}</h2>
                {banner.linkUrl && (
                  <Link to={banner.linkUrl}
                    className="inline-block bg-white text-gray-900 px-8 py-3 rounded-xl font-bold text-sm hover:shadow-xl transition-all">
                    Xem ngay
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <button onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
            <ChevronLeft size={22} />
          </button>
          <button onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => handleDot(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-7 shadow-lg' : 'bg-white/40 w-2 hover:bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- SMALL BANNER CARD ---
const SmallBannerCard = ({ banner }: { banner: Banner }) => (
  <Link to={banner.linkUrl || '#'}
    className="flex-1 rounded-2xl overflow-hidden relative group min-h-[140px] block">
    <img src={getImageUrl(banner.imageUrl)} alt={banner.title}
      className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
      onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x200/7c3aed/ffffff?text=Banner'; }} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 p-5 text-white z-10">
      <h3 className="text-lg font-bold mb-1">{banner.title}</h3>
      <span className="text-xs font-semibold border-b border-white pb-0.5">Xem chi tiết</span>
    </div>
  </Link>
);

// --- PRODUCT SCROLL ROW (giống CellphoneS) ---
const ProductRow = ({ products, loading }: { products: Product[]; loading: boolean }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse bg-gray-100 h-72 rounded-2xl" />)}
      </div>
    );
  }
  if (products.length === 0) return <p className="text-center text-gray-400 py-8">Đang cập nhật...</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {products.map(p => <ProductCard key={p.productId} product={p} />)}
    </div>
  );
};

// --- HOMEPAGE ---
export const HomePage = () => {
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestsellerProducts, setBestsellerProducts] = useState<Product[]>([]);
  const [sliderBanners, setSliderBanners] = useState<Banner[]>([]);
  const [middleBanners, setMiddleBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dealData, featuredData, newData, bestsellerData, sliders, middles, cats, brds] = await Promise.all([
          productService.getAll({ onSale: true, limit: 10 }),
          productService.getAll({ isFeatured: true, limit: 10 }),
          productService.getAll({ isNew: true, limit: 10 }),
          productService.getAll({ isBestseller: true, limit: 10 }),
          bannerService.getActive('home_slider'),
          bannerService.getActive('home_middle'),
          categoryService.getAll(),
          brandService.getAll(),
        ]);

        const toList = (data: any) => Array.isArray(data) ? data : (data?.products || []);

        setDealProducts(toList(dealData).slice(0, 10));
        setFeaturedProducts(toList(featuredData).slice(0, 10));
        setNewProducts(toList(newData).slice(0, 10));
        setBestsellerProducts(toList(bestsellerData).slice(0, 10));
        setSliderBanners(sliders);
        setMiddleBanners(middles);
        setCategories((cats || []).filter((c: Category) => c.isActive && c.slug !== 'khong-xac-dinh'));
        setBrands((brds || []).filter((b: Brand) => b.isActive));
      } catch (error) {
        console.error('Lỗi tải trang chủ:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lấy danh mục cha (parentId = null) để hiện icon grid
  const parentCategories = categories.filter(c => !c.parentId);

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">

        {/* ── HERO BANNER ── */}
        <section className="bg-white py-4 border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8">
                <HeroBannerSlider banners={sliderBanners} />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                {middleBanners.length > 0 ? (
                  middleBanners.slice(0, 2).map(b => <SmallBannerCard key={b.bannerId} banner={b} />)
                ) : (
                  <>
                    <div className="flex-1 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white flex flex-col justify-center">
                      <h3 className="text-xl font-bold mb-1">Galaxy S24 Ultra</h3>
                      <p className="text-sm opacity-90 mb-3">Tặng bộ quà 5 triệu</p>
                      <Link to="/products" className="text-xs font-semibold border-b border-white self-start pb-0.5">Xem chi tiết</Link>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white flex flex-col justify-center">
                      <h3 className="text-xl font-bold mb-1">MacBook Air M3</h3>
                      <p className="text-sm opacity-90 mb-3">Ưu đãi học sinh 15%</p>
                      <Link to="/products" className="text-xs font-semibold border-b border-white self-start pb-0.5">Xem chi tiết</Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── DANH MỤC + THƯƠNG HIỆU ── */}
        <section className="py-5">
          <div className="container mx-auto px-4">
            <div className="bg-white px-6 py-5 rounded-2xl border border-gray-100 space-y-4">
              {/* Danh mục */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Danh mục:</span>
                {parentCategories.map((cat, idx) => (
                  <Link key={cat.categoryId} to={`/products?category=${cat.slug}`}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-md ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} border border-transparent hover:border-current`}>
                    {cat.name}
                  </Link>
                ))}
              </div>

              {/* Thương hiệu */}
              {brands.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Thương hiệu:</span>
                  {brands.map(b => (
                    <Link key={b.brandId} to={`/products?brand=${b.slug}`}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                      {b.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SĂN DEAL GIÁ SỐC — SP đang giảm giá (onSale) ── */}
        {(loading || dealProducts.length > 0) && (
        <section className="py-4">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Zap className="fill-current text-yellow-400" size={22} />
                  <h2 className="text-xl font-extrabold uppercase tracking-wide">Săn Deal Giá Sốc</h2>
                </div>
                <Link to="/products?onSale=true" className="text-white/80 font-semibold text-sm flex items-center gap-0.5 hover:text-white">
                  Xem tất cả <ChevronRight size={16} />
                </Link>
              </div>
              <div className="p-5">
                <ProductRow products={dealProducts} loading={loading} />
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── SẢN PHẨM NỔI BẬT — is_featured ── */}
        {(loading || featuredProducts.length > 0) && (
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Award className="text-blue-600" size={22} />
                <h2 className="text-xl font-extrabold text-gray-800">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?isFeatured=true" className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>
            <ProductRow products={featuredProducts} loading={loading} />
          </div>
        </section>
        )}

        {/* ── BÁN CHẠY — is_bestseller ── */}
        {(loading || bestsellerProducts.length > 0) && (
        <section className="py-6 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="text-orange-500" size={22} />
                <h2 className="text-xl font-extrabold text-gray-800">Bán chạy nhất</h2>
              </div>
              <Link to="/products?isBestseller=true" className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>
            <ProductRow products={bestsellerProducts} loading={loading} />
          </div>
        </section>
        )}

        {/* ── MỚI CẬP BẾN — is_new ── */}
        {(loading || newProducts.length > 0) && (
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 p-1.5 rounded-lg">
                  <Smartphone className="text-white" size={18} />
                </div>
                <h2 className="text-xl font-extrabold text-gray-800">Mới cập bến</h2>
              </div>
              <Link to="/products?isNew=true" className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>
            <ProductRow products={newProducts} loading={loading} />
          </div>
        </section>
        )}

        {/* ── LỢI ÍCH ── */}
        <section className="py-10 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Zap size={20} />, title: 'Giao hỏa tốc 2h', sub: 'Nội thành HCM & HN' },
                { icon: <Award size={20} />, title: 'Bảo hành 24 tháng', sub: 'Chính hãng 100%' },
                { icon: <Smartphone size={20} />, title: 'Thu cũ đổi mới', sub: 'Trợ giá tới 2 triệu' },
                { icon: <Zap size={20} />, title: 'Trả góp 0%', sub: 'Duyệt hồ sơ 15 phút' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0">{item.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};
