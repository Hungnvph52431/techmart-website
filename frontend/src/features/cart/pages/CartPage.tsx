import { Layout } from '@/components/layout/Layout';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const CartPage = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    getTotalPrice,
    getTotalItems,
    selectedProductIds,
    toggleSelect,
    selectAll,
    clearSelection,
    getSelectedTotalPrice,
  } = useCartStore();

  const handleUpdateQuantity = (productId: number, newQuantity: number, stockQuantity: number) => {
    if (newQuantity === 0) {
      if (window.confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng không?')) {
        removeItem(productId);
      }
    } else if (newQuantity > stockQuantity) {
      toast.error(`Rất tiếc, sản phẩm này chỉ còn ${stockQuantity} cái trong kho.`);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: number) => {
    if (window.confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng không?')) {
      removeItem(productId);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-10">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-200 mb-6" />
            <h1 className="text-2xl font-bold mb-3 text-gray-800">Giỏ hàng đang trống</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá hàng ngàn sản phẩm tuyệt vời của chúng tôi nhé!</p>
            <Link
              to="/products"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium transition-all shadow-md hover:shadow-lg"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const allSelected = selectedProductIds.length > 0 && selectedProductIds.length === items.length;
  const selectedCount =
    selectedProductIds.length > 0
      ? items.filter((i) => selectedProductIds.includes(i.product.productId)).length
      : items.length;
  const selectedSubtotal = getSelectedTotalPrice();
  const shippingFee = selectedSubtotal >= 5000000 ? 0 : 30000;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng ({getTotalItems()} sản phẩm)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => (allSelected ? clearSelection() : selectAll())}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Chọn tất cả ({selectedCount}/{items.length})
                  </span>
                </div>
              </div>
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.product.productId}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, padding: 0, border: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-4 p-4 border-b last:border-b-0 origin-top bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedProductIds.length === 0 ||
                        selectedProductIds.includes(item.product.productId)
                      }
                      onChange={() => toggleSelect(item.product.productId)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <img
                      src={item.product.mainImage || '/placeholder.jpg'}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded shadow-sm"
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
                      <p className="text-sm text-green-600 mt-1">
                        Còn lại: {item.product.stockQuantity} SP
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.productId, item.quantity - 1, item.product.stockQuantity)}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.productId, item.quantity + 1, item.product.stockQuantity)}
                        className={`p-1 border rounded transition-colors ${item.quantity >= item.product.stockQuantity
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        title={item.quantity >= item.product.stockQuantity ? 'Đã đạt giới hạn kho' : ''}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="font-bold text-lg text-primary-700">
                        {((item.product.salePrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.productId)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({selectedCount} sản phẩm):</span>
                  <span className="font-semibold text-gray-800">
                    {selectedSubtotal.toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-gray-800">
                    {shippingFee === 0 ? 'Miễn phí' : '30.000₫'}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between text-lg">
                  <span className="font-bold text-gray-800">Tổng cộng:</span>
                  <div className="text-right">
                    <span className="font-bold text-red-600 block text-xl">
                      {(selectedSubtotal + shippingFee).toLocaleString('vi-VN')}₫
                    </span>
                    <span className="text-xs text-gray-500 font-normal mt-1">(Đã bao gồm VAT)</span>
                  </div>
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
