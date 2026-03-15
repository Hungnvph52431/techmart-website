import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Ngăn chặn sự kiện click lan ra thẻ Link bên ngoài
    addItem(product);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  // 1. Logic tính toán giá từ Database chuẩn
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
      {/* 2. Container Ảnh - Dùng giao diện bo tròn hiện đại của bản Incoming */}
      <div className="relative pt-[100%] overflow-hidden bg-gray-50">
        <img
          src={product.mainImage || (product.images && product.images[0]?.imageUrl) || "/placeholder.jpg"}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
          onError={(e) => (e.currentTarget.src = "https://placehold.co/400x400?text=" + product.name)}
        />
        
        {/* Badges - Kết hợp thông tin Nổi bật và Giảm giá */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
              Giảm {discount}%
            </span>
          )}
          {product.isFeatured && (
            <span className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
              Hot
            </span>
          )}
        </div>
      </div>

      {/* 3. Phần nội dung - Hiển thị đầy đủ Brand và Đánh giá */}
      <div className="flex flex-1 flex-col p-4">
        {product.brandName && (
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
            {product.brandName}
          </div>
        )}

        <h3 className="mb-2 line-clamp-2 min-h-[40px] text-sm font-bold text-gray-800 transition-colors group-hover:text-primary-600">
          {product.name}
        </h3>

        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center rounded bg-yellow-50 px-2 py-0.5">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            <span className="ml-1 text-xs font-bold text-yellow-700">{product.ratingAvg || 0}</span>
          </div>
          <span className="text-xs text-gray-400">Đã bán {product.reviewCount || 0}</span>
        </div>

        <div className="mt-auto">
          <div className="mb-4 flex flex-col">
            <span className="text-lg font-black text-red-600">
              {currentPrice.toLocaleString("vi-VN")}₫
            </span>
            {discount > 0 && (
              <span className="text-xs text-gray-400 decoration-gray-300 line-through">
                {originalPrice.toLocaleString("vi-VN")}₫
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition-all hover:border-primary-600 hover:bg-primary-600 hover:text-white"
          >
            <ShoppingCart size={16} />
            Mua ngay
          </button>
        </div>
      </div>
    </Link>
  );
};