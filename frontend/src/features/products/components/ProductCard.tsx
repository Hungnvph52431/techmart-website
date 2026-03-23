import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

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

  // Logic kiểm tra tồn kho
  const currentCartItem = items.find(item => item.product.productId === product.productId);
  const cartQuantity = currentCartItem ? currentCartItem.quantity : 0;
  const isOutOfStock = product.stockQuantity <= 0;
  const isInactive = product.status === 'inactive';
  const isMaxReached = !isOutOfStock && !isInactive && cartQuantity >= product.stockQuantity;
  const isDisabled = isOutOfStock || isInactive || isMaxReached;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    addItem(product);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
  };

  const originalPrice = product.price ?? 0;
  const currentPrice = product.salePrice ?? originalPrice;
  const discount = (product.salePrice && originalPrice > product.salePrice)
    ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
    >
      {/* 1. CONTAINER ẢNH & BADGES */}
      <div className="relative pt-[100%] overflow-hidden bg-gray-50">
        <img
          src={getImageUrl(product.mainImage || (product as any).images?.[0]?.imageUrl)}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.src = '/placeholder.jpg'; }}
        />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {discount > 0 && !isDisabled && (
            <span className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white shadow-sm">
              Giảm {discount}%
            </span>
          )}
          {product.isFeatured && !isDisabled && (
            <span className="rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black uppercase text-white shadow-sm italic">
              Hot
            </span>
          )}
        </div>

        {/* Overlay Hết hàng */}
        {isDisabled && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg italic">
              {isInactive ? 'Ngừng bán' : 'Tạm hết hàng'}
            </span>
          </div>
        )}
      </div>

      {/* 2. NỘI DUNG SẢN PHẨM */}
      <div className="flex flex-1 flex-col p-4">
        {product.brandName && (
          <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-600 italic">
            {product.brandName}
          </div>
        )}

        <h3 className="mb-2 line-clamp-2 min-h-[40px] text-sm font-bold text-gray-800 transition-colors group-hover:text-blue-600">
          {product.name}
        </h3>

        {/* Đánh giá & Số lượng đã bán */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-yellow-50 px-2 py-0.5">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            <span className="ml-1 text-[10px] font-black text-yellow-700">{product.ratingAvg || 0}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            Đã bán {product.soldQuantity || 0}
          </span>
        </div>

        {/* GIÁ & NÚT BẤM */}
        <div className="mt-auto">
          <div className="mb-4 flex flex-col">
            <span className="text-lg font-black text-red-600 tracking-tighter">
              {currentPrice.toLocaleString("vi-VN")}₫
            </span>
            {discount > 0 && (
              <span className="text-xs text-gray-400 decoration-gray-300 line-through tracking-tighter">
                {originalPrice.toLocaleString("vi-VN")}₫
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95'
            }`}
          >
            <ShoppingCart size={14} />
            {isOutOfStock ? 'Hết hàng' : isMaxReached ? 'Đã đủ số lượng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </Link>
  );
};
