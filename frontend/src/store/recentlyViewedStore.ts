import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface RecentlyViewedState {
  products: Product[];
  addProduct: (product: Product) => void;
  clear: () => void;
}

const MAX_ITEMS = 10;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      products: [],
      addProduct: (product) =>
        set((state) => ({
          products: [
            product,
            ...state.products.filter((p) => p.productId !== product.productId),
          ].slice(0, MAX_ITEMS),
        })),
      clear: () => set({ products: [] }),
    }),
    { name: 'techmart-recently-viewed' }
  )
);
