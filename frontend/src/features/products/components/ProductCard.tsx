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

  // Tính toán giá dựa trên CSDL của bạn (price = giá gốc, salePrice = giá khuyến mãi)
  const originalPrice = product.price ?? 0;
  const currentPrice = product.salePrice ?? originalPrice;

  const discount =
    product.salePrice && originalPrice > product.salePrice
      ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
      : 0;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    addItem(product);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  return (  
    <Link
      to={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border bg-white shadow-sm transition duration-300 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        {/* Dùng mainImage theo đúng CSDL */}
        <img
          src={product.mainImage ?? "/placeholder.jpg"}
          alt={product.name}
          className="h-60 w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded bg-red-500 px-2 py-1 text-xs text-white">
            -{discount}%
          </span>
        )}

        {/* Dùng isFeatured theo đúng CSDL */}
        {product.isFeatured && (
          <span className="absolute left-2 top-2 rounded bg-yellow-500 px-2 py-1 text-xs text-white">
            Nổi bật
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Tuỳ chọn: Hiện tên hãng nếu bạn muốn */}
        {product.brandName && (
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            {product.brandName}
          </div>
        )}

        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-800 transition group-hover:text-primary-600">
          {product.name}
        </h3>

        <div className="mb-3 flex items-center text-sm text-gray-500">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />

          {/* Dùng ratingAvg thay cho rating */}
          <span className="ml-1">{product.ratingAvg ?? 0}</span>
          <span className="mx-2">|</span>

          <span>{product.reviewCount ?? 0} đánh giá</span>
        </div>

        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-bold text-red-600">
              {currentPrice.toLocaleString("vi-VN")}₫
            </div>

            {discount > 0 && (
              <div className="text-xs text-gray-400 line-through">
                {originalPrice.toLocaleString("vi-VN")}₫
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-white transition hover:bg-primary-700"
        >
          <ShoppingCart size={16} />
          Thêm vào giỏ
        </button>

      </div>
    </Link>
  );
};