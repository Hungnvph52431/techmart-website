import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  /** Danh sách composite key (productId-variantId) đang được chọn để thanh toán */
  selectedProductIds: string[];
  addItem: (product: Product, quantity?: number, selectedVariantId?: number) => void;
  removeItem: (productId: number, selectedVariantId?: number) => void;
  updateQuantity: (productId: number, quantity: number, selectedVariantId?: number) => void;
  clearCart: () => void;
  // Chọn/bỏ chọn sản phẩm (variant-aware)
  toggleSelect: (productId: number, variantId?: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  // Đã đổi tên hàm để khớp với Header.tsx
  getTotalItems: () => number;
  getTotalPrice: () => number;
  // Tổng tiền & danh sách chỉ tính theo item đã chọn
  getSelectedItems: () => CartItem[];
  getSelectedTotalPrice: () => number;
}

// Helper: tạo composite key từ productId + variantId
const getSelectionKey = (productId: number, variantId?: number): string => {
  return variantId ? `${productId}-${variantId}` : `${productId}`;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedProductIds: [],

      addItem: (product, quantity = 1, selectedVariantId) => {
        const items = get().items;
        const existingItem = items.find(
          (item) =>
            item.product.productId === product.productId &&
            item.selectedVariantId === selectedVariantId
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          const finalQuantity =
            newQuantity > product.stockQuantity ? product.stockQuantity : newQuantity;

          set({
            items: items.map((item) =>
              item.product.productId === product.productId &&
              item.selectedVariantId === selectedVariantId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        } else {
          const finalQuantity =
            quantity > product.stockQuantity ? product.stockQuantity : quantity;
          const newItems = [...items, { product, quantity: finalQuantity, selectedVariantId }];
          const selectionKey = getSelectionKey(product.productId, selectedVariantId);
          set({
            items: newItems,
            // Tự động chọn sản phẩm mới thêm (với variant key)
            selectedProductIds: [...get().selectedProductIds, selectionKey],
          });
        }
      },

      removeItem: (productId, selectedVariantId) => {
        set((state) => {
          const filtered = state.items.filter(
            (item) =>
              !(item.product.productId === productId &&
              item.selectedVariantId === selectedVariantId)
          );
          // Nếu xóa hết items của product này (tất cả variants), xóa khỏi selectedProductIds
          const hasProductLeft = filtered.some((item) => item.product.productId === productId);
          return {
            items: filtered,
            selectedProductIds: hasProductLeft
              ? state.selectedProductIds
              : state.selectedProductIds.filter((key) => {
                  // Xóa selection keys cho product này (ví dụ: "123" hoặc "123-456")
                  const keyProductId = parseInt(key.split('-')[0]);
                  return keyProductId !== productId;
                }),
          };
        });
      },

      updateQuantity: (productId, quantity, selectedVariantId) => {
        const item = get().items.find(
          (i) =>
            i.product.productId === productId &&
            i.selectedVariantId === selectedVariantId
        );
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(productId, selectedVariantId);
        } else {
          const finalQuantity =
            quantity > item.product.stockQuantity
              ? item.product.stockQuantity
              : quantity;
          set({
            items: get().items.map((item) =>
              item.product.productId === productId &&
              item.selectedVariantId === selectedVariantId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [], selectedProductIds: [] });
      },

      toggleSelect: (productId, variantId) => {
        set((state) => {
          const selectionKey = getSelectionKey(productId, variantId);
          const isSelected = state.selectedProductIds.includes(selectionKey);
          return {
            selectedProductIds: isSelected
              ? state.selectedProductIds.filter((id) => id !== selectionKey)
              : [...state.selectedProductIds, selectionKey],
          };
        });
      },

      selectAll: () => {
        const allKeys = get().items.map((item) =>
          getSelectionKey(item.product.productId, item.selectedVariantId)
        );
        set({ selectedProductIds: allKeys });
      },

      clearSelection: () => {
        set({ selectedProductIds: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const activePrice = item.product.salePrice || item.product.price;
          return total + activePrice * item.quantity;
        }, 0);
      },

      getSelectedItems: () => {
        const { items, selectedProductIds } = get();
        return items.filter((item) => {
          const selectionKey = getSelectionKey(item.product.productId, item.selectedVariantId);
          return selectedProductIds.includes(selectionKey);
        });
      },

      getSelectedTotalPrice: () => {
        const selectedItems = get().getSelectedItems();
        return selectedItems.reduce((total, item) => {
          const activePrice = item.product.salePrice || item.product.price;
          return total + activePrice * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
      // Khi load từ localStorage: nếu selectedProductIds rỗng → chọn tất cả
      onRehydrateStorage: () => (state) => {
        if (state && state.items.length > 0 && state.selectedProductIds.length === 0) {
          state.selectedProductIds = state.items.map((i) =>
            getSelectionKey(i.product.productId, i.selectedVariantId)
          );
        }
      },
    }
  )
);