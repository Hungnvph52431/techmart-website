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
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.images?.[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
            -{discount}%
          </div>
        )}
        {product.featured && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            Nổi bật
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
            <span className="ml-1 text-sm text-gray-600">{product.rating || 0}</span>
          </div>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-sm text-gray-600">Đã bán {product.reviewCount || 0}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xl font-bold text-red-600">
              {(product.price || 0).toLocaleString('vi-VN')}₫
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-sm text-gray-400 line-through">
                {product.originalPrice.toLocaleString('vi-VN')}₫
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Thêm vào giỏ</span>
        </button>
      </div>
    </Link>
  );
};
