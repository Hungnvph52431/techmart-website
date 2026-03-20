import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  /** Danh sách productId đang được chọn để thanh toán */
  selectedProductIds: number[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  // Chọn/bỏ chọn sản phẩm
  toggleSelect: (productId: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  // Đã đổi tên hàm để khớp với Header.tsx
  getTotalItems: () => number;
  getTotalPrice: () => number;
  // Tổng tiền & danh sách chỉ tính theo item đã chọn
  getSelectedItems: () => CartItem[];
  getSelectedTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedProductIds: [],

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find(
          (item) => item.product.productId === product.productId
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          const finalQuantity =
            newQuantity > product.stockQuantity ? product.stockQuantity : newQuantity;

          set({
            items: items.map((item) =>
              item.product.productId === product.productId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        } else {
          const finalQuantity =
            quantity > product.stockQuantity ? product.stockQuantity : quantity;
          set({
            items: [...items, { product, quantity: finalQuantity }],
          });
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => item.product.productId !== productId
          ),
          selectedProductIds: state.selectedProductIds.filter(
            (id) => id !== productId
          ),
        }));
      },

      updateQuantity: (productId, quantity) => {
        const item = get().items.find(
          (i) => i.product.productId === productId
        );
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          const finalQuantity =
            quantity > item.product.stockQuantity
              ? item.product.stockQuantity
              : quantity;
          set({
            items: get().items.map((item) =>
              item.product.productId === productId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [], selectedProductIds: [] });
      },

      toggleSelect: (productId) => {
        set((state) => {
          const isSelected = state.selectedProductIds.includes(productId);
          return {
            selectedProductIds: isSelected
              ? state.selectedProductIds.filter((id) => id !== productId)
              : [...state.selectedProductIds, productId],
          };
        });
      },

      selectAll: () => {
        const allIds = get().items.map((item) => item.product.productId);
        set({ selectedProductIds: allIds });
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
        if (selectedProductIds.length === 0) return items;
        return items.filter((item) =>
          selectedProductIds.includes(item.product.productId)
        );
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
    }
  )
);