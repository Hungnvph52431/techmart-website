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
    toast.success('Đã thêm vào giỏ hàng!');
  };

  const discount = product.originalPrice && product.price 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full overflow-hidden"
    >
      {/* Image Container */}
      <div className="relative pt-[100%] overflow-hidden bg-gray-50">
        <img
          src={product.images?.[0] || '/placeholder.jpg'}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
          onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400?text=' + product.name)}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
              Giam {discount}%
            </span>
          )}
          {product.featured && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
              Hot
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-2 min-h-[40px] group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-3 mb-3">
          <div className="bg-yellow-50 px-2 py-0.5 rounded flex items-center">
            <Star className="h-3 w-3 text-yellow-500 fill-current" />
            <span className="ml-1 text-xs font-bold text-yellow-700">{product.rating || 5}</span>
          </div>
          <span className="text-xs text-gray-400">Đã bán {product.reviewCount || 0}</span>
        </div>

        <div className="mt-auto">
          <div className="flex flex-col mb-4">
            <span className="text-lg font-black text-red-600">
              {(product.price || 0).toLocaleString('vi-VN')}₫
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-400 line-through decoration-gray-300">
                {product.originalPrice.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-gray-50 text-gray-700 hover:bg-primary-600 hover:text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-gray-100 group-hover:border-primary-600"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Mua ngay
          </button>
        </div>
      </div>
    </Link>
  );
};

