import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => item.product.productId === product.productId);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          const finalQuantity = newQuantity > product.stockQuantity ? product.stockQuantity : newQuantity;

          set({
            items: items.map((item) =>
              item.product.productId === product.productId
                ? { ...item, quantity: finalQuantity }
                : item
            ),
          });
        } else {
          const finalQuantity = quantity > product.stockQuantity ? product.stockQuantity : quantity;
          set({ items: [...items, { product, quantity: finalQuantity }] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          set({
            items: get().items.map((item) =>
              item.product.productId === productId ? { ...item, quantity } : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + (item.product.salePrice || item.product.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
