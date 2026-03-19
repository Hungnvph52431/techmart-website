import { useState, useEffect } from 'react';
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
  Zap, Award, Smartphone, Laptop, Tablet, Watch, Headphones, Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const getImageUrl = (url: string) =>
  url?.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${url}` : url;

// Icon map cho categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'dien-thoai': <Smartphone className="w-7 h-7" />,
  'iphone': <Smartphone className="w-7 h-7" />,
  'samsung-galaxy': <Smartphone className="w-7 h-7" />,
  'xiaomi-phone': <Smartphone className="w-7 h-7" />,
  'oppo-phone': <Smartphone className="w-7 h-7" />,
  'laptop': <Laptop className="w-7 h-7" />,
  'tablet': <Tablet className="w-7 h-7" />,
  'dong-ho-thong-minh': <Watch className="w-7 h-7" />,
  'phu-kien': <Headphones className="w-7 h-7" />,
  'tai-nghe': <Headphones className="w-7 h-7" />,
  'sac-du-phong': <Zap className="w-7 h-7" />,
  'op-lung': <Smartphone className="w-7 h-7" />,
  'cap-sac': <Package className="w-7 h-7" />,
};

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

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="h-[300px] md:h-[420px] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-2xl flex items-center px-8 md:px-16 text-white">
        <div>
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-bold mb-4">
            TechMart Exclusive
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            iPhone 15 <br /><span className="text-yellow-400">Pro Max</span>
          </h2>
          <Link to="/products" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
            Mua ngay
          </Link>
        </div>
      </div>
    );
  }

  const banner = banners[current];

  return (
    <div className="relative rounded-2xl overflow-hidden group h-[300px] md:h-[420px]">
      <img
        src={getImageUrl(banner.imageUrl)}
        alt={banner.title}
        className="w-full h-full object-cover transition-opacity duration-500"
        onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/900x420/1e40af/ffffff?text=Banner'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex items-center px-8 md:px-14">
        <div className="max-w-md text-white">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg">
            {banner.title}
          </h2>
          {banner.linkUrl && (
            <Link to={banner.linkUrl}
              className="inline-block bg-white text-gray-900 px-8 py-3 rounded-xl font-bold text-sm hover:shadow-xl transition-all">
              Xem ngay
            </Link>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrent(i => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrent(i => (i + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`} />
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
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [sliderBanners, setSliderBanners] = useState<Banner[]>([]);
  const [middleBanners, setMiddleBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featuredData, newestData, sliders, middles, cats, brds] = await Promise.all([
          productService.getAll({ featured: true }),
          productService.getAll({}),
          bannerService.getActive('home_slider'),
          bannerService.getActive('home_middle'),
          categoryService.getAll(),
          brandService.getAll(),
        ]);

        const featuredList = Array.isArray(featuredData) ? featuredData : ((featuredData as any)?.products || []);
        const newestList = Array.isArray(newestData) ? newestData : ((newestData as any)?.products || []);

        setFeaturedProducts(featuredList.slice(0, 10));
        setNewProducts(newestList.slice(0, 10));
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

        {/* ── DANH MỤC + THƯƠNG HIỆU (giống CellphoneS) ── */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100">
              {/* Danh mục */}
              <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-hide">
                {parentCategories.map((cat, idx) => (
                  <Link key={cat.categoryId} to={`/products?category=${cat.slug}`}
                    className="flex flex-col items-center gap-2 min-w-[72px] group">
                    <div className={`w-14 h-14 ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} rounded-2xl flex items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-lg`}>
                      {CATEGORY_ICONS[cat.slug] || <Package className="w-7 h-7" />}
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 text-center whitespace-nowrap group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Thương hiệu — hiện chỉ khi có brands */}
              {brands.length > 0 && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50 overflow-x-auto scrollbar-hide">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Hãng:</span>
                  {brands.map(b => (
                    <Link key={b.brandId} to={`/products?brand=${b.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all shrink-0">
                      {b.logoUrl && <img src={getImageUrl(b.logoUrl)} alt={b.name} className="w-4 h-4 object-contain" />}
                      <span className="text-xs font-semibold text-gray-600">{b.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SĂN DEAL GIÁ SỐC ── */}
        <section className="py-4">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 flex items-center gap-3 text-white">
                <Zap className="fill-current text-yellow-400" size={22} />
                <h2 className="text-xl font-extrabold uppercase tracking-wide">Săn Deal Giá Sốc</h2>
              </div>
              <div className="p-5">
                <ProductRow products={featuredProducts.slice(0, 5)} loading={loading} />
              </div>
            </div>
          </div>
        </section>

        {/* ── SẢN PHẨM NỔI BẬT ── */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Award className="text-blue-600" size={22} />
                <h2 className="text-xl font-extrabold text-gray-800">Sản phẩm nổi bật</h2>
              </div>
              <Link to="/products?featured=true" className="text-blue-600 font-semibold text-sm flex items-center gap-0.5 hover:underline">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>
            <ProductRow products={featuredProducts} loading={loading} />
          </div>
        </section>

        {/* ── MỚI CẬP BẾN ── */}
        <section className="py-6 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Smartphone className="text-white" size={18} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-800">Mới cập bến</h2>
            </div>
            <ProductRow products={newProducts} loading={loading} />
          </div>
        </section>

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
