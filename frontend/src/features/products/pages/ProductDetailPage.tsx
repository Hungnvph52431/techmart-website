import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { productService } from '@/services/product.service';
import { Product } from '@/types';
import { ShoppingCart, Star, Truck, Shield, RefreshCw } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem, items } = useCartStore();

  const currentCartItem = items.find(item => item.product.productId === product?.productId);
  const cartQuantity = currentCartItem ? currentCartItem.quantity : 0;
  const availableStock = product ? product.stockQuantity - cartQuantity : 0;

  const isOutOfStock = product ? product.stockQuantity <= 0 : false;
  const isMaxReached = !isOutOfStock && availableStock <= 0;
  const isDisabled = isOutOfStock || isMaxReached;

  useEffect(() => {
    if (quantity > availableStock && availableStock > 0) {
      setQuantity(availableStock);
    } else if (availableStock <= 0) {
      setQuantity(0);
    }
  }, [availableStock, quantity]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await productService.getBySlug(slug);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="mb-4">
              <img
                src={product.mainImage || '/placeholder.jpg'}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            <div className="flex items-center mb-4">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-lg">{product.ratingAvg || 0}</span>
              </div>
              <span className="mx-3 text-gray-400">|</span>
              <span className="text-gray-600">{product.reviewCount} đánh giá</span>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {(product.salePrice || product.price).toLocaleString('vi-VN')}₫
              </div>
              {product.salePrice && product.price > product.salePrice && (
                <div className="flex items-center space-x-2">
                  <span className="text-lg text-gray-400 line-through">
                    {product.price.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                    -
                    {Math.round(
                      ((product.price - product.salePrice) / product.price) * 100
                    )}
                    %
                  </span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Số lượng:</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDisabled || quantity <= 1}
                >
                  -
                </button>
                <span className="px-4 py-2 border border-gray-300 rounded">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDisabled || quantity >= availableStock}
                >
                  +
                </button>
                <span className="text-gray-500 ml-4 font-medium">
                  Còn {Math.max(0, availableStock)} SP có thể mua
                </span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isDisabled || quantity <= 0}
              className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 mb-6 ${isDisabled || quantity <= 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-semibold text-lg">{isOutOfStock ? 'Tạm hết hàng' : isMaxReached ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
            </button>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <Truck className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Giao hàng nhanh</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <Shield className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Bảo hành 12 tháng</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <RefreshCw className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Đổi trả 7 ngày</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Thông số kỹ thuật:</h3>
              <div className="space-y-2">
                {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="w-1/3 text-gray-600 capitalize">{key}:</span>
                    <span className="w-2/3 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Mô tả sản phẩm</h2>
          <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
        </div>
      </div>
    </Layout>
  );
};
