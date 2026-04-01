import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useCartStore } from '@/store/cartStore';
import { useCheckoutSessionStore } from '@/store/checkoutSessionStore';
import { productService } from '@/services/product.service';
import toast from 'react-hot-toast';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CART_QUANTITY_EXCEEDED_MESSAGE,
  getCartItemStockLimit,
  getCartSelectionKey,
} from '@/features/cart/lib/cartQuantity';

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const CartPage = () => {
  const { clearDirectCheckout } = useCheckoutSessionStore();
  const {
    items,
    removeItem,
    removeSelectedItems,
    updateQuantity,
    getTotalItems,
    selectedProductIds,
    toggleSelect,
    selectAll,
    clearSelection,
    getSelectedTotalPrice,
  } = useCartStore();
  const [unavailableIds, setUnavailableIds] = useState<Set<number>>(new Set());
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const validatedRef = useRef(false);

  // Validate giỏ hàng khi vào trang — xóa SP đã bị xóa, đánh dấu SP ngừng bán
  useEffect(() => {
    if (items.length === 0 || validatedRef.current) return;
    validatedRef.current = true;
    const validate = async () => {
      try {
        const results = await productService.validateCart(items.map(i => i.product.productId));
        const bad = new Set<number>();
        let removed = 0;
        for (const r of results) {
          if (!r.available) {
            if (r.reason === 'not_found') {
              removeItem(r.productId);
              removed++;
            } else {
              bad.add(r.productId);
            }
          }
        }
        setUnavailableIds(bad);
        // Tự động bỏ chọn SP ngừng bán
        if (bad.size > 0) {
          const { selectedProductIds } = useCartStore.getState();
          // Lọc selection keys - bỏ những keys bắt đầu bằng productId ngừng bán
          const filtered = selectedProductIds.filter(key => {
            const productId = parseInt(key.split('-')[0]);
            return !bad.has(productId);
          });
          useCartStore.setState({ selectedProductIds: filtered });
        }
      } catch { /* ignore */ }
    };
    validate();
  }, []);

  useEffect(() => {
    const nextDrafts = items.reduce<Record<string, string>>((drafts, item) => {
      drafts[getCartSelectionKey(item.product.productId, item.selectedVariantId)] = String(
        item.quantity
      );
      return drafts;
    }, {});

    setQuantityDrafts(nextDrafts);
  }, [items]);

  const handleUpdateQuantity = (productId: number, newQuantity: number, stockQuantity: number, selectedVariantId?: number) => {
    if (newQuantity === 0) {
      if (window.confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng không?')) {
        removeItem(productId, selectedVariantId);
      }
    } else if (newQuantity > stockQuantity) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
    } else {
      updateQuantity(productId, newQuantity, selectedVariantId);
    }
  };

  const handleQuantityDraftChange = (
    selectionKey: string,
    rawValue: string,
    stockQuantity: number
  ) => {
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    if (rawValue !== '' && Number(rawValue) > stockQuantity) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }

    setQuantityDrafts((prev) => ({
      ...prev,
      [selectionKey]: rawValue,
    }));
  };

  const commitQuantityDraft = (
    productId: number,
    selectedVariantId: number | undefined,
    stockQuantity: number,
    currentQuantity: number
  ) => {
    const selectionKey = getCartSelectionKey(productId, selectedVariantId);
    const draftValue = quantityDrafts[selectionKey];

    if (draftValue == null || draftValue === '') {
      setQuantityDrafts((prev) => ({
        ...prev,
        [selectionKey]: String(currentQuantity),
      }));
      return;
    }

    const parsedQuantity = Number(draftValue);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setQuantityDrafts((prev) => ({
        ...prev,
        [selectionKey]: String(currentQuantity),
      }));
      return;
    }

    if (parsedQuantity > stockQuantity) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      setQuantityDrafts((prev) => ({
        ...prev,
        [selectionKey]: String(currentQuantity),
      }));
      return;
    }

    updateQuantity(productId, parsedQuantity, selectedVariantId);
  };

  const handleRemoveItem = (productId: number, selectedVariantId?: number) => {
    if (window.confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng không?')) {
      removeItem(productId, selectedVariantId);
    }
  };

  const handleRemoveSelectedItems = () => {
    if (selectedCount === 0) {
      return;
    }

    const productLabel = selectedCount === 1 ? 'sản phẩm đã chọn này' : `${selectedCount} sản phẩm đã chọn`;
    if (!window.confirm(`Bạn có muốn xóa ${productLabel} khỏi giỏ hàng không?`)) {
      return;
    }

    removeSelectedItems();
    toast.success(
      selectedCount === 1
        ? 'Đã xóa sản phẩm đã chọn khỏi giỏ hàng!'
        : `Đã xóa ${selectedCount} sản phẩm khỏi giỏ hàng!`
    );
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

  // Safety: ensure selectedProductIds are strings (migrate from old format if needed)
  const normalizedSelectedIds = selectedProductIds.map((id) =>
    typeof id === 'string' ? id : String(id)
  );

  const allSelected = normalizedSelectedIds.length === items.length && items.length > 0;
  const selectedCount = items.filter((i) =>
    normalizedSelectedIds.includes(
      getCartSelectionKey(i.product.productId, i.selectedVariantId)
    )
  ).length;
  const selectedSubtotal = getSelectedTotalPrice();
  const shippingFee = selectedSubtotal >= 5000000 ? 0 : 30000;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng ({getTotalItems()} sản phẩm)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => (allSelected ? clearSelection() : selectAll())}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Chọn tất cả ({selectedCount}/{items.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSelectedItems}
                  disabled={selectedCount === 0}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:w-auto ${
                    selectedCount === 0
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa đã chọn {selectedCount > 0 ? `(${selectedCount})` : ''}
                </button>
              </div>
              <AnimatePresence>
                {items.map((item) => {
                  const isUnavailable = unavailableIds.has(item.product.productId);
                  const selectionKey = getCartSelectionKey(
                    item.product.productId,
                    item.selectedVariantId
                  );
                  return (
                  <motion.div
                    key={selectionKey}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, padding: 0, border: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-4 p-4 border-b last:border-b-0 origin-top ${isUnavailable ? 'bg-red-50 opacity-60' : 'bg-white'}`}
                  >
                    {isUnavailable && (
                      <span className="absolute right-16 top-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Ngừng bán</span>
                    )}
                    <input
                      type="checkbox"
                      checked={normalizedSelectedIds.includes(getCartSelectionKey(item.product.productId, item.selectedVariantId))}
                      disabled={isUnavailable}
                      onChange={() => toggleSelect(item.product.productId, item.selectedVariantId)}
                      className={`h-4 w-4 rounded border-gray-300 focus:ring-primary-500 ${isUnavailable ? 'text-gray-300 cursor-not-allowed' : 'text-primary-600'}`}
                    />
                    <img
                      src={getImageUrl(item.product.mainImage)}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded shadow-sm"
                      onError={e => { const el = e.target as HTMLImageElement; el.onerror = null; el.src = '/placeholder.jpg'; }}
                    />

                    {(() => {
                      // Lấy giá & stock từ variant đã lưu sẵn trên CartItem
                      const itemPrice = item.selectedVariantPrice
                        ?? Number(item.product.salePrice || item.product.price);
                      const stockToUse = getCartItemStockLimit(item);

                      return (<>
                    <div className="flex-1">
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-semibold hover:text-primary-600 line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      {item.selectedVariantName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Phiên bản: {item.selectedVariantName}
                        </p>
                      )}
                      <p className="text-red-600 font-bold mt-1">
                        {itemPrice.toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Còn lại: {stockToUse} SP
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.productId, item.quantity - 1, stockToUse, item.selectedVariantId)}
                        disabled={isUnavailable}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quantityDrafts[selectionKey] ?? String(item.quantity)}
                        disabled={isUnavailable}
                        onChange={(event) =>
                          handleQuantityDraftChange(
                            selectionKey,
                            event.target.value,
                            stockToUse
                          )
                        }
                        onBlur={() =>
                          commitQuantityDraft(
                            item.product.productId,
                            item.selectedVariantId,
                            stockToUse,
                            item.quantity
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-sm font-semibold outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        aria-label={`Số lượng ${item.product.name}`}
                      />
                      <button
                        onClick={() => handleUpdateQuantity(item.product.productId, item.quantity + 1, stockToUse, item.selectedVariantId)}
                        disabled={isUnavailable || item.quantity >= stockToUse}
                        className={`p-1 border rounded transition-colors ${item.quantity >= stockToUse
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : isUnavailable
                              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        title={item.quantity >= stockToUse ? 'Đã đạt giới hạn kho' : ''}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="font-bold text-lg text-primary-700">
                        {(itemPrice * item.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.productId, item.selectedVariantId)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>);
                    })()}
                  </motion.div>
                  );
                })}
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

              {selectedCount === 0 ? (
                <button disabled
                  className="block w-full bg-gray-300 text-gray-500 text-center py-3 rounded-lg cursor-not-allowed">
                  Chọn sản phẩm để thanh toán
                </button>
              ) : normalizedSelectedIds.some(key => {
                const productId = parseInt(String(key).split('-')[0]);
                return unavailableIds.has(productId);
              }) ? (
                <button disabled
                  className="block w-full bg-gray-300 text-gray-500 text-center py-3 rounded-lg cursor-not-allowed">
                  Bỏ chọn sản phẩm ngừng bán để tiếp tục
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={clearDirectCheckout}
                  className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Tiến hành thanh toán
                </Link>
              )}
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
