import { Layout } from '@/components/layout/Layout';
import { useCartStore } from '@/store/cartStore';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CartPage = () => {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Giỏ hàng trống</h1>
          <p className="text-gray-600 mb-8">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
          <Link
            to="/products"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng ({getTotalItems()} sản phẩm)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              {items.map((item) => (
                <div
                  key={item.product.productId}
                  className="flex items-center gap-4 p-4 border-b last:border-b-0"
                >
                  <img
                    src={item.product.mainImage || '/placeholder.jpg'}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded"
                  />

                  <div className="flex-1">
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="font-semibold hover:text-primary-600 line-clamp-2"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-red-600 font-bold mt-1">
                      {(item.product.salePrice || item.product.price).toLocaleString('vi-VN')}₫
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.productId, item.quantity - 1)}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.productId, item.quantity + 1)}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                      disabled={item.quantity >= item.product.stockQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="font-bold text-lg">
                      {((item.product.salePrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.product.productId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-semibold">
                    {getTotalPrice().toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold">
                    {getTotalPrice() >= 5000000 ? 'Miễn phí' : '30,000₫'}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-bold">Tổng cộng:</span>
                  <span className="font-bold text-red-600">
                    {(
                      getTotalPrice() + (getTotalPrice() >= 5000000 ? 0 : 30000)
                    ).toLocaleString('vi-VN')}
                    ₫
                  </span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Tiến hành thanh toán
              </Link>

              <Link
                to="/products"
                className="block w-full text-center text-primary-600 mt-3 hover:text-primary-700"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
