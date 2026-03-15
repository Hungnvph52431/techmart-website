import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  // CHỐT: Sử dụng number cho productId để khớp với Database
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1) => {
        const items = get().items;
        // Sử dụng productId thay vì id để khớp với interface Product
        const existingItem = items.find((item) => item.product.productId === product.productId);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.productId === product.productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity }] });
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

      totalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      totalPrice: () => {
        return get().items.reduce(
          (total, item) => {
            // Ưu tiên sử dụng salePrice nếu có, nếu không thì dùng price gốc
            const activePrice = item.product.salePrice || item.product.price;
            return total + activePrice * item.quantity;
          },
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);