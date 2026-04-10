import { Heart, Loader2, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types';

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';

const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getCurrentPrice = (product: Product) => product.salePrice ?? product.price;

const FavoriteProductRow = ({ product }: { product: Product }) => {
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isPending = useWishlistStore((state) =>
    state.pendingProductIds.includes(product.productId)
  );

  const handleRemove = async () => {
    try {
      const nextIsFavorite = await toggleWishlist(product.productId);
      toast.success(
        nextIsFavorite
          ? 'Đã thêm sản phẩm vào danh sách yêu thích'
          : 'Đã xoá sản phẩm khỏi danh sách yêu thích'
      );
    } catch {
      toast.error('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.');
    }
  };

  const currentPrice = getCurrentPrice(product);
  const hasSalePrice =
    product.salePrice != null && Number(product.price) > Number(product.salePrice);

  return (
    <div className="flex items-center gap-2.5 rounded-[22px] border border-slate-100 bg-white px-3 py-2.5 transition-colors hover:border-slate-200">
      <Link
        to={`/products/${product.slug}`}
        className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-50"
      >
        <img
          src={getImageUrl(product.mainImage)}
          alt={product.name}
          className="h-full w-full object-contain p-2"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.onerror = null;
            el.src = '/placeholder.jpg';
          }}
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        {product.brandName && (
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
            {product.brandName}
          </p>
        )}

        <Link
          to={`/products/${product.slug}`}
          className="line-clamp-2 text-[12px] font-black leading-tight text-slate-800 transition-colors hover:text-blue-600"
        >
          {product.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-black text-red-600">
            {currentPrice.toLocaleString('vi-VN')}₫
          </span>
          {hasSalePrice && (
            <span className="text-[10px] text-slate-400 line-through">
              {Number(product.price).toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        aria-label="Xoá sản phẩm khỏi danh sách yêu thích"
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
          isPending
            ? 'cursor-wait border-rose-200 bg-rose-100 text-rose-400 opacity-70'
            : 'border-rose-500 bg-rose-500 text-white shadow-sm hover:bg-rose-600'
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Heart className="h-3.5 w-3.5 fill-current" />
        )}
      </button>
    </div>
  );
};

export const FavoriteProductsSection = ({ userId }: { userId: number }) => {
  const products = useWishlistStore((state) => state.products);
  const isHydrating = useWishlistStore((state) => state.isHydrating);
  const initializedUserId = useWishlistStore((state) => state.initializedUserId);

  const isLoading = isHydrating || initializedUserId !== userId;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-700">Sản phẩm yêu thích</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">{products.length} sản phẩm đã lưu</p>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Đang tải sản phẩm yêu thích...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <PackageOpen size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">Chưa có sản phẩm yêu thích nào</p>
            <p className="mt-1 text-xs text-slate-300">
              Hãy bấm vào icon trái tim ở sản phẩm bạn muốn lưu lại.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {products.map((product) => (
              <FavoriteProductRow key={product.productId} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
