import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  Truck, ShieldCheck, RefreshCw, CreditCard,
  Laptop, Tablet, Headphones, Watch, Monitor, Cpu, Gamepad2, Camera,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';

const getImageUrl = (url: string) =>
  url?.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${url}` : url;

const CATEGORY_COLORS: string[] = [
  'bg-blue-50 text-blue-600 border-blue-100',
  'bg-orange-50 text-orange-600 border-orange-100',
  'bg-purple-50 text-purple-600 border-purple-100',
  'bg-green-50 text-green-600 border-green-100',
  'bg-red-50 text-red-600 border-red-100',
  'bg-yellow-50 text-yellow-600 border-yellow-100',
  'bg-pink-50 text-pink-600 border-pink-100',
  'bg-cyan-50 text-cyan-600 border-cyan-100',
  'bg-indigo-50 text-indigo-600 border-indigo-100',
  'bg-teal-50 text-teal-600 border-teal-100',
];

const getCategoryIcon = (slug: string = '', size: number = 28): ReactNode => {
  const s = slug.toLowerCase();
  if (s.includes('dien-thoai') || s.includes('phone') || s.includes('mobile')) return <Smartphone size={size} />;
  if (s.includes('laptop') || s.includes('macbook')) return <Laptop size={size} />;
  if (s.includes('tablet') || s.includes('ipad')) return <Tablet size={size} />;
  if (s.includes('phu-kien') || s.includes('accessory') || s.includes('tai-nghe') || s.includes('headphone')) return <Headphones size={size} />;
  if (s.includes('dong-ho') || s.includes('watch')) return <Watch size={size} />;
  if (s.includes('man-hinh') || s.includes('monitor') || s.includes('tv')) return <Monitor size={size} />;
  if (s.includes('linh-kien') || s.includes('cpu') || s.includes('pc')) return <Cpu size={size} />;
  if (s.includes('game') || s.includes('console')) return <Gamepad2 size={size} />;
  if (s.includes('camera') || s.includes('may-anh')) return <Camera size={size} />;
  return <Smartphone size={size} />;
};

// --- FADE-IN SECTION (Intersection Observer) ---
const FadeInSection = ({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- HERO BANNER SLIDER ---
const HeroBannerSlider = ({ banners }: { banners: Banner[] }) => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length > 1 && !isPaused) {
      timerRef.current = setInterval(() => goTo((c: number) => (c + 1) % banners.length), 5000);
    }
  }, [banners.length, isPaused]);

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
    <div
      className="relative rounded-2xl overflow-hidden group h-[300px] md:h-[420px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ width: `${banners.length * 100}%`, transform: `translateX(-${current * (100 / banners.length)}%)` }}>
        {banners.map((banner, i) => (
          <div key={banner.bannerId || i} className="relative h-full shrink-0" style={{ width: `${100 / banners.length}%` }}>
            <img src={getImageUrl(banner.imageUrl)} alt={banner.title}
              className="w-full h-full object-cover" loading="lazy"
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
      className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105" loading="lazy"
      onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x200/7c3aed/ffffff?text=Banner'; }} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 p-5 text-white z-10">
      <h3 className="text-lg font-bold mb-1">{banner.title}</h3>
      <span className="text-xs font-semibold border-b border-white pb-0.5">Xem chi tiết</span>
    </div>
  </Link>
);

// --- PRODUCT SKELETON ---
const ProductSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden shrink-0
    w-[calc(50%-8px)] sm:w-[calc(33.33%-11px)] lg:w-[calc(20%-13px)]">
    <div className="pt-[100%] bg-gray-100 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <Smartphone className="text-gray-200" size={40} />
      </div>
    </div>
    <div className="p-4 space-y-3">
      <div className="h-3 bg-gray-100 rounded-full w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded-full w-full" />
        <div className="h-4 bg-gray-100 rounded-full w-3/4" />
      </div>
      <div className="pt-2 space-y-2">
        <div className="h-5 bg-gray-100 rounded-full w-2/5" />
        <div className="h-3 bg-gray-100 rounded-full w-1/4" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl w-full mt-3" />
    </div>
  </div>
);

// --- PRODUCT SCROLL ROW (with arrows) ---
const ProductScrollRow = ({ products, loading }: { products: Product[]; loading: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, products]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.querySelector(':scope > div')?.clientWidth ?? 240;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -(cardWidth + 16) * 2 : (cardWidth + 16) * 2,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => <ProductSkeleton key={i} />)}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="text-center text-gray-400 py-8">Đang cập nhật...</p>;
  }

  return (
    <div className="relative group/scroll">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide pb-2"
      >
        {products.map(p => (
          <div key={p.productId} className="shrink-0 w-[calc(50%-8px)] sm:w-[calc(33.33%-11px)] lg:w-[calc(20%-13px)]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-white shadow-xl border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 p-2.5 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-all duration-300"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white shadow-xl border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 p-2.5 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-all duration-300"
        >
          <ChevronRight size={20} />
        </button>
      )}
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
  const recentlyViewed = useRecentlyViewedStore((state) => state.products);

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

        {/* ── DANH MỤC (grid with images) ── */}
        <FadeInSection>
          <section className="py-6">
            <div className="container mx-auto px-4">
              <div className="bg-white px-6 py-6 rounded-2xl border border-gray-100 shadow-sm">
                {/* Category grid */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Danh mục sản phẩm</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {parentCategories.map((cat, idx) => (
                      <Link
                        key={cat.categoryId}
                        to={`/products?category=${cat.slug}`}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
                      >
                        {cat.imageUrl ? (
                          <img
                            src={getImageUrl(cat.imageUrl)}
                            alt={cat.name}
                            className="w-12 h-12 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                            {getCategoryIcon(cat.slug, 28)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-center leading-tight">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                  <div className="pt-5 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thương hiệu</h3>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {brands.map(b => (
                        <Link key={b.brandId} to={`/products?brand=${b.slug}`}
                          className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Xem tất cả */}
                <div className="flex justify-center pt-5 border-t border-gray-100 mt-5">
                  <Link to="/products"
                    onClick={() => window.scrollTo(0, 0)}
                    className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                    Xem tất cả sản phẩm <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* ── SĂN DEAL GIÁ SỐC ── */}
        {(loading || dealProducts.length > 0) && (
          <FadeInSection>
            <section className="py-5">
              <div className="container mx-auto px-4">
                <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <Zap className="fill-current text-yellow-400" size={22} />
                      <h2 className="text-xl font-extrabold uppercase tracking-wide">Săn Deal Giá Sốc</h2>
                    </div>
                    <Link to="/products?onSale=true" onClick={() => window.scrollTo(0, 0)} className="text-white/80 font-semibold text-sm flex items-center gap-0.5 hover:text-white">
                      Xem tất cả <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div className="p-5">
                    <ProductScrollRow products={dealProducts} loading={loading} />
                  </div>
                </div>
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── SẢN PHẨM NỔI BẬT ── */}
        {(loading || featuredProducts.length > 0) && (
          <FadeInSection>
            <section className="py-6 bg-white">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-100 p-2 rounded-xl">
                      <Award className="text-blue-600" size={20} />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-800">Sản phẩm nổi bật</h2>
                  </div>
                  <Link to="/products?isFeatured=true" onClick={() => window.scrollTo(0, 0)} className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                    Xem tất cả <ChevronRight size={16} />
                  </Link>
                </div>
                <ProductScrollRow products={featuredProducts} loading={loading} />
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── BANNER QUẢNG CÁO GIỮA TRANG ── */}
        {middleBanners.length > 2 && (
          <FadeInSection>
            <section className="py-4">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {middleBanners.slice(2, 4).map(b => (
                    <SmallBannerCard key={b.bannerId} banner={b} />
                  ))}
                </div>
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── BÁN CHẠY NHẤT ── */}
        {(loading || bestsellerProducts.length > 0) && (
          <FadeInSection>
            <section className="py-6 bg-gradient-to-b from-orange-50/50 to-white">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-orange-100 p-2 rounded-xl">
                      <Zap className="text-orange-500" size={20} />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-800">Bán chạy nhất</h2>
                  </div>
                  <Link to="/products?isBestseller=true" onClick={() => window.scrollTo(0, 0)} className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                    Xem tất cả <ChevronRight size={16} />
                  </Link>
                </div>
                <ProductScrollRow products={bestsellerProducts} loading={loading} />
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── MỚI CẬP BẾN ── */}
        {(loading || newProducts.length > 0) && (
          <FadeInSection>
            <section className="py-6 bg-white">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                      <Smartphone className="text-emerald-600" size={20} />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-800">Mới cập bến</h2>
                  </div>
                  <Link to="/products?isNew=true" onClick={() => window.scrollTo(0, 0)} className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                    Xem tất cả <ChevronRight size={16} />
                  </Link>
                </div>
                <ProductScrollRow products={newProducts} loading={loading} />
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── ĐÃ XEM GẦN ĐÂY ── */}
        {recentlyViewed.length > 0 && (
          <FadeInSection>
            <section className="py-6 bg-gradient-to-b from-gray-50/60 to-white">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-gray-200 p-2 rounded-xl">
                      <Clock className="text-gray-700" size={20} />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-800">Đã xem gần đây</h2>
                  </div>
                </div>
                <ProductScrollRow products={recentlyViewed} loading={false} />
              </div>
            </section>
          </FadeInSection>
        )}

        {/* ── LỢI ÍCH ── */}
        <FadeInSection>
          <section className="py-10 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Truck size={24} />, title: 'Giao hỏa tốc 2h', sub: 'Nội thành HCM & HN', color: 'bg-blue-50 text-blue-600' },
                  { icon: <ShieldCheck size={24} />, title: 'Bảo hành 24 tháng', sub: 'Chính hãng 100%', color: 'bg-emerald-50 text-emerald-600' },
                  { icon: <RefreshCw size={24} />, title: 'Thu cũ đổi mới', sub: 'Trợ giá tới 2 triệu', color: 'bg-orange-50 text-orange-600' },
                  { icon: <CreditCard size={24} />, title: 'Trả góp 0%', sub: 'Duyệt hồ sơ 15 phút', color: 'bg-purple-50 text-purple-600' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default"
                  >
                    <div className={`${item.color} p-3.5 rounded-2xl shrink-0`}>{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>
      </div>
    </Layout>
  );
};
