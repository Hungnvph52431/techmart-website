import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { productService } from "@/services/product.service";
import toast from "react-hot-toast";
import { VariantPickerModal } from "./VariantPickerModal";

// ✅ Helper: chuyển path ảnh local thành URL đầy đủ
const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string): string => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem, items } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isFavorite = useWishlistStore((state) =>
    state.productIds.includes(product.productId)
  );
  const isWishlistPending = useWishlistStore((state) =>
    state.pendingProductIds.includes(product.productId)
  );
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const listHasVariants =
    product.hasVariants ??
    (product.variantCount != null ? product.variantCount > 0 : undefined);
  const hasVariants =
    listHasVariants ??
    Boolean(
      (product.variants && product.variants.length > 0) ||
      (fullProduct?.variants && fullProduct.variants.length > 0)
    );

  // Logic kiểm tra tồn kho
  const currentCartItem = items.find(item => item.product.productId === product.productId);
  const cartQuantity = currentCartItem ? currentCartItem.quantity : 0;
  const availableStockQuantity = Number(
    product.availableStockQuantity ?? product.stockQuantity ?? 0
  );
  const isOutOfStock = availableStockQuantity <= 0;
  const isInactive = product.status === 'inactive';
  const isMaxReached =
    !isOutOfStock &&
    !isInactive &&
    !hasVariants &&
    cartQuantity >= availableStockQuantity;
  const isDisabled = isOutOfStock || isInactive || isMaxReached;

  const handleAddToCart = async () => {
    if (isDisabled || loadingVariants) {
      return;
    }

    if (!hasVariants) {
      addItem(product);
      toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
      return;
    }

    if (fullProduct?.productId === product.productId && (fullProduct.variants?.length ?? 0) > 0) {
      setShowVariantPicker(true);
      return;
    }

    try {
      setLoadingVariants(true);
      const detail = await productService.getBySlug(product.slug);
      const detailHasVariants =
        detail.hasVariants ??
        (detail.variantCount != null ? detail.variantCount > 0 : undefined) ??
        ((detail.variants?.length ?? 0) > 0);

      if (detailHasVariants && detail.variants && detail.variants.length > 0) {
        setFullProduct(detail);
        setShowVariantPicker(true);
        return;
      }

      if (!detailHasVariants) {
        addItem(detail);
        toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
        return;
      }

      toast.error('Không thể tải phiên bản sản phẩm. Vui lòng thử lại.');
    } catch {
      toast.error('Không thể tải thông tin sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoadingVariants(false);
    }
  };

  const originalPrice = product.price ?? 0;
  const currentPrice = product.salePrice ?? originalPrice;
  const discount = (product.salePrice && originalPrice > product.salePrice)
    ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
    : 0;
  const ratingValue =
    Number(product.reviewCount ?? 0) > 0
      ? Number(product.ratingAvg ?? 0).toFixed(1)
      : '0';
  const soldQuantityText = Number(product.soldQuantity ?? 0).toLocaleString('vi-VN');

  const handleWishlistClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated()) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích');
      return;
    }

    try {
      const nextIsFavorite = await toggleWishlist(product.productId, product);
      toast.success(
        nextIsFavorite
          ? 'Đã thêm sản phẩm vào danh sách yêu thích'
          : 'Đã xoá sản phẩm khỏi danh sách yêu thích'
      );
    } catch {
      toast.error('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.');
    }
  };

  return (
    <>
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-blue-100">
        <div className="flex flex-1 flex-col">
          <Link
            to={`/products/${product.slug}`}
            className="flex flex-1 flex-col"
          >
            {/* 1. CONTAINER ẢNH & BADGES */}
            <div className="relative pt-[100%] overflow-hidden bg-gray-50">
              <img
                src={getImageUrl(product.mainImage || (product as any).images?.[0]?.imageUrl)}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.src = '/placeholder.jpg'; }}
              />

              {/* Badge giảm giá — góc trên phải */}
              {discount > 0 && !isDisabled && (
                <div className="absolute right-0 top-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-l-lg shadow-md">
                  -{discount}%
                </div>
              )}

              {/* Badges trạng thái — góc trên trái */}
              {!isDisabled && (product.isNew || product.isBestseller || product.isFeatured) && (
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  {product.isFeatured && (
                    <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-black uppercase text-white shadow-sm">
                      Nổi bật
                    </span>
                  )}
                  {product.isNew && (
                    <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-black uppercase text-white shadow-sm">
                      Mới
                    </span>
                  )}
                  {product.isBestseller && (
                    <span className="rounded-md bg-orange-500 px-2.5 py-1 text-[11px] font-black uppercase text-white shadow-sm">
                      Bán chạy
                    </span>
                  )}
                </div>
              )}

              {/* Overlay Hết hàng */}
              {isDisabled && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase shadow-lg italic">
                    {isInactive ? 'Ngừng bán' : 'Tạm hết hàng'}
                  </span>
                </div>
              )}
            </div>

            {/* 2. NỘI DUNG SẢN PHẨM */}
            <div className="flex flex-1 flex-col px-4 py-3">
              {product.brandName && (
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {product.brandName}
                </div>
              )}

              <h3 className="mb-2 line-clamp-2 min-h-[40px] text-sm font-semibold text-gray-800 leading-snug transition-colors group-hover:text-blue-600">
                {product.name}
              </h3>

              <div className="mt-auto flex items-baseline gap-2">
                <span className="text-base font-black text-red-600">
                  {currentPrice.toLocaleString("vi-VN")}₫
                </span>
                {discount > 0 && (
                  <span className="text-xs text-gray-400 line-through">
                    {originalPrice.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>
            </div>
          </Link>

          <div className="space-y-2.5 px-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex items-center rounded-md bg-yellow-50 px-2 py-0.5">
                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                  <span className="ml-1 text-[11px] font-bold text-yellow-700">{ratingValue}</span>
                </div>
                <span className="truncate text-[11px] font-medium text-gray-400">
                  Đã bán {soldQuantityText}
                </span>
              </div>

              <button
                type="button"
                onClick={handleWishlistClick}
                disabled={isWishlistPending}
                aria-label={
                  isFavorite
                    ? 'Xoá sản phẩm khỏi danh sách yêu thích'
                    : 'Thêm sản phẩm vào danh sách yêu thích'
                }
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                  isFavorite
                    ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                    : 'border-rose-100 bg-rose-50/80 text-rose-300 hover:border-rose-200 hover:text-rose-500'
                } ${isWishlistPending ? 'cursor-wait opacity-70' : ''}`}
              >
                <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isDisabled || loadingVariants}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : loadingVariants
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm hover:shadow-md'
              }`}
            >
              {loadingVariants ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang tải...
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  {isOutOfStock ? 'Hết hàng' : isMaxReached ? 'Đã đủ số lượng' : 'Thêm vào giỏ'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Modal chọn biến thể */}
      {fullProduct && (
        <VariantPickerModal
          product={fullProduct}
          open={showVariantPicker}
          onClose={() => setShowVariantPicker(false)}
        />
      )}
    </>
  );
};
