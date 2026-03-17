import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { productService } from '@/services/product.service';
import { brandService } from '@/services/brand.service';
import { Product, Brand } from '@/types';
import { Layout } from '@/components/layout/Layout';
import { useSearchParams } from 'react-router-dom';
import { useUrlProductFilters, SORT_OPTIONS } from '@/hooks/useUrlProductFilters';
import { SlidersHorizontal } from 'lucide-react';

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const {
    selectedBrand,
    minPriceInput,
    maxPriceInput,
    appliedPriceRange,
    sortBy,
    selectBrand,
    clearBrand,
    setMinPriceInput,
    setMaxPriceInput,
    applyCustomPrice,
    applyPreset,
    clearPrice,
    isActivePreset,
    setSortBy,
    resetFilters,
    activeFilterCount,
    toApiParams,
  } = useUrlProductFilters();

  // Load brands once on mount
  useEffect(() => {
    brandService.getActiveBrands().then(setBrands).catch(console.error);
  }, []);

  // Re-fetch products whenever URL params change (filters, sort, search, category...)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getAll(toApiParams());
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic page title
  const pageTitle = (() => {
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const category = searchParams.get('category');
    if (search) return `Kết quả tìm kiếm: "${search}"`;
    if (featured === 'true') return 'Sản phẩm nổi bật';
    if (selectedBrand) {
      const brand = brands.find((b) => b.slug === selectedBrand);
      return brand ? brand.name : selectedBrand;
    }
    if (category) {
      const labels: Record<string, string> = {
        laptop: 'Laptop', tablet: 'Tablet',
        'dong-ho-thong-minh': 'Đồng hồ thông minh',
        'phu-kien': 'Phụ kiện', 'dien-thoai': 'Điện thoại',
        iphone: 'iPhone', 'samsung-galaxy': 'Samsung Galaxy',
      };
      return labels[category] ?? category;
    }
    return 'Tất cả sản phẩm';
  })();

  const sidebarProps = {
    brands,
    selectedBrand,
    minPriceInput,
    maxPriceInput,
    appliedPriceRange,
    activeFilterCount,
    isActivePreset,
    onBrandSelect: selectBrand,
    onClearBrand: clearBrand,
    onMinPriceChange: setMinPriceInput,
    onMaxPriceChange: setMaxPriceInput,
    onApplyCustomPrice: applyCustomPrice,
    onApplyPreset: applyPreset,
    onClearPrice: clearPrice,
    onReset: resetFilters,
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
          {!loading && (
            <span className="text-sm text-gray-400">{products.length} sản phẩm</span>
          )}
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Desktop sticky sidebar ── */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-none sticky top-20">
            <FilterSidebar {...sidebarProps} />
          </aside>

          {/* ── Mobile drawer backdrop ── */}
          <div
            className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300
              ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Mobile slide-in panel */}
          <div
            className={`fixed left-0 top-0 h-full w-72 z-50 lg:hidden transition-transform duration-300
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <FilterSidebar
              {...sidebarProps}
              isDrawer
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          {/* ── Content: sort bar + product grid ── */}
          <div className="flex-1 min-w-0">
            {/* Sort row + mobile filter button */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`flex-none px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                      ${sortBy === opt.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-80 rounded-xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-500 text-lg font-medium">Không tìm thấy sản phẩm</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Thử thay đổi bộ lọc để xem thêm</p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product, index) => {
                  const key = (product as any).productId ?? (product as any).id ?? product.slug ?? index;
                  return <ProductCard key={String(key)} product={product} />;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
