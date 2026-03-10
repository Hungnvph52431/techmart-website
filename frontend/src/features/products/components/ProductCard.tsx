import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
  };

  const displayPrice = product.salePrice || product.price;
  const originalPrice = product.salePrice ? product.price : undefined;
  const discount = originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.mainImage || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {discount > 0 && product.stockQuantity > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
            -{discount}%
          </div>
        )}
        {product.isFeatured && product.stockQuantity > 0 && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            Nổi bật
          </div>
        )}
        {product.stockQuantity <= 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm tracking-wider uppercase shadow-md">
              Hết Hàng
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-primary-600">
          {product.name}
        </h3>

        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">{product.ratingAvg || 0}</span>
          </div>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-sm text-gray-600">Đã bán {product.soldQuantity || 0}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xl font-bold text-red-600">
              {(displayPrice || 0).toLocaleString('vi-VN')}₫
            </div>
            {originalPrice && originalPrice > displayPrice && (
              <div className="text-sm text-gray-400 line-through">
                {originalPrice.toLocaleString('vi-VN')}₫
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={product.stockQuantity <= 0}
          className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${product.stockQuantity <= 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{product.stockQuantity <= 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ'}</span>
        </button>
      </div>
    </Link>
  );
};

